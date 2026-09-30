"use client";

import { useState } from "react";
import { CollectionPage, type CollectionRecord } from "./collection-page";

type MemoryKind = "projects" | "decisions" | "commitments";
export function MemoryCenter({ records }: { records: Record<MemoryKind, CollectionRecord[]> }) {
  const [tab, setTab] = useState<MemoryKind>("projects");
  const config = {
    projects: { title: "Projects", action: "Add project", empty: "No projects recorded", body: "Projects connect work, people, meetings, and decisions.", fields: [{ name: "name", label: "Project name", type: "text", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "status", label: "Status", type: "select", defaultValue: "active", options: [{ label: "Active", value: "active" }, { label: "On hold", value: "on_hold" }, { label: "Complete", value: "complete" }] }] },
    decisions: { title: "Decisions", action: "Record decision", empty: "No decisions recorded", body: "Confirmed decisions become durable organizational memory.", fields: [{ name: "title", label: "Decision", type: "text", required: true }, { name: "rationale", label: "Rationale and context", type: "textarea" }, { name: "decidedAt", label: "Decision date", type: "date", required: true }, { name: "confirmed", label: "This is a confirmed decision", type: "checkbox", defaultValue: true }] },
    commitments: { title: "Commitments", action: "Record commitment", empty: "No commitments recorded", body: "Capture promises with their owner and deadline.", fields: [{ name: "description", label: "Commitment", type: "text", required: true }, { name: "contactName", label: "Person", type: "text", placeholder: "Existing contact name" }, { name: "dueAt", label: "Due date", type: "date" }, { name: "confirmed", label: "This commitment is confirmed", type: "checkbox", defaultValue: true }] },
  } as const;
  const selected = config[tab];
  return <div className="memory-center"><div className="memory-tabs">{(Object.keys(config) as MemoryKind[]).map((item) => <button className={tab === item ? "selected" : ""} onClick={() => setTab(item)} key={item}>{config[item].title}</button>)}</div><CollectionPage eyebrow="Executive memory" title={selected.title} subtitle="Confirmed context that remains available across the workspace." action={selected.action} resource={tab} fields={[...selected.fields]} initialRecords={records[tab]} emptyTitle={selected.empty} emptyBody={selected.body} /></div>;
}
