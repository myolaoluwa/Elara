import { z } from "zod";

const text = (max = 3000) => z.string().trim().max(max).optional().nullable();
const optionalDateTime = z.iso.datetime({ local: true, offset: true }).optional().or(z.literal(""));
const money = z.coerce.number().finite().nonnegative().max(100_000_000);

export const researchSchema = z.object({
  topic: z.string().trim().min(2).max(240),
  subjectType: z.enum(["company", "person", "event", "vendor", "product", "industry", "competitor", "destination", "other"]),
  question: text(2000),
});

export const briefingSchema = z.object({
  type: z.enum(["DAILY", "MEETING", "TRAVEL", "WEEKLY", "CUSTOM"]),
  title: z.string().trim().min(2).max(240),
  periodStart: optionalDateTime,
  periodEnd: optionalDateTime,
  focus: text(2000),
});

export const travelSchema = z.object({
  title: z.string().trim().min(2).max(180),
  destination: z.string().trim().min(2).max(180),
  startsAt: z.iso.datetime({ local: true, offset: true }),
  endsAt: z.iso.datetime({ local: true, offset: true }),
  timezone: z.string().trim().min(1).max(80).default("UTC"),
  purpose: text(1000),
  notes: text(5000),
}).refine((value) => new Date(value.endsAt) > new Date(value.startsAt), { message: "Trip end must be after its start", path: ["endsAt"] });

export const expenseSchema = z.object({
  description: z.string().trim().min(2).max(300),
  category: z.string().trim().min(2).max(100),
  amount: money,
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  incurredAt: z.iso.date(),
  reimbursable: z.boolean().default(true),
});

export const expenseReportSchema = z.object({
  title: z.string().trim().min(2).max(240),
  periodStart: z.iso.date().optional().or(z.literal("")),
  periodEnd: z.iso.date().optional().or(z.literal("")),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("USD"),
  notes: text(3000),
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(120),
  description: text(500),
  amount: money,
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("USD"),
  issuedAt: z.iso.date().optional().or(z.literal("")),
  dueAt: z.iso.date().optional().or(z.literal("")),
});

export const vendorSchema = z.object({
  name: z.string().trim().min(2).max(180),
  category: text(100),
  email: z.email().optional().or(z.literal("")),
  phone: text(60),
  website: z.url().optional().or(z.literal("")),
  renewalAt: z.iso.date().optional().or(z.literal("")),
  notes: text(5000),
});

export const eventSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: text(3000),
  venue: text(300),
  startsAt: z.iso.datetime({ local: true, offset: true }),
  endsAt: z.iso.datetime({ local: true, offset: true }),
  timezone: z.string().trim().min(1).max(80).default("UTC"),
  budget: money.optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("USD"),
}).refine((value) => new Date(value.endsAt) > new Date(value.startsAt), { message: "Event end must be after its start", path: ["endsAt"] });

export const automationSchema = z.object({
  name: z.string().trim().min(2).max(180),
  description: text(1000),
  trigger: z.enum(["manual", "meeting.completed", "email.received", "task.overdue", "calendar.upcoming"]),
  action: z.enum(["create_task", "create_follow_up", "create_notification"]),
  actionTitle: z.string().trim().min(2).max(300),
  requiresApproval: z.boolean().default(true),
});

export const v1Schemas = {
  research: researchSchema,
  briefings: briefingSchema,
  travel: travelSchema,
  expenses: expenseSchema,
  "expense-reports": expenseReportSchema,
  invoices: invoiceSchema,
  vendors: vendorSchema,
  events: eventSchema,
  automations: automationSchema,
} as const;

export type V1Resource = keyof typeof v1Schemas;
