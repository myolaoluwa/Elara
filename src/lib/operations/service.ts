import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { dueDateFromInput } from "@/lib/tasks/schemas";
import { operationSchemas, type OperationResource } from "./schemas";

type UnknownRecord = Record<string, unknown>;

export async function createOperationRecord(resource: OperationResource, organizationId: string, actorUserId: string, raw: unknown) {
  const input = operationSchemas[resource].parse(raw) as UnknownRecord;
  return prisma.$transaction(async (transaction) => {
    let record: UnknownRecord;

    switch (resource) {
      case "contacts": {
        const companyName = input.companyName as string | undefined;
        const company = companyName ? await transaction.company.upsert({
          where: { id: (await transaction.company.findFirst({ where: { organizationId, name: companyName } }))?.id ?? "missing" },
          update: {},
          create: { organizationId, name: companyName },
        }) : null;
        record = await transaction.contact.create({ data: {
          organizationId,
          name: input.name as string,
          email: (input.email as string) || null,
          role: input.role as string | null,
          relationship: input.relationship as string | null,
          notes: input.notes as string | null,
          companyId: company?.id,
        }, include: { company: true } });
        break;
      }
      case "calendar": {
        const startsAt = new Date(input.startsAt as string);
        const endsAt = new Date(input.endsAt as string);
        const conflict = await transaction.calendarEvent.findFirst({
          where: { organizationId, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
          select: { id: true, title: true },
        });
        record = await transaction.calendarEvent.create({ data: {
          organizationId,
          title: input.title as string,
          startsAt,
          endsAt,
          timezone: input.timezone as string,
          location: input.location as string | null,
          provider: "manual",
        } });
        if (conflict) {
          await transaction.notification.create({ data: { organizationId, title: "Scheduling conflict", body: `${input.title as string} overlaps with ${conflict.title}.`, priority: "HIGH", sourceType: "calendar-event", sourceId: String(record.id) } });
          record = { ...record, conflict: { id: conflict.id, title: conflict.title } };
        }
        break;
      }
      case "meetings": {
        const attendees = String(input.attendees || "").split(",").map((item) => item.trim()).filter(Boolean);
        const meeting = await transaction.meeting.create({ data: {
          organizationId,
          title: input.title as string,
          startsAt: new Date(input.startsAt as string),
          endsAt: new Date(input.endsAt as string),
          location: input.location as string | null,
          agenda: input.agenda as string | null,
          attendees: { create: attendees.map((name) => ({ name })) },
        }, include: { attendees: true } });
        await transaction.calendarEvent.create({ data: {
          organizationId,
          meetingId: meeting.id,
          title: meeting.title,
          startsAt: meeting.startsAt,
          endsAt: meeting.endsAt,
          timezone: "UTC",
          location: meeting.location,
          provider: "manual",
        } });
        record = meeting;
        break;
      }
      case "follow-ups": {
        const contact = input.contactName ? await transaction.contact.findFirst({ where: { organizationId, name: input.contactName as string } }) : null;
        record = await transaction.followUp.create({ data: {
          organizationId,
          title: input.title as string,
          notes: input.notes as string | null,
          dueAt: dueDateFromInput(input.dueAt as string | undefined),
          contactId: contact?.id,
          sourceType: "manual",
        }, include: { contact: true } });
        break;
      }
      case "inbox":
        record = await transaction.email.create({ data: {
          organizationId,
          provider: "manual-import",
          externalId: randomUUID(),
          subject: input.subject as string,
          sender: input.sender as string,
          recipientsJson: "[]",
          bodyText: input.bodyText as string,
          receivedAt: new Date(input.receivedAt as string),
          isImportant: input.isImportant as boolean,
        } });
        break;
      case "projects":
        record = await transaction.project.create({ data: {
          organizationId,
          name: input.name as string,
          description: input.description as string | null,
          status: input.status as string,
        } });
        break;
      case "decisions":
        record = await transaction.decision.create({ data: {
          organizationId,
          title: input.title as string,
          rationale: input.rationale as string | null,
          decidedAt: dueDateFromInput(input.decidedAt as string)!,
          confirmed: input.confirmed as boolean,
          sourceType: "manual",
        } });
        break;
      case "commitments": {
        const contact = input.contactName ? await transaction.contact.findFirst({ where: { organizationId, name: input.contactName as string } }) : null;
        record = await transaction.commitment.create({ data: {
          organizationId,
          description: input.description as string,
          dueAt: dueDateFromInput(input.dueAt as string | undefined),
          contactId: contact?.id,
          confirmed: input.confirmed as boolean,
        } });
        break;
      }
    }

    await transaction.activityLog.create({ data: {
      organizationId,
      actorUserId,
      actorType: "user",
      action: `${resource}.created`,
      entityType: resource,
      entityId: String(record.id),
      source: resource,
    } });
    return record;
  });
}

export async function resolveFollowUp(organizationId: string, actorUserId: string, id: string) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.followUp.findFirst({ where: { id, organizationId } });
    if (!existing) return null;
    const record = await transaction.followUp.update({ where: { id }, data: { status: "RESOLVED" } });
    await transaction.activityLog.create({ data: { organizationId, actorUserId, actorType: "user", action: "follow-ups.resolved", entityType: "follow-up", entityId: id, source: "follow-ups" } });
    return record;
  });
}
