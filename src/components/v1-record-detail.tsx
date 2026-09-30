"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, Play, Plus } from "lucide-react";
import type { CollectionField } from "./collection-page";

export type DetailSection = {
  title: string;
  items: { id: string; title: string; detail?: string; meta?: string; href?: string }[];
  empty: string;
  form?: { label: string; action: string; fields: readonly CollectionField[] };
};

export function V1RecordDetail({ resource, id, sections, automationRunId, expenseStatus }: { resource: string; id: string; sections: DetailSection[]; automationRunId?: string | null; expenseStatus?: string }) {
  const router = useRouter();
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>, action: string, fields: readonly CollectionField[]) {
    event.preventDefault();
    setPending(true); setError(null);
    const form = event.currentTarget; const data = new FormData(form);
    const body = Object.fromEntries(fields.map((field) => [field.name, field.type === "checkbox" ? data.get(field.name) === "on" : data.get(field.name)]));
    try {
      const response = await fetch(`/api/v1/${resource}/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...body }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save");
      setActiveForm(null); form.reset(); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save"); }
    finally { setPending(false); }
  }

  async function act(action: "run" | "approve" | "set_status" | "prepare_invitations", extra: Record<string, string> = {}) {
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/v1/${resource}/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to complete action");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to complete action"); }
    finally { setPending(false); }
  }

  return <>
    {error && <p className="meeting-message" role="alert">{error}</p>}
    {resource === "automations" && <div className="detail-actions">
      <button className="primary-button" disabled={pending} onClick={() => act("run")}><Play size={15} />Run workflow</button>
      {automationRunId && <button className="secondary-button" disabled={pending} onClick={() => act("approve", { runId: automationRunId })}><CheckCircle2 size={15} />Approve pending run</button>}
    </div>}
    {resource === "expenses" && <div className="detail-actions"><span className="record-badge">{expenseStatus}</span>{["SUBMITTED", "APPROVED", "REIMBURSED"].map((status) => <button className="secondary-button" disabled={pending || expenseStatus === status} key={status} onClick={() => act("set_status", { status })}>{status.toLowerCase()}</button>)}</div>}
    {resource === "events" && <div className="detail-actions"><button className="secondary-button" disabled={pending} onClick={() => act("prepare_invitations")}><CheckCircle2 size={15} />Prepare invitation drafts</button></div>}
    <div className="detail-grid">{sections.map((section) => <section className="panel detail-section" key={section.title}>
      <header><div><span className="section-kicker">Workspace record</span><h2>{section.title}</h2></div>{section.form && <button className="quiet-button" onClick={() => setActiveForm(activeForm === section.form!.action ? null : section.form!.action)}><Plus size={14} />{section.form.label}</button>}</header>
      {activeForm === section.form?.action && <form className="inline-detail-form" onSubmit={(event) => submit(event, section.form!.action, section.form!.fields)}>
        {section.form.fields.map((field) => <DetailField field={field} key={field.name} />)}
        <button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}Save</button>
      </form>}
      {section.items.length ? <div className="detail-list">{section.items.map((item) => <article key={item.id}><div><h3>{item.href ? <Link href={item.href} target="_blank" rel="noreferrer">{item.title}</Link> : item.title}</h3>{item.detail && <p>{item.detail}</p>}</div>{item.meta && <span>{item.meta}</span>}</article>)}</div> : <p className="detail-empty">{section.empty}</p>}
    </section>)}</div>
  </>;
}

function DetailField({ field }: { field: CollectionField }) {
  return <label>{field.label}{field.type === "select" ? <select name={field.name} defaultValue={String(field.defaultValue || "")} required={field.required}>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "textarea" ? <textarea name={field.name} rows={3} required={field.required} /> : <input name={field.name} type={field.type} required={field.required} defaultValue={typeof field.defaultValue === "string" ? field.defaultValue : undefined} placeholder={field.placeholder} />}</label>;
}
