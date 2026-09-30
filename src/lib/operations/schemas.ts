import { z } from "zod";

const optionalText = (max = 1000) => z.string().trim().max(max).optional().nullable();

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().optional().or(z.literal("")),
  role: optionalText(120),
  companyName: optionalText(160),
  relationship: optionalText(160),
  notes: optionalText(3000),
});

export const calendarEventSchema = z.object({
  title: z.string().trim().min(1).max(180),
  startsAt: z.iso.datetime({ local: true }),
  endsAt: z.iso.datetime({ local: true }),
  timezone: z.string().trim().min(1).max(80).default("UTC"),
  location: optionalText(300),
}).refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
  message: "End time must be after start time",
  path: ["endsAt"],
});

export const meetingSchema = z.object({
  title: z.string().trim().min(1).max(180),
  startsAt: z.iso.datetime({ local: true }),
  endsAt: z.iso.datetime({ local: true }),
  location: optionalText(300),
  agenda: optionalText(5000),
  attendees: optionalText(2000),
}).refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
  message: "End time must be after start time",
  path: ["endsAt"],
});

export const followUpSchema = z.object({
  title: z.string().trim().min(1).max(180),
  dueAt: z.iso.date().optional().or(z.literal("")),
  contactName: optionalText(120),
  notes: optionalText(3000),
});

export const emailSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  sender: z.string().trim().min(1).max(240),
  receivedAt: z.iso.datetime({ local: true }),
  bodyText: z.string().trim().min(1).max(100_000),
  isImportant: z.boolean().default(false),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(180),
  description: optionalText(5000),
  status: z.enum(["active", "on_hold", "complete"]).default("active"),
});

export const decisionSchema = z.object({
  title: z.string().trim().min(1).max(300),
  rationale: optionalText(5000),
  decidedAt: z.iso.date(),
  confirmed: z.boolean().default(true),
});

export const commitmentSchema = z.object({
  description: z.string().trim().min(1).max(500),
  dueAt: z.iso.date().optional().or(z.literal("")),
  contactName: optionalText(120),
  confirmed: z.boolean().default(true),
});

export const operationSchemas = {
  contacts: contactSchema,
  calendar: calendarEventSchema,
  meetings: meetingSchema,
  "follow-ups": followUpSchema,
  inbox: emailSchema,
  projects: projectSchema,
  decisions: decisionSchema,
  commitments: commitmentSchema,
} as const;

export type OperationResource = keyof typeof operationSchemas;
