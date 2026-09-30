"use client";

import { Calendar, Check, ChevronDown, Circle, Flag, LoaderCircle, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
type TaskItem = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string } | null;
};

const filters = ["OPEN", "TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;

export function TaskBoard({ initialTasks }: { initialTasks: TaskItem[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<(typeof filters)[number]>("OPEN");
  const [composerOpen, setComposerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => tasks.filter((task) => {
    if (filter === "OPEN") return !["DONE", "CANCELLED"].includes(task.status);
    return task.status === filter;
  }), [filter, tasks]);

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        notes: data.get("notes") || null,
        dueAt: data.get("dueAt") || null,
        priority: data.get("priority"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Unable to create task");
      setPending(false);
      return;
    }
    setTasks((current) => [payload.task, ...current]);
    setPending(false);
    setComposerOpen(false);
    form.reset();
    router.refresh();
  }

  async function setStatus(taskId: string, status: TaskStatus) {
    const previous = tasks;
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status } : task));
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setTasks(previous);
      setError("That update could not be saved.");
    }
    router.refresh();
  }

  const openCount = tasks.filter((task) => !["DONE", "CANCELLED"].includes(task.status)).length;
  const overdueCount = tasks.filter((task) => task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "DONE").length;
  const doneCount = tasks.filter((task) => task.status === "DONE").length;

  return (
    <>
      <div className="page-heading compact-heading tasks-heading">
        <div><p className="eyebrow">Execution</p><h1>Tasks</h1><p className="page-subtitle">Keep ownership, deadlines, and source context together.</p></div>
        <button className="primary-button" type="button" onClick={() => setComposerOpen(true)}><Plus size={16} />Create task</button>
      </div>

      <section className="task-summary" aria-label="Task summary">
        <div><span>Open</span><strong>{openCount}</strong></div>
        <div><span>Overdue</span><strong className={overdueCount ? "danger-text" : ""}>{overdueCount}</strong></div>
        <div><span>Completed</span><strong>{doneCount}</strong></div>
      </section>

      <section className="panel task-panel">
        <header className="task-toolbar">
          <div className="task-filters">
            {filters.map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{formatStatus(item)}</button>)}
          </div>
          <span>{visible.length} {visible.length === 1 ? "task" : "tasks"}</span>
        </header>
        {error && <div className="task-error" role="alert">{error}<button aria-label="Dismiss" onClick={() => setError(null)}><X size={14} /></button></div>}
        {visible.length === 0 ? (
          <div className="task-empty"><div className="empty-icon"><Check size={21} /></div><h2>{tasks.length ? "No tasks in this view" : "A clear task list"}</h2><p>{tasks.length ? "Choose another filter to see the rest of your work." : "Create the first task. Its owner, deadline, priority, and audit history will stay connected."}</p><button className="secondary-button" onClick={() => setComposerOpen(true)}>Create task</button></div>
        ) : (
          <div className="task-list">
            {visible.map((task) => <TaskRow key={task.id} task={task} onStatus={setStatus} />)}
          </div>
        )}
      </section>

      {composerOpen && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setComposerOpen(false); }}>
          <form className="task-composer" onSubmit={createTask}>
            <header><div><p className="eyebrow">New task</p><h2>Capture what needs doing.</h2></div><button type="button" aria-label="Close" onClick={() => setComposerOpen(false)}><X size={18} /></button></header>
            <label>Task<input name="title" autoFocus required maxLength={180} placeholder="e.g. Send the board briefing" /></label>
            <label>Notes<textarea name="notes" rows={4} maxLength={5000} placeholder="Add useful context, not just reminders." /></label>
            <div className="form-grid">
              <label>Due date<input name="dueAt" type="date" /></label>
              <label>Priority<select name="priority" defaultValue="NORMAL"><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <footer><button className="quiet-modal-button" type="button" onClick={() => setComposerOpen(false)}>Cancel</button><button className="primary-button" disabled={pending} type="submit">{pending ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}Create task</button></footer>
          </form>
        </div>
      )}
    </>
  );
}

function TaskRow({ task, onStatus }: { task: TaskItem; onStatus: (id: string, status: TaskStatus) => void }) {
  const done = task.status === "DONE";
  return (
    <article className={`task-row ${done ? "is-done" : ""}`}>
      <button className="task-check" aria-label={done ? "Reopen task" : "Complete task"} onClick={() => onStatus(task.id, done ? "TODO" : "DONE")}>{done ? <Check size={14} /> : <Circle size={16} />}</button>
      <div className="task-main"><h3>{task.title}</h3>{task.notes && <p>{task.notes}</p>}<div className="task-meta">{task.dueAt && <span><Calendar size={12} />{formatDate(task.dueAt)}</span>}<span className={`priority-${task.priority.toLowerCase()}`}><Flag size={12} />{formatStatus(task.priority)}</span>{task.owner && <span>{task.owner.name}</span>}</div></div>
      <label className="status-select"><span className="sr-only">Task status</span><select value={task.status} onChange={(event) => onStatus(task.id, event.target.value as TaskStatus)}><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="BLOCKED">Blocked</option><option value="DONE">Done</option><option value="CANCELLED">Cancelled</option></select><ChevronDown size={13} /></label>
    </article>
  );
}

function formatStatus(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}
