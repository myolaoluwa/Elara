import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Clock3, Mail, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DashboardGreeting, TodayLabel } from "@/components/today-label";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";
import { dateKeyInZone, dateOnlyKey, formatTimeInZone } from "@/lib/date-time";

export default async function DashboardPage() {
  const context = await requireWorkspaceContext();
  const organizationId = context.organization.id;
  const now = new Date();
  const [executive, profile, eventCandidates, openTasks, followUps, importantEmails, notifications] = await Promise.all([
    prisma.executive.findFirst({ where: { organizationId }, select: { timezone: true } }),
    prisma.userProfile.findUnique({ where: { userId: context.user.id }, select: { timezone: true } }),
    prisma.calendarEvent.findMany({ where: { organizationId, startsAt: { gte: new Date(now.getTime() - 36 * 60 * 60 * 1000), lte: new Date(now.getTime() + 36 * 60 * 60 * 1000) } }, orderBy: { startsAt: "asc" } }),
    prisma.task.findMany({ where: { organizationId, status: { notIn: ["DONE", "CANCELLED"] } }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }], take: 50 }),
    prisma.followUp.findMany({ where: { organizationId, status: "OPEN" }, include: { contact: true }, orderBy: { dueAt: "asc" }, take: 10 }),
    prisma.email.findMany({ where: { organizationId, isImportant: true }, orderBy: { receivedAt: "desc" }, take: 10 }),
    prisma.notification.findMany({ where: { organizationId, status: "UNREAD" }, orderBy: [{ priority: "desc" }, { createdAt: "desc" }], take: 10 }),
  ]);
  const timezone = executive?.timezone || profile?.timezone || "UTC";
  const today = dateKeyInZone(now, timezone);
  const events = eventCandidates.filter((event) => dateKeyInZone(event.startsAt, timezone) === today);
  const dueTasks = openTasks.filter((task) => task.dueAt && dateOnlyKey(task.dueAt) === today);
  const overdueTasks = openTasks.filter((task) => task.dueAt && dateOnlyKey(task.dueAt) < today);
  const overdueIds = new Set(overdueTasks.map((task) => task.id));
  const attention = [
    ...overdueTasks.map((item) => ({ id: item.id, title: item.title, detail: "Overdue task", href: "/tasks", tone: "critical" })),
    ...openTasks.filter((item) => !overdueIds.has(item.id)).slice(0, 5).map((item) => ({ id: item.id, title: item.title, detail: item.dueAt ? `Task due ${formatTaskDate(item.dueAt)}` : "Open task", href: "/tasks", tone: item.priority === "CRITICAL" ? "critical" : item.priority === "HIGH" ? "warning" : "normal" })),
    ...followUps.filter((item) => item.dueAt && item.dueAt <= now).map((item) => ({ id: item.id, title: item.title, detail: item.contact?.name || "Follow-up due", href: "/follow-ups", tone: "warning" })),
    ...importantEmails.slice(0, 4).map((item) => ({ id: item.id, title: item.subject, detail: `Important email · ${item.sender}`, href: "/inbox", tone: "normal" })),
    ...notifications.map((item) => ({ id: item.id, title: item.title, detail: item.body, href: "/activity", tone: item.priority.toLowerCase() })),
  ].slice(0, 10);
  const metrics = [
    { label: "Meetings today", value: events.length, icon: CalendarDays, tone: "sage" },
    { label: "Tasks due", value: dueTasks.length, icon: Check, tone: "blue" },
    { label: "Waiting on", value: followUps.length, icon: Clock3, tone: "amber" },
    { label: "Needs attention", value: attention.length, icon: Mail, tone: "rose" },
  ] as const;
  const briefing = events.length || dueTasks.length || attention.length
    ? `${events.length} calendar event${events.length === 1 ? "" : "s"} today, ${dueTasks.length} task${dueTasks.length === 1 ? "" : "s"} due, and ${attention.length} item${attention.length === 1 ? "" : "s"} requiring attention.${events[0] ? ` First event: ${events[0].title} at ${formatTimeInZone(events[0].startsAt, events[0].timezone || timezone)}.` : ""}`
    : "Your workspace has no scheduled events, due tasks, or attention items today.";

  return <AppShell workspaceName={context.organization.name} userName={context.user.name}>
    <div className="page-heading"><div><TodayLabel /><DashboardGreeting name={context.user.name.split(" ")[0]} /><p className="page-subtitle">Here’s the shape of your executive’s day.</p></div><Link className="primary-button" href="/command"><Sparkles size={16} />Prepare my day</Link></div>
    <section className="briefing-card"><div className="briefing-mark"><Sparkles size={20} /></div><div className="briefing-copy"><div className="section-kicker">Daily briefing</div><h2>Today, grounded in your workspace.</h2><p>{briefing}</p></div><Link className="text-button" href="/command">Ask for detail <ArrowRight size={15} /></Link></section>
    <section className="metrics" aria-label="Today at a glance">{metrics.map(({ label, value, icon: Icon, tone }) => <article className="metric-card" key={label}><div className={`metric-icon ${tone}`}><Icon size={17} /></div><div><strong>{value}</strong><span>{label}</span></div></article>)}</section>
    <div className="dashboard-grid"><section className="panel schedule-panel"><header className="panel-header"><div><span className="section-kicker">Schedule</span><h2>Today</h2></div><Link className="quiet-button" href="/calendar">Open calendar</Link></header>{events.length ? <div className="dashboard-list">{events.map((event) => <article key={event.id}><time>{formatTimeInZone(event.startsAt, event.timezone || timezone)}</time><div><h3>{event.title}</h3><p>{event.location || `${formatTimeInZone(event.startsAt, event.timezone || timezone)}–${formatTimeInZone(event.endsAt, event.timezone || timezone)}`}</p></div></article>)}</div> : <EmptyState icon={<CalendarDays size={21} />} title="A clear calendar" body="There are no events scheduled for today." action="Create an event" href="/calendar" />}</section><section className="panel attention-panel"><header className="panel-header"><div><span className="section-kicker">Priority queue</span><h2>Needs attention</h2></div><Link className="quiet-button" href="/tasks">Open tasks</Link></header>{attention.length ? <div className="attention-list">{attention.map((item) => <Link href={item.href} key={`${item.detail}-${item.id}`}><span className={`attention-dot ${item.tone}`} /><div><h3>{item.title}</h3><p>{item.detail}</p></div><ArrowRight size={14} /></Link>)}</div> : <EmptyState icon={<Check size={21} />} title="Nothing is waiting" body="There are no open tasks, due follow-ups, important emails, or unread alerts." action="Create a task" href="/tasks" />}</section></div>
  </AppShell>;
}
function EmptyState({ icon, title, body, action, href }: { icon: React.ReactNode; title: string; body: string; action: string; href: string }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{body}</p><Link className="secondary-button" href={href}>{action}</Link></div>; }
function formatTaskDate(value: Date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(value); }
