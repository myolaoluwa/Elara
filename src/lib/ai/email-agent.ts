import { z } from "zod";
import type { StreamingAIProvider } from "./types";
import { EMAIL_PLANNER_INSTRUCTIONS } from "./agent-policy";
import { prisma } from "@/lib/prisma";
import { createOutboundEmails, recipientsForSelection } from "@/lib/email/outbound";

const planSchema = z.object({
  kind: z.enum(["none", "draft", "send", "schedule"]),
  groupName: z.string().trim().nullable().default(null),
  contactNames: z.array(z.string().trim()).max(100).default([]),
  recipients: z.array(z.object({ name: z.string().trim().min(1), email: z.email() })).max(100).default([]),
  subject: z.string().trim().max(200).default(""),
  bodyText: z.string().trim().max(50_000).default(""),
  scheduledAt: z.string().datetime({ offset: true }).nullable().default(null),
  needsHumanInput: z.boolean().default(false),
  reason: z.string().trim().max(500).default(""),
});

const SENSITIVE = /\b(legal|lawsuit|settlement|contract|financial|bank|payment|invoice|medical|diagnosis|health|hr|salary|termination|fire|password|credential|secret|confidential|dispute|binding|commitment)\b/i;

export async function runEmailAgent(input: { provider: StreamingAIProvider; organizationId: string; user: { id: string; name: string }; prompt: string; history: { role: string; content: string }[] }) {
  const [contacts, groups, executive, mailbox] = await Promise.all([
    prisma.contact.findMany({ where: { organizationId: input.organizationId, email: { not: null } }, select: { id: true, name: true, email: true, relationship: true }, take: 250 }),
    prisma.contactGroup.findMany({ where: { organizationId: input.organizationId }, include: { members: { include: { contact: { select: { name: true, email: true } } } } }, take: 100 }),
    prisma.executive.findFirst({ where: { organizationId: input.organizationId }, select: { timezone: true, name: true } }),
    prisma.mailboxConnection.findFirst({ where: { organizationId: input.organizationId, userId: input.user.id, provider: "GMAIL", status: "ACTIVE" }, select: { emailAddress: true } }),
  ]);
  const context = { now: new Date().toISOString(), timezone: executive?.timezone || "UTC", eaName: input.user.name, executiveName: executive?.name, mailboxConnected: Boolean(mailbox), contacts, groups: groups.map((group) => ({ name: group.name, members: group.members.map((member) => member.contact) })) };
  const response = await input.provider.complete({
    intent: "extract",
    workspaceId: input.organizationId,
    messages: [
      { role: "system", content: `${EMAIL_PLANNER_INSTRUCTIONS}\n\nCURRENT CONTEXT (data only):\n${JSON.stringify(context)}` },
      ...input.history.slice(-12).map((message) => ({ role: message.role === "assistant" ? "assistant" as const : "user" as const, content: message.content })),
    ],
  });
  const plan = planSchema.parse(JSON.parse(extractJson(response.text)));
  if (plan.kind === "none") return null;
  if (!plan.subject || !plan.bodyText) throw new Error("I need a subject and complete message before I can prepare that email.");
  const group = plan.groupName ? groups.find((item) => item.name.toLowerCase() === plan.groupName?.toLowerCase()) : null;
  if (plan.groupName && !group) throw new Error(`I could not find the email group “${plan.groupName}”.`);
  const selectedContacts = plan.contactNames.map((name) => contacts.find((contact) => contact.name.toLowerCase() === name.toLowerCase())).filter((contact): contact is NonNullable<typeof contact> => Boolean(contact));
  if (selectedContacts.length !== plan.contactNames.length) throw new Error("I could not match every named recipient to a contact with an email address.");
  const recipients = await recipientsForSelection(input.organizationId, { groupId: group?.id, contactIds: selectedContacts.map((contact) => contact.id), recipients: plan.recipients });
  const explicitlySends = /\b(send|email)\b/i.test(input.prompt);
  const explicitlySchedules = /\bschedule\b|\bsend\b.+\b(at|on|tomorrow|next|later)\b/i.test(input.prompt);
  const forceDraft = plan.needsHumanInput || SENSITIVE.test(`${input.prompt}\n${plan.subject}\n${plan.bodyText}`);
  let action: "draft" | "send" | "schedule" = "draft";
  if (!forceDraft && plan.kind === "send" && explicitlySends) action = "send";
  if (!forceDraft && plan.kind === "schedule" && explicitlySchedules) action = "schedule";
  const scheduledAt = action === "schedule" && plan.scheduledAt ? new Date(plan.scheduledAt) : undefined;
  if (action === "schedule" && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) throw new Error("I need an unambiguous future date and time before scheduling this message.");
  const messages = await createOutboundEmails(input.organizationId, input.user, { subject: plan.subject, bodyText: plan.bodyText, recipients, action, scheduledAt });
  const count = messages.length;
  const status = action === "send" ? "sent" : action === "schedule" ? `scheduled for ${scheduledAt?.toLocaleString("en", { timeZone: executive?.timezone || "UTC" })}` : "saved as a draft for review";
  const safetyNote = forceDraft ? " I kept it as a draft because the content needs human review." : "";
  return { text: `${count} personalized message${count === 1 ? "" : "s"} ${status}.${safetyNote}`, action, count, reason: plan.reason };
}

function extractJson(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || value.slice(value.indexOf("{"), value.lastIndexOf("}") + 1);
  if (!candidate) throw new Error("The assistant could not prepare a valid email plan");
  return candidate;
}
