import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { approveAutomationRun, runAutomation } from "@/lib/v1/service";
import { RequestBodyError, enforceRateLimit, readJsonBody, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

const flightSchema = z.object({ action: z.literal("add_flight"), airline: z.string().trim().min(1).max(120), flightNumber: z.string().trim().min(1).max(30), departureAirport: z.string().trim().min(2).max(120), arrivalAirport: z.string().trim().min(2).max(120), departsAt: z.iso.datetime({ local: true }), arrivesAt: z.iso.datetime({ local: true }), confirmationCode: z.string().trim().max(120).optional() });
const hotelSchema = z.object({ action: z.literal("add_hotel"), hotelName: z.string().trim().min(1).max(180), address: z.string().trim().max(500).optional(), checksInAt: z.iso.datetime({ local: true }), checksOutAt: z.iso.datetime({ local: true }), confirmationCode: z.string().trim().max(120).optional() });
const transportSchema = z.object({ action: z.literal("add_transport"), type: z.string().trim().min(1).max(80), provider: z.string().trim().max(120).optional(), pickupAt: z.iso.datetime({ local: true }), pickupLocation: z.string().trim().min(1).max(300), dropoffLocation: z.string().trim().max(300).optional() });
const itinerarySchema = z.object({ action: z.literal("add_itinerary"), title: z.string().trim().min(1).max(200), kind: z.string().trim().min(1).max(80), startsAt: z.iso.datetime({ local: true }), endsAt: z.iso.datetime({ local: true }).optional().or(z.literal("")), location: z.string().trim().max(300).optional(), notes: z.string().trim().max(2000).optional() });
const reminderSchema = z.object({ action: z.literal("add_reminder"), title: z.string().trim().min(1).max(200), remindAt: z.iso.datetime({ local: true }) });
const travelDocumentSchema = z.object({ action: z.literal("link_document"), documentId: z.string().cuid(), kind: z.string().trim().min(1).max(80), expiresAt: z.iso.date().optional().or(z.literal("")) });
const vendorContactSchema = z.object({ action: z.literal("add_contact"), name: z.string().trim().min(1).max(120), email: z.email().optional().or(z.literal("")), phone: z.string().trim().max(60).optional(), role: z.string().trim().max(120).optional() });
const quoteSchema = z.object({ action: z.literal("add_quote"), title: z.string().trim().min(1).max(200), amount: z.coerce.number().nonnegative().optional(), currency: z.string().trim().length(3).default("USD"), validUntil: z.iso.date().optional().or(z.literal("")), notes: z.string().trim().max(2000).optional() });
const paymentSchema = z.object({ action: z.literal("add_payment"), description: z.string().trim().min(1).max(240), amount: z.coerce.number().nonnegative(), currency: z.string().trim().length(3).default("USD"), dueAt: z.iso.date().optional().or(z.literal("")) });
const contractSchema = z.object({ action: z.literal("add_contract"), title: z.string().trim().min(1).max(240), documentId: z.string().cuid().optional().or(z.literal("")), startsAt: z.iso.date().optional().or(z.literal("")), endsAt: z.iso.date().optional().or(z.literal("")), renewalAt: z.iso.date().optional().or(z.literal("")), notes: z.string().trim().max(2000).optional() });
const guestSchema = z.object({ action: z.literal("add_guest"), name: z.string().trim().min(1).max(120), email: z.email().optional().or(z.literal("")), rsvp: z.enum(["pending", "accepted", "declined", "tentative"]).default("pending"), plusOnes: z.coerce.number().int().min(0).max(20).default(0) });
const scheduleSchema = z.object({ action: z.literal("add_schedule"), title: z.string().trim().min(1).max(200), startsAt: z.iso.datetime({ local: true }), endsAt: z.iso.datetime({ local: true }).optional().or(z.literal("")), location: z.string().trim().max(300).optional(), owner: z.string().trim().max(120).optional() });
const eventVendorSchema = z.object({ action: z.literal("add_event_vendor"), vendorId: z.string().cuid(), purpose: z.string().trim().min(1).max(180), amount: z.coerce.number().nonnegative().optional() });
const logisticsSchema = z.object({ action: z.literal("set_logistics"), cateringNotes: z.string().trim().max(3000).optional(), accommodationNotes: z.string().trim().max(3000).optional(), travelPlanId: z.string().cuid().optional().or(z.literal("")) });
const invitationsSchema = z.object({ action: z.literal("prepare_invitations") });
const receiptSchema = z.object({ action: z.literal("link_receipt"), documentId: z.string().cuid() });
const automationSchema = z.object({ action: z.enum(["run", "approve"]), runId: z.string().cuid().optional() });
const expenseStatusSchema = z.object({ action: z.literal("set_status"), status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "REIMBURSED"]) });

const schemas = [flightSchema, hotelSchema, transportSchema, itinerarySchema, reminderSchema, travelDocumentSchema, vendorContactSchema, quoteSchema, paymentSchema, contractSchema, guestSchema, scheduleSchema, eventVendorSchema, logisticsSchema, invitationsSchema, receiptSchema, automationSchema, expenseStatusSchema];

export async function POST(request: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`v1:detail:${context.user.id}`, 100, 5 * 60_000);
  if (limited) return limited;
  const { resource, id } = await params;
  try {
    const raw = await readJsonBody(request, 30_000);
    const parsed = schemas.map((schema) => schema.safeParse(raw)).find((result) => result.success);
    if (!parsed?.success) return NextResponse.json({ error: "Invalid action details" }, { status: 400 });
    const data = parsed.data;
    let record: { id: string } | null = null;

    if (resource === "travel" && ["add_flight", "add_hotel", "add_transport", "add_itinerary", "add_reminder", "link_document"].includes(data.action)) {
      const parent = await prisma.travelPlan.findFirst({ where: { id, organizationId: context.organization.id }, select: { id: true } });
      if (!parent) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      if (data.action === "add_flight") record = await prisma.flight.create({ data: { travelPlanId: id, airline: data.airline, flightNumber: data.flightNumber, departureAirport: data.departureAirport, arrivalAirport: data.arrivalAirport, departsAt: new Date(data.departsAt), arrivesAt: new Date(data.arrivesAt), confirmationCode: data.confirmationCode || null } });
      if (data.action === "add_hotel") record = await prisma.hotelStay.create({ data: { travelPlanId: id, hotelName: data.hotelName, address: data.address || null, checksInAt: new Date(data.checksInAt), checksOutAt: new Date(data.checksOutAt), confirmationCode: data.confirmationCode || null } });
      if (data.action === "add_transport") record = await prisma.groundTransport.create({ data: { travelPlanId: id, type: data.type, provider: data.provider || null, pickupAt: new Date(data.pickupAt), pickupLocation: data.pickupLocation, dropoffLocation: data.dropoffLocation || null } });
      if (data.action === "add_itinerary") record = await prisma.travelItineraryItem.create({ data: { travelPlanId: id, title: data.title, kind: data.kind, startsAt: new Date(data.startsAt), endsAt: data.endsAt ? new Date(data.endsAt) : null, location: data.location || null, notes: data.notes || null } });
      if (data.action === "add_reminder") record = await prisma.travelReminder.create({ data: { travelPlanId: id, title: data.title, remindAt: new Date(data.remindAt) } });
      if (data.action === "link_document") {
        const document = await prisma.document.findFirst({ where: { id: data.documentId, organizationId: context.organization.id }, select: { id: true } });
        if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
        record = await prisma.travelDocument.create({ data: { travelPlanId: id, documentId: document.id, kind: data.kind, expiresAt: data.expiresAt ? new Date(`${data.expiresAt}T12:00:00.000Z`) : null } });
      }
    } else if (resource === "vendors" && ["add_contact", "add_quote", "add_payment", "add_contract"].includes(data.action)) {
      const parent = await prisma.vendor.findFirst({ where: { id, organizationId: context.organization.id }, select: { id: true } });
      if (!parent) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      if (data.action === "add_contact") record = await prisma.vendorContact.create({ data: { vendorId: id, name: data.name, email: data.email || null, phone: data.phone || null, role: data.role || null } });
      if (data.action === "add_quote") record = await prisma.vendorQuote.create({ data: { vendorId: id, title: data.title, amountMinor: data.amount === undefined ? null : Math.round(data.amount * 100), currency: data.currency.toUpperCase(), validUntil: data.validUntil ? new Date(`${data.validUntil}T12:00:00.000Z`) : null, notes: data.notes || null } });
      if (data.action === "add_payment") record = await prisma.vendorPayment.create({ data: { vendorId: id, description: data.description, amountMinor: Math.round(data.amount * 100), currency: data.currency.toUpperCase(), dueAt: data.dueAt ? new Date(`${data.dueAt}T12:00:00.000Z`) : null } });
      if (data.action === "add_contract") {
        const document = data.documentId ? await prisma.document.findFirst({ where: { id: data.documentId, organizationId: context.organization.id }, select: { id: true } }) : null;
        record = await prisma.vendorContract.create({ data: { vendorId: id, documentId: document?.id, title: data.title, startsAt: data.startsAt ? new Date(`${data.startsAt}T12:00:00.000Z`) : null, endsAt: data.endsAt ? new Date(`${data.endsAt}T12:00:00.000Z`) : null, renewalAt: data.renewalAt ? new Date(`${data.renewalAt}T12:00:00.000Z`) : null, notes: data.notes || null } });
      }
    } else if (resource === "events" && ["add_guest", "add_schedule", "add_event_vendor", "set_logistics", "prepare_invitations"].includes(data.action)) {
      const parent = await prisma.eventPlan.findFirst({ where: { id, organizationId: context.organization.id }, select: { id: true } });
      if (!parent) return NextResponse.json({ error: "Event not found" }, { status: 404 });
      if (data.action === "add_guest") record = await prisma.eventGuest.create({ data: { eventId: id, name: data.name, email: data.email || null, rsvp: data.rsvp, plusOnes: data.plusOnes } });
      if (data.action === "add_schedule") record = await prisma.eventScheduleItem.create({ data: { eventId: id, title: data.title, startsAt: new Date(data.startsAt), endsAt: data.endsAt ? new Date(data.endsAt) : null, location: data.location || null, owner: data.owner || null } });
      if (data.action === "add_event_vendor") {
        const vendor = await prisma.vendor.findFirst({ where: { id: data.vendorId, organizationId: context.organization.id }, select: { id: true } });
        if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
        record = await prisma.eventVendor.create({ data: { eventId: id, vendorId: vendor.id, purpose: data.purpose, amountMinor: data.amount === undefined ? null : Math.round(data.amount * 100) } });
      }
      if (data.action === "set_logistics") {
        const travel = data.travelPlanId ? await prisma.travelPlan.findFirst({ where: { id: data.travelPlanId, organizationId: context.organization.id }, select: { id: true } }) : null;
        record = await prisma.eventPlan.update({ where: { id }, data: { cateringNotes: data.cateringNotes || null, accommodationNotes: data.accommodationNotes || null, travelPlanId: travel?.id } });
      }
      if (data.action === "prepare_invitations") {
        const event = await prisma.eventPlan.findFirst({ where: { id, organizationId: context.organization.id }, include: { guests: true } });
        if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
        const mailbox = await prisma.mailboxConnection.findFirst({ where: { organizationId: context.organization.id, userId: context.user.id, status: "ACTIVE" } });
        const guests = event.guests.filter((guest) => guest.email && !guest.invitedAt);
        await prisma.$transaction(guests.map((guest) => prisma.outboundEmail.create({ data: { organizationId: context.organization.id, mailboxConnectionId: mailbox?.id, createdById: context.user.id, toEmail: guest.email!, toName: guest.name, fromName: context.user.name, subject: `Invitation: ${event.title}`, bodyText: `Hello ${guest.name},\n\nYou are invited to ${event.title} on ${event.startsAt.toLocaleString("en", { timeZone: event.timezone })}${event.venue ? ` at ${event.venue}` : ""}.\n\nPlease reply with your availability and any requirements.\n\nKind regards,\n${context.user.name}`, status: "DRAFT" } })));
        await prisma.eventGuest.updateMany({ where: { eventId: id, id: { in: guests.map((guest) => guest.id) } }, data: { invitedAt: new Date() } });
        record = { id };
      }
    } else if (resource === "automations" && (data.action === "run" || data.action === "approve")) {
      record = data.action === "run" ? await runAutomation(context.organization.id, context.user.id, id) : data.runId ? await approveAutomationRun(context.organization.id, context.user.id, data.runId) : null;
    } else if (resource === "expenses" && data.action === "set_status") {
      const result = await prisma.expense.updateMany({ where: { id, organizationId: context.organization.id }, data: { status: data.status } });
      record = result.count ? { id } : null;
    } else if (resource === "expenses" && data.action === "link_receipt") {
      const document = await prisma.document.findFirst({ where: { id: data.documentId, organizationId: context.organization.id }, select: { id: true, extractedText: true } });
      if (document) {
        const result = await prisma.expense.updateMany({ where: { id, organizationId: context.organization.id }, data: { receiptId: document.id, extractedJson: JSON.stringify(extractReceiptFields(document.extractedText || "")) } });
        record = result.count ? { id } : null;
      }
    }
    if (!record) return NextResponse.json({ error: "Unsupported action or record not found" }, { status: 404 });
    await prisma.activityLog.create({ data: { organizationId: context.organization.id, actorUserId: context.user.id, actorType: "user", action: `${resource}.${data.action}`, entityType: resource, entityId: id, source: resource } });
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Invalid details" }, { status: 400 });
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to save these details" }, { status: 500 });
  }
}

function extractReceiptFields(text: string) {
  const amount = text.match(/(?:total|amount)\s*[:$]?\s*([0-9]+(?:[.,][0-9]{2})?)/i)?.[1];
  const date = text.match(/\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]20\d{2})\b/)?.[1];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return { vendorCandidate: lines[0]?.slice(0, 180) || null, amountCandidate: amount ? Number(amount.replace(",", ".")) : null, dateCandidate: date || null, extractedAt: new Date().toISOString(), requiresReview: true };
}
