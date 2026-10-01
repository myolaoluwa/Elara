import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CollectionPage, type CollectionField } from "@/components/collection-page";
import { moduleBySlug, modules } from "@/lib/navigation";
import { listV1Records } from "@/lib/v1/service";
import type { V1Resource } from "@/lib/v1/schemas";
import { requireWorkspaceContext } from "@/lib/workspace";

export function generateStaticParams() {
  return modules.filter(({ slug }) => slug !== "dashboard" && slug !== "tasks").map(({ slug }) => ({ section: slug }));
}

export default async function ModulePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const moduleConfig = moduleBySlug(section);
  if (!moduleConfig || section === "dashboard") notFound();
  const Icon = moduleConfig.icon;
  const context = await requireWorkspaceContext();
  const v1Config = v1PageConfigs[section as V1Resource];

  if (v1Config) {
    const records = await listV1Records(section as V1Resource, context.organization.id);
    return <AppShell workspaceName={context.organization.name} userName={context.user.name}>
      <CollectionPage
        eyebrow="V1 workspace"
        title={moduleConfig.label}
        subtitle={moduleConfig.description}
        action={moduleConfig.action || "Create"}
        resource={section}
        apiBase="/api/v1"
        fields={v1Config.fields}
        initialRecords={records}
        emptyTitle={moduleConfig.emptyTitle}
        emptyBody={moduleConfig.emptyBody}
      />
    </AppShell>;
  }

  return (
    <AppShell workspaceName={context.organization.name} userName={context.user.name}>
      <div className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>{moduleConfig.label}</h1>
          <p className="page-subtitle">{moduleConfig.description}</p>
        </div>
        {moduleConfig.action && <button className="primary-button" type="button"><Plus size={16} />{moduleConfig.action}</button>}
      </div>
      <section className="panel module-empty">
        <div className="module-art"><Icon size={30} /></div>
        <span className="section-kicker">Ready when you are</span>
        <h2>{moduleConfig.emptyTitle}</h2>
        <p>{moduleConfig.emptyBody}</p>
        {moduleConfig.action && <button className="secondary-button" type="button">{moduleConfig.action}</button>}
      </section>
    </AppShell>
  );
}

const v1PageConfigs: Partial<Record<V1Resource, { fields: CollectionField[] }>> = {
  research: { fields: [
    { name: "topic", label: "Topic", type: "text", required: true, placeholder: "ABC Ltd market position" },
    { name: "subjectType", label: "Subject type", type: "select", required: true, options: ["company", "person", "event", "vendor", "product", "industry", "competitor", "destination", "other"].map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })) },
    { name: "question", label: "Research question", type: "textarea", placeholder: "What should the executive know and verify?" },
  ] },
  briefings: { fields: [
    { name: "title", label: "Briefing title", type: "text", required: true, placeholder: "Tomorrow's executive brief" },
    { name: "type", label: "Briefing type", type: "select", required: true, options: ["DAILY", "MEETING", "TRAVEL", "WEEKLY", "CUSTOM"].map((value) => ({ label: value[0] + value.slice(1).toLowerCase(), value })) },
    { name: "periodStart", label: "Period starts", type: "datetime-local" },
    { name: "periodEnd", label: "Period ends", type: "datetime-local" },
    { name: "focus", label: "Focus", type: "textarea", placeholder: "Priorities, meeting, executive, or trip to focus on" },
  ] },
  travel: { fields: [
    { name: "title", label: "Trip name", type: "text", required: true, placeholder: "London investor meetings" },
    { name: "destination", label: "Destination", type: "text", required: true },
    { name: "startsAt", label: "Starts", type: "datetime-local", required: true },
    { name: "endsAt", label: "Ends", type: "datetime-local", required: true },
    { name: "timezone", label: "Destination time zone", type: "text", required: true, defaultValue: "UTC", placeholder: "Europe/London" },
    { name: "purpose", label: "Purpose", type: "text" },
    { name: "notes", label: "Notes", type: "textarea" },
  ] },
  expenses: { fields: [
    { name: "description", label: "Description", type: "text", required: true },
    { name: "category", label: "Category", type: "select", required: true, options: ["Travel", "Meals", "Accommodation", "Transport", "Office", "Software", "Professional services", "Other"].map((value) => ({ label: value, value })) },
    { name: "amount", label: "Amount", type: "text", required: true, placeholder: "125.50" },
    { name: "currency", label: "Currency", type: "text", required: true, defaultValue: "USD" },
    { name: "incurredAt", label: "Date", type: "date", required: true },
    { name: "reimbursable", label: "Reimbursable", type: "checkbox", defaultValue: true },
  ] },
  "expense-reports": { fields: [
    { name: "title", label: "Report title", type: "text", required: true, placeholder: "October client travel" },
    { name: "periodStart", label: "Period starts", type: "date" },
    { name: "periodEnd", label: "Period ends", type: "date" },
    { name: "currency", label: "Currency", type: "text", required: true, defaultValue: "USD" },
    { name: "notes", label: "Notes", type: "textarea", placeholder: "Purpose, approval context, or reimbursement details" },
  ] },
  invoices: { fields: [
    { name: "invoiceNumber", label: "Invoice number", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "amount", label: "Amount", type: "text", required: true, placeholder: "1250.00" },
    { name: "currency", label: "Currency", type: "text", required: true, defaultValue: "USD" },
    { name: "issuedAt", label: "Issued date", type: "date" },
    { name: "dueAt", label: "Due date", type: "date" },
  ] },
  vendors: { fields: [
    { name: "name", label: "Vendor name", type: "text", required: true },
    { name: "category", label: "Category", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "text" },
    { name: "website", label: "Website", type: "text", placeholder: "https://" },
    { name: "renewalAt", label: "Renewal date", type: "date" },
    { name: "notes", label: "Notes", type: "textarea" },
  ] },
  events: { fields: [
    { name: "title", label: "Event name", type: "text", required: true },
    { name: "venue", label: "Venue", type: "text" },
    { name: "startsAt", label: "Starts", type: "datetime-local", required: true },
    { name: "endsAt", label: "Ends", type: "datetime-local", required: true },
    { name: "timezone", label: "Time zone", type: "text", required: true, defaultValue: "UTC" },
    { name: "budget", label: "Budget", type: "text", placeholder: "5000" },
    { name: "currency", label: "Currency", type: "text", required: true, defaultValue: "USD" },
    { name: "description", label: "Description", type: "textarea" },
  ] },
  automations: { fields: [
    { name: "name", label: "Workflow name", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "trigger", label: "Trigger", type: "select", required: true, options: [{ label: "Manual", value: "manual" }, { label: "Meeting completed", value: "meeting.completed" }, { label: "Email received", value: "email.received" }, { label: "Task overdue", value: "task.overdue" }, { label: "Calendar upcoming", value: "calendar.upcoming" }] },
    { name: "action", label: "Action", type: "select", required: true, options: [{ label: "Create task", value: "create_task" }, { label: "Create follow-up", value: "create_follow_up" }, { label: "Create notification", value: "create_notification" }] },
    { name: "actionTitle", label: "Action title", type: "text", required: true },
    { name: "requiresApproval", label: "Require approval before execution", type: "checkbox", defaultValue: true },
  ] },
};
