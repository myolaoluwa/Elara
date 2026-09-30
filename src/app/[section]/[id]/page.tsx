import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { V1RecordDetail, type DetailSection } from "@/components/v1-record-detail";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";

const supported = new Set(["research", "briefings", "travel", "expenses", "vendors", "events", "automations"]);

export default async function V1DetailPage({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  if (!supported.has(section)) notFound();
  const context = await requireWorkspaceContext();
  const view = await buildView(section, id, context.organization.id);
  if (!view) notFound();
  return <AppShell workspaceName={context.organization.name} userName={context.user.name}>
    <Link className="back-link" href={`/${section}`}><ArrowLeft size={14} />Back to {section}</Link>
    <div className="page-heading compact-heading"><div><p className="eyebrow">{view.eyebrow}</p><h1>{view.title}</h1><p className="page-subtitle">{view.subtitle}</p></div></div>
    <V1RecordDetail resource={section} id={id} sections={view.sections} automationRunId={view.automationRunId} expenseStatus={view.expenseStatus} />
  </AppShell>;
}

async function buildView(section: string, id: string, organizationId: string): Promise<{ eyebrow: string; title: string; subtitle: string; sections: DetailSection[]; automationRunId?: string | null; expenseStatus?: string } | null> {
  if (section === "research") {
    const record = await prisma.researchReport.findFirst({ where: { id, organizationId } });
    if (!record) return null;
    const findings = jsonArray<string>(record.findingsJson);
    const sources = jsonArray<{ title: string; url: string; excerpt: string }>(record.sourcesJson);
    return { eyebrow: `${record.subjectType} research · ${record.status.toLowerCase()}`, title: record.topic, subtitle: record.question || "Executive research report", sections: [
      { title: "Executive summary", items: [{ id: "summary", title: "Report", detail: record.summary || "This research request is waiting for configured external sources." }], empty: "No summary yet." },
      { title: "Findings", items: findings.map((item, index) => ({ id: String(index), title: item })), empty: "No sourced findings yet." },
      { title: "Sources", items: sources.map((item, index) => ({ id: String(index), title: item.title, detail: item.excerpt, href: item.url, meta: safeHostname(item.url) })), empty: "No external sources are attached. Configure TAVILY_API_KEY and create a new report." },
    ] };
  }
  if (section === "briefings") {
    const record = await prisma.briefing.findFirst({ where: { id, organizationId } });
    if (!record) return null;
    const content = jsonObject(record.contentJson);
    return { eyebrow: `${record.type.toLowerCase()} briefing`, title: record.title, subtitle: `${record.periodStart?.toLocaleString() || "Current"} to ${record.periodEnd?.toLocaleString() || "open ended"}`, sections: briefingSections(content) };
  }
  if (section === "travel") {
    const [record, availableDocuments] = await Promise.all([
      prisma.travelPlan.findFirst({ where: { id, organizationId }, include: { flights: { orderBy: { departsAt: "asc" } }, hotels: { orderBy: { checksInAt: "asc" } }, transports: { orderBy: { pickupAt: "asc" } }, itinerary: { orderBy: { startsAt: "asc" } }, reminders: { orderBy: { remindAt: "asc" } }, documents: { include: { document: true } } } }),
      prisma.document.findMany({ where: { organizationId, status: "READY" }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    ]);
    if (!record) return null;
    return { eyebrow: `Travel pack · ${record.status.toLowerCase()}`, title: record.title, subtitle: `${record.destination} · ${record.startsAt.toLocaleString()} to ${record.endsAt.toLocaleString()} · ${record.timezone}`, sections: [
      { title: "Flights", items: record.flights.map((item) => ({ id: item.id, title: `${item.airline} ${item.flightNumber}`, detail: `${item.departureAirport} to ${item.arrivalAirport}`, meta: `${item.departsAt.toLocaleString()} → ${item.arrivesAt.toLocaleString()}${item.confirmationCode ? ` · ${item.confirmationCode}` : ""}` })), empty: "No flights added.", form: { label: "Add flight", action: "add_flight", fields: flightFields } },
      { title: "Accommodation", items: record.hotels.map((item) => ({ id: item.id, title: item.hotelName, detail: item.address || undefined, meta: `${item.checksInAt.toLocaleString()} → ${item.checksOutAt.toLocaleString()}${item.confirmationCode ? ` · ${item.confirmationCode}` : ""}` })), empty: "No hotel stays added.", form: { label: "Add hotel", action: "add_hotel", fields: hotelFields } },
      { title: "Ground transport", items: record.transports.map((item) => ({ id: item.id, title: `${item.type}${item.provider ? ` · ${item.provider}` : ""}`, detail: `${item.pickupLocation}${item.dropoffLocation ? ` to ${item.dropoffLocation}` : ""}`, meta: item.pickupAt.toLocaleString() })), empty: "No transport added.", form: { label: "Add transport", action: "add_transport", fields: transportFields } },
      { title: "Itinerary and meeting locations", items: record.itinerary.map((item) => ({ id: item.id, title: item.title, detail: [item.kind, item.location, item.notes].filter(Boolean).join(" · "), meta: `${item.startsAt.toLocaleString()}${item.endsAt ? ` → ${item.endsAt.toLocaleString()}` : ""}` })), empty: "No itinerary items.", form: { label: "Add itinerary item", action: "add_itinerary", fields: itineraryFields } },
      { title: "Reminders", items: record.reminders.map((item) => ({ id: item.id, title: item.title, meta: `${item.remindAt.toLocaleString()} · ${item.completed ? "complete" : "pending"}` })), empty: "No trip reminders.", form: { label: "Add reminder", action: "add_reminder", fields: reminderFields } },
      { title: "Travel documents", items: record.documents.map((item) => ({ id: item.id, title: item.document.name, detail: item.kind, meta: item.expiresAt ? `Expires ${item.expiresAt.toLocaleDateString()}` : "No expiry" })), empty: "No travel documents linked.", form: availableDocuments.length ? { label: "Link document", action: "link_document", fields: [{ name: "documentId", label: "Document", type: "select", required: true, options: availableDocuments.map((document) => ({ label: document.name, value: document.id })) }, { name: "kind", label: "Document type", type: "text", required: true }, { name: "expiresAt", label: "Expiry", type: "date" }] } : undefined },
    ] };
  }
  if (section === "expenses") {
    const [record, availableDocuments] = await Promise.all([
      prisma.expense.findFirst({ where: { id, organizationId }, include: { vendor: true, report: true, receipt: true } }),
      prisma.document.findMany({ where: { organizationId, status: "READY" }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    ]);
    if (!record) return null;
    return { eyebrow: `Expense · ${record.status.toLowerCase()}`, title: record.description, subtitle: `${money(record.amountMinor, record.currency)} · ${record.category} · ${record.incurredAt.toLocaleDateString()}`, expenseStatus: record.status, sections: [
      { title: "Expense details", items: [{ id: record.id, title: record.vendor?.name || "No vendor assigned", detail: record.report?.title || "Not assigned to a report", meta: record.reimbursable ? "Reimbursable" : "Non-reimbursable" }], empty: "No details." },
      { title: "Receipt and extraction", items: record.receipt ? [{ id: record.receipt.id, title: record.receipt.name, detail: record.receipt.summary || record.receipt.extractedText?.slice(0, 500) || "Receipt stored", meta: record.receipt.status.toLowerCase() }] : [], empty: "Upload the receipt in Documents, then link it here. Extracted content remains tenant-scoped.", form: availableDocuments.length ? { label: "Link receipt", action: "link_receipt", fields: [{ name: "documentId", label: "Receipt document", type: "select", required: true, options: availableDocuments.map((document) => ({ label: document.name, value: document.id })) }] } : undefined },
    ] };
  }
  if (section === "vendors") {
    const [record, availableDocuments] = await Promise.all([
      prisma.vendor.findFirst({ where: { id, organizationId }, include: { contacts: true, quotes: { orderBy: { createdAt: "desc" } }, contracts: { include: { document: true } }, payments: { orderBy: { createdAt: "desc" } }, expenses: { orderBy: { incurredAt: "desc" }, take: 20 } } }),
      prisma.document.findMany({ where: { organizationId, status: "READY" }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    ]);
    if (!record) return null;
    return { eyebrow: `Vendor · ${record.status}`, title: record.name, subtitle: [record.category, record.email, record.renewalAt ? `Renewal ${record.renewalAt.toLocaleDateString()}` : null].filter(Boolean).join(" · ") || "Vendor record", sections: [
      { title: "Contacts", items: record.contacts.map((item) => ({ id: item.id, title: item.name, detail: [item.role, item.email, item.phone].filter(Boolean).join(" · ") })), empty: "No vendor contacts.", form: { label: "Add contact", action: "add_contact", fields: vendorContactFields } },
      { title: "Quotes", items: record.quotes.map((item) => ({ id: item.id, title: item.title, detail: item.notes || undefined, meta: `${item.amountMinor === null ? "Amount pending" : money(item.amountMinor, item.currency)} · ${item.status}${item.validUntil ? ` · valid until ${item.validUntil.toLocaleDateString()}` : ""}` })), empty: "No quotes recorded.", form: { label: "Add quote", action: "add_quote", fields: quoteFields } },
      { title: "Contracts", items: record.contracts.map((item) => ({ id: item.id, title: item.title, detail: item.document?.name || item.notes || undefined, meta: `${item.status}${item.renewalAt ? ` · renews ${item.renewalAt.toLocaleDateString()}` : ""}` })), empty: "No contracts linked.", form: { label: "Add contract", action: "add_contract", fields: contractFields(availableDocuments) } },
      { title: "Payments and service history", items: [...record.payments.map((item) => ({ id: item.id, title: item.description, meta: `${money(item.amountMinor, item.currency)} · ${item.status}${item.dueAt ? ` · due ${item.dueAt.toLocaleDateString()}` : ""}` })), ...record.expenses.map((item) => ({ id: `expense-${item.id}`, title: item.description, meta: `${money(item.amountMinor, item.currency)} · ${item.incurredAt.toLocaleDateString()}` }))], empty: "No payments or service expenses.", form: { label: "Add payment", action: "add_payment", fields: paymentFields } },
    ] };
  }
  if (section === "events") {
    const [record, availableVendors, travelPlans] = await Promise.all([
      prisma.eventPlan.findFirst({ where: { id, organizationId }, include: { guests: true, vendors: { include: { vendor: true } }, schedule: { orderBy: { startsAt: "asc" } }, travelPlan: true } }),
      prisma.vendor.findMany({ where: { organizationId, status: "active" }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 100 }),
      prisma.travelPlan.findMany({ where: { organizationId, status: { in: ["DRAFT", "CONFIRMED", "ACTIVE"] } }, select: { id: true, title: true }, orderBy: { startsAt: "asc" }, take: 100 }),
    ]);
    if (!record) return null;
    return { eyebrow: `Event · ${record.status.toLowerCase()}`, title: record.title, subtitle: `${record.startsAt.toLocaleString()} · ${record.venue || "Venue pending"} · ${record.timezone}`, sections: [
      { title: "Guests and RSVPs", items: record.guests.map((item) => ({ id: item.id, title: item.name, detail: item.email || undefined, meta: `${item.rsvp}${item.plusOnes ? ` · +${item.plusOnes}` : ""}` })), empty: "No guests invited.", form: { label: "Add guest", action: "add_guest", fields: guestFields } },
      { title: "Run of show", items: record.schedule.map((item) => ({ id: item.id, title: item.title, detail: [item.location, item.owner].filter(Boolean).join(" · "), meta: `${item.startsAt.toLocaleString()}${item.endsAt ? ` → ${item.endsAt.toLocaleString()}` : ""}` })), empty: "No schedule items.", form: { label: "Add item", action: "add_schedule", fields: scheduleFields } },
      { title: "Vendors and coordination", items: record.vendors.map((item) => ({ id: item.id, title: item.vendor.name, detail: item.purpose, meta: `${item.status}${item.amountMinor === null ? "" : ` · ${money(item.amountMinor, record.currency)}`}` })), empty: "No event vendors linked.", form: availableVendors.length ? { label: "Add vendor", action: "add_event_vendor", fields: [{ name: "vendorId", label: "Vendor", type: "select", required: true, options: availableVendors.map((vendor) => ({ label: vendor.name, value: vendor.id })) }, { name: "purpose", label: "Purpose", type: "text", required: true }, { name: "amount", label: "Expected amount", type: "text" }] } : undefined },
      { title: "Travel, accommodation, and catering", items: [{ id: "logistics", title: record.travelPlan?.title || "No travel plan linked", detail: [record.accommodationNotes, record.cateringNotes].filter(Boolean).join("\n") || "Logistics notes are not set." }], empty: "No logistics set.", form: { label: "Update logistics", action: "set_logistics", fields: [{ name: "travelPlanId", label: "Travel plan", type: "select", options: [{ label: "None", value: "" }, ...travelPlans.map((plan) => ({ label: plan.title, value: plan.id }))] }, { name: "accommodationNotes", label: "Accommodation", type: "textarea" }, { name: "cateringNotes", label: "Catering", type: "textarea" }] } },
    ] };
  }
  if (section === "automations") {
    const record = await prisma.automation.findFirst({ where: { id, organizationId }, include: { runs: { orderBy: { createdAt: "desc" }, take: 50 } } });
    if (!record) return null;
    const pending = record.runs.find((run) => run.status === "WAITING_APPROVAL");
    return { eyebrow: `Automation · ${record.status.toLowerCase()}`, title: record.name, subtitle: record.description || "Supervised workflow", automationRunId: pending?.id, sections: [
      { title: "Workflow", items: [{ id: "trigger", title: "Trigger", detail: prettyJson(record.triggerJson) }, { id: "conditions", title: "Conditions", detail: prettyJson(record.conditionsJson) }, { id: "actions", title: "Actions", detail: prettyJson(record.actionsJson), meta: record.requiresApproval ? "Approval required" : "Automatic execution" }], empty: "Workflow is not configured." },
      { title: "Run history", items: record.runs.map((run) => ({ id: run.id, title: run.status.toLowerCase().replaceAll("_", " "), detail: run.error || prettyJson(run.resultJson || run.stepsJson), meta: run.createdAt.toLocaleString() })), empty: "This workflow has not run yet." },
    ] };
  }
  return null;
}

function briefingSections(content: Record<string, unknown>): DetailSection[] {
  const labels: Record<string, string> = { schedule: "Schedule", openTasks: "Open tasks", followUps: "Follow-ups", importantCommunication: "Important communication", recentMeetings: "Recent meetings", decisions: "Decisions", relevantDocuments: "Relevant documents" };
  return Object.entries(labels).map(([key, title]) => ({ title, items: (Array.isArray(content[key]) ? content[key] : []).map((item, index) => { const value = item as Record<string, unknown>; return { id: String(index), title: String(value.title || value.subject || value.name || value.description || `Item ${index + 1}`), detail: String(value.location || value.sender || value.notes || value.rationale || ""), meta: formatUnknownDate(value.startsAt || value.dueAt || value.receivedAt || value.decidedAt) }; }), empty: `No ${title.toLowerCase()} in this briefing period.` }));
}

function jsonArray<T>(value: string): T[] { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function jsonObject(value: string): Record<string, unknown> { try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } }
function money(value: number, currency: string) { return new Intl.NumberFormat("en", { style: "currency", currency }).format(value / 100); }
function prettyJson(value: string) { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
function formatUnknownDate(value: unknown) { if (!value) return undefined; const date = new Date(String(value)); return Number.isNaN(date.valueOf()) ? undefined : date.toLocaleString(); }
function safeHostname(value: string) { try { return new URL(value).hostname; } catch { return "External source"; } }

const flightFields = [{ name: "airline", label: "Airline", type: "text", required: true }, { name: "flightNumber", label: "Flight number", type: "text", required: true }, { name: "departureAirport", label: "Departure airport", type: "text", required: true }, { name: "arrivalAirport", label: "Arrival airport", type: "text", required: true }, { name: "departsAt", label: "Departs", type: "datetime-local", required: true }, { name: "arrivesAt", label: "Arrives", type: "datetime-local", required: true }, { name: "confirmationCode", label: "Confirmation code", type: "text" }] as const;
const hotelFields = [{ name: "hotelName", label: "Hotel", type: "text", required: true }, { name: "address", label: "Address", type: "text" }, { name: "checksInAt", label: "Check in", type: "datetime-local", required: true }, { name: "checksOutAt", label: "Check out", type: "datetime-local", required: true }, { name: "confirmationCode", label: "Confirmation code", type: "text" }] as const;
const transportFields = [{ name: "type", label: "Transport type", type: "text", required: true }, { name: "provider", label: "Provider", type: "text" }, { name: "pickupAt", label: "Pickup", type: "datetime-local", required: true }, { name: "pickupLocation", label: "Pickup location", type: "text", required: true }, { name: "dropoffLocation", label: "Drop-off location", type: "text" }] as const;
const itineraryFields = [{ name: "title", label: "Title", type: "text", required: true }, { name: "kind", label: "Type", type: "select", required: true, options: ["meeting", "transfer", "meal", "activity", "deadline"].map((value) => ({ label: value, value })) }, { name: "startsAt", label: "Starts", type: "datetime-local", required: true }, { name: "endsAt", label: "Ends", type: "datetime-local" }, { name: "location", label: "Location", type: "text" }, { name: "notes", label: "Notes", type: "textarea" }] as const;
const reminderFields = [{ name: "title", label: "Reminder", type: "text", required: true }, { name: "remindAt", label: "Remind at", type: "datetime-local", required: true }] as const;
const vendorContactFields = [{ name: "name", label: "Name", type: "text", required: true }, { name: "role", label: "Role", type: "text" }, { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone", type: "text" }] as const;
const quoteFields = [{ name: "title", label: "Quote", type: "text", required: true }, { name: "amount", label: "Amount", type: "text" }, { name: "currency", label: "Currency", type: "text", defaultValue: "USD", required: true }, { name: "validUntil", label: "Valid until", type: "date" }, { name: "notes", label: "Notes", type: "textarea" }] as const;
const paymentFields = [{ name: "description", label: "Description", type: "text", required: true }, { name: "amount", label: "Amount", type: "text", required: true }, { name: "currency", label: "Currency", type: "text", defaultValue: "USD", required: true }, { name: "dueAt", label: "Due date", type: "date" }] as const;
function contractFields(documents: { id: string; name: string }[]) { return [{ name: "title", label: "Contract", type: "text", required: true }, { name: "documentId", label: "Document", type: "select", options: [{ label: "No document", value: "" }, ...documents.map((document) => ({ label: document.name, value: document.id }))] }, { name: "startsAt", label: "Starts", type: "date" }, { name: "endsAt", label: "Ends", type: "date" }, { name: "renewalAt", label: "Renewal", type: "date" }, { name: "notes", label: "Notes", type: "textarea" }] as const; }
const guestFields = [{ name: "name", label: "Guest name", type: "text", required: true }, { name: "email", label: "Email", type: "email" }, { name: "rsvp", label: "RSVP", type: "select", options: ["pending", "accepted", "declined", "tentative"].map((value) => ({ label: value, value })) }, { name: "plusOnes", label: "Plus ones", type: "text", defaultValue: "0" }] as const;
const scheduleFields = [{ name: "title", label: "Schedule item", type: "text", required: true }, { name: "startsAt", label: "Starts", type: "datetime-local", required: true }, { name: "endsAt", label: "Ends", type: "datetime-local" }, { name: "location", label: "Location", type: "text" }, { name: "owner", label: "Owner", type: "text" }] as const;
