import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CollectionPage, type CollectionField } from "@/components/collection-page";
import { listV1Records } from "@/lib/v1/service";
import { requireWorkspaceContext } from "@/lib/workspace";

const views = {
  expenses: { title: "Expenses", subtitle: "Track receipts, categories, reimbursements, and report assignment.", action: "Add expense", emptyTitle: "No expenses yet", emptyBody: "Record an expense or upload a receipt in Documents.", fields: [
    { name: "description", label: "Description", type: "text", required: true }, { name: "category", label: "Category", type: "select", required: true, options: ["Travel", "Meals", "Accommodation", "Transport", "Office", "Software", "Professional services", "Other"].map((value) => ({ label: value, value })) }, { name: "amount", label: "Amount", type: "text", required: true }, { name: "currency", label: "Currency", type: "text", required: true, defaultValue: "USD" }, { name: "incurredAt", label: "Date", type: "date", required: true }, { name: "reimbursable", label: "Reimbursable", type: "checkbox", defaultValue: true },
  ] },
  "expense-reports": { title: "Expense reports", subtitle: "Bundle expenses through submission, approval, and reimbursement.", action: "New report", emptyTitle: "No expense reports", emptyBody: "Create a report for a period or trip.", fields: [
    { name: "title", label: "Report title", type: "text", required: true }, { name: "periodStart", label: "Period starts", type: "date" }, { name: "periodEnd", label: "Period ends", type: "date" }, { name: "currency", label: "Currency", type: "text", required: true, defaultValue: "USD" }, { name: "notes", label: "Notes", type: "textarea" },
  ] },
  invoices: { title: "Invoices", subtitle: "Track invoice amounts, due dates, vendors, and payment state.", action: "Add invoice", emptyTitle: "No invoices", emptyBody: "Record an invoice to begin tracking its due date.", fields: [
    { name: "invoiceNumber", label: "Invoice number", type: "text", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "amount", label: "Amount", type: "text", required: true }, { name: "currency", label: "Currency", type: "text", required: true, defaultValue: "USD" }, { name: "issuedAt", label: "Issued", type: "date" }, { name: "dueAt", label: "Due", type: "date" },
  ] },
} satisfies Record<string, { title: string; subtitle: string; action: string; emptyTitle: string; emptyBody: string; fields: CollectionField[] }>;

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const context = await requireWorkspaceContext();
  const requested = (await searchParams).view;
  const resource = requested && requested in views ? requested as keyof typeof views : "expenses";
  const config = views[resource];
  const records = await listV1Records(resource, context.organization.id);
  return <AppShell workspaceName={context.organization.name} userName={context.user.name}>
    <nav className="memory-tabs" aria-label="Finance views">{Object.entries(views).map(([key, item]) => <Link className={resource === key ? "selected" : ""} href={`/expenses?view=${key}`} key={key}>{item.title}</Link>)}</nav>
    <CollectionPage eyebrow="Finance" title={config.title} subtitle={config.subtitle} action={config.action} resource={resource} apiBase="/api/v1" fields={config.fields} initialRecords={records} emptyTitle={config.emptyTitle} emptyBody={config.emptyBody} />
  </AppShell>;
}
