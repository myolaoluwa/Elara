"use client";

import Link from "next/link";
import { ArrowUpRight, Check, LoaderCircle, Plus, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type CollectionField = {
  name: string;
  label: string;
  type: "text" | "email" | "date" | "datetime-local" | "textarea" | "select" | "checkbox";
  required?: boolean;
  placeholder?: string;
  options?: readonly { label: string; value: string }[];
  defaultValue?: string | boolean;
};

export type CollectionRecord = {
  id: string;
  title: string;
  subtitle?: string | null;
  meta?: string[];
  badge?: string;
  href?: string;
  resolved?: boolean;
};

export function CollectionPage({
  eyebrow,
  title,
  subtitle,
  action,
  resource,
  fields,
  initialRecords,
  emptyTitle,
  emptyBody,
  allowResolve = false,
  apiBase = "/api/operations",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action: string;
  resource: string;
  fields: CollectionField[];
  initialRecords: CollectionRecord[];
  emptyTitle: string;
  emptyBody: string;
  allowResolve?: boolean;
  apiBase?: string;
}) {
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = Object.fromEntries(fields.map((field) => [field.name, field.type === "checkbox" ? data.get(field.name) === "on" : data.get(field.name)]));
    try {
      const response = await fetch(`${apiBase}/${resource}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to save this record");
        return;
      }
      setOpen(false);
      form.reset();
      router.refresh();
    } catch {
      setError("Unable to reach Elara. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function resolve(id: string) {
    try {
      const response = await fetch(`${apiBase}/${resource}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error("Update failed");
      setRecords((current) => current.map((record) => record.id === id ? { ...record, resolved: true, badge: "Resolved" } : record));
    } catch {
      setError("Unable to update this record.");
    }
  }

  return (
    <>
      <div className="page-heading compact-heading">
        <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div>
        <button className="primary-button" type="button" onClick={() => setOpen(true)}><Plus size={16} />{action}</button>
      </div>
      {error && <div className="task-error collection-error" role="alert">{error}<button onClick={() => setError(null)} aria-label="Dismiss"><X size={14} /></button></div>}
      <section className="panel collection-panel">
        {records.length === 0 ? (
          <div className="task-empty collection-empty"><div className="empty-icon"><Plus size={20} /></div><h2>{emptyTitle}</h2><p>{emptyBody}</p><button className="secondary-button" onClick={() => setOpen(true)}>{action}</button></div>
        ) : (
          <div className="record-grid">
            {records.map((record) => (
              <article className={`record-card ${record.resolved ? "is-resolved" : ""}`} key={record.id}>
                <div className="record-card-top">
                  {record.badge && <span className="record-badge">{record.badge}</span>}
                  {record.href && <Link href={record.href} aria-label={`Open ${record.title}`}><ArrowUpRight size={15} /></Link>}
                </div>
                <h2>{record.title}</h2>
                {record.subtitle && <p>{record.subtitle}</p>}
                {record.meta && <div className="record-meta">{record.meta.filter(Boolean).map((item) => <span key={item}>{item}</span>)}</div>}
                {allowResolve && !record.resolved && <button className="resolve-button" onClick={() => resolve(record.id)}><Check size={13} />Mark resolved</button>}
              </article>
            ))}
          </div>
        )}
      </section>
      {open && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <form className="task-composer collection-composer" onSubmit={submit}>
            <header><div><p className="eyebrow">{eyebrow}</p><h2>{action}</h2></div><button type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button></header>
            <div className="collection-form-fields">
              {fields.map((field) => <Field key={field.name} field={field} />)}
            </div>
            {error && <p className="form-error">{error}</p>}
            <footer><button className="quiet-modal-button" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}{action}</button></footer>
          </form>
        </div>
      )}
    </>
  );
}

function Field({ field }: { field: CollectionField }) {
  if (field.type === "checkbox") return <label className="checkbox-field"><input type="checkbox" name={field.name} defaultChecked={Boolean(field.defaultValue)} /><span>{field.label}</span></label>;
  return (
    <label>{field.label}
      {field.type === "textarea" ? <textarea name={field.name} required={field.required} placeholder={field.placeholder} rows={4} /> : field.type === "select" ? (
        <select name={field.name} required={field.required} defaultValue={String(field.defaultValue || "")}>
          {field.options?.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
      ) : <input name={field.name} type={field.type} required={field.required} placeholder={field.placeholder} defaultValue={typeof field.defaultValue === "string" ? field.defaultValue : undefined} />}
    </label>
  );
}
