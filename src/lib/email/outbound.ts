import { prisma } from "@/lib/prisma";
import { createGmailDraft, sendGmailMessage } from "./google";
import { personalizeEmail, validateEmail } from "./personalization";

export type RecipientInput = { name: string; email: string; contactId?: string; groupId?: string };
export type ComposeEmailInput = {
  subject: string;
  bodyText: string;
  recipients: RecipientInput[];
  action: "draft" | "send" | "schedule";
  scheduledAt?: Date;
  threadId?: string;
};

export async function recipientsForSelection(organizationId: string, selection: { groupId?: string; contactIds?: string[]; recipients?: { name: string; email: string }[] }) {
  const recipients: RecipientInput[] = [];
  if (selection.groupId) {
    const group = await prisma.contactGroup.findFirst({ where: { id: selection.groupId, organizationId }, include: { members: { include: { contact: true } } } });
    if (!group) throw new Error("Contact group not found");
    for (const member of group.members) if (member.contact.email) recipients.push({ name: member.contact.name, email: member.contact.email, contactId: member.contact.id, groupId: group.id });
  }
  if (selection.contactIds?.length) {
    const contacts = await prisma.contact.findMany({ where: { id: { in: selection.contactIds }, organizationId, email: { not: null } } });
    for (const contact of contacts) if (contact.email) recipients.push({ name: contact.name, email: contact.email, contactId: contact.id });
  }
  for (const recipient of selection.recipients || []) recipients.push({ name: recipient.name, email: recipient.email });
  const unique = new Map<string, RecipientInput>();
  for (const recipient of recipients) unique.set(validateEmail(recipient.email), { ...recipient, email: validateEmail(recipient.email) });
  if (!unique.size) throw new Error("At least one recipient with an email address is required");
  if (unique.size > 100) throw new Error("A single send is limited to 100 recipients");
  return [...unique.values()];
}

export async function createOutboundEmails(organizationId: string, user: { id: string; name: string }, input: ComposeEmailInput) {
  if (input.action === "schedule" && (!input.scheduledAt || input.scheduledAt.getTime() <= Date.now() + 30_000)) throw new Error("Scheduled time must be in the future");
  const mailbox = await prisma.mailboxConnection.findFirst({ where: { organizationId, userId: user.id, provider: "GMAIL", status: "ACTIVE" } });
  if (input.action !== "draft" && !mailbox) throw new Error("Connect Gmail before sending or scheduling email");
  const prepared = input.recipients.map((recipient) => ({ recipient, message: personalizeEmail({ toEmail: recipient.email, toName: recipient.name, subject: input.subject, bodyText: input.bodyText, fromName: user.name }) }));
  const status = input.action === "schedule" ? "SCHEDULED" : "DRAFT";
  const rows = await prisma.$transaction(async (transaction) => {
    const created = [];
    for (const item of prepared) {
      created.push(await transaction.outboundEmail.create({ data: {
        organizationId,
        mailboxConnectionId: mailbox?.id,
        createdById: user.id,
        contactId: item.recipient.contactId,
        groupId: item.recipient.groupId,
        toEmail: item.message.toEmail,
        toName: item.message.toName,
        fromName: item.message.fromName,
        subject: item.message.subject,
        bodyText: item.message.bodyText,
        status,
        scheduledAt: input.action === "schedule" ? input.scheduledAt : null,
        threadId: input.threadId,
      } }));
    }
    await transaction.activityLog.create({ data: {
      organizationId,
      actorUserId: user.id,
      actorType: "user",
      action: input.action === "send" ? "email.send.requested" : input.action === "schedule" ? "email.scheduled" : "email.drafted",
      entityType: "outbound-email",
      source: "email-agent",
      resultJson: JSON.stringify({ count: created.length, scheduledAt: input.scheduledAt?.toISOString() }),
      approvalStatus: input.action === "draft" ? "PENDING" : "APPROVED",
    } });
    return created;
  });
  if (input.action === "send") return Promise.all(rows.map((row) => dispatchOutboundEmail(row.id, organizationId)));
  if (input.action === "draft" && mailbox) {
    return Promise.all(rows.map(async (row) => {
      try {
        const draft = await createGmailDraft(mailbox.id, row);
        return prisma.outboundEmail.update({ where: { id: row.id }, data: { providerDraftId: draft.id, threadId: draft.message.threadId } });
      } catch {
        return row;
      }
    }));
  }
  return rows;
}

export async function dispatchOutboundEmail(id: string, organizationId?: string) {
  const where = organizationId ? { id, organizationId } : { id };
  const email = await prisma.outboundEmail.findFirst({ where });
  if (!email) throw new Error("Outbound email not found");
  if (!email.mailboxConnectionId) throw new Error("No mailbox is connected for this email");
  const claimed = await prisma.outboundEmail.updateMany({ where: { id: email.id, status: { in: ["DRAFT", "SCHEDULED"] } }, data: { status: "SENDING", lastError: null } });
  if (claimed.count !== 1) throw new Error("Email has already been dispatched or cancelled");
  try {
    const sent = await sendGmailMessage(email.mailboxConnectionId, email);
    const updated = await prisma.outboundEmail.update({ where: { id: email.id }, data: { status: "SENT", sentAt: new Date(), externalId: sent.id, threadId: sent.threadId } });
    await prisma.activityLog.create({ data: { organizationId: email.organizationId, actorUserId: email.createdById, actorType: "ai", action: "email.sent", entityType: "outbound-email", entityId: email.id, source: "email-agent", approvalStatus: "APPROVED", resultJson: JSON.stringify({ recipient: email.toEmail }) } });
    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Email delivery failed";
    await prisma.outboundEmail.update({ where: { id: email.id }, data: { status: "FAILED", lastError: message } });
    throw error;
  }
}

export async function dispatchDueEmails(now = new Date(), limit = 50) {
  const due = await prisma.outboundEmail.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: now } }, orderBy: { scheduledAt: "asc" }, take: limit, select: { id: true } });
  const results = [];
  for (const item of due) {
    try {
      await dispatchOutboundEmail(item.id);
      results.push({ id: item.id, status: "sent" as const });
    } catch (error) {
      results.push({ id: item.id, status: "failed" as const, error: error instanceof Error ? error.message : "Unknown failure" });
    }
  }
  return results;
}
