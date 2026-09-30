import { Activity, Bot, Brain, CalendarDays, CheckSquare2, FileText, Inbox, LayoutDashboard, MessageSquareText, Search, Settings, Users, Video, Workflow } from "lucide-react";

export const modules = [
  { slug: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "A focused view of today’s executive operations.", emptyTitle: "Your day starts here", emptyBody: "Connect your work to create a grounded daily view.", action: null },
  { slug: "command", label: "Command center", icon: MessageSquareText, description: "Ask questions and prepare actions using workspace context.", emptyTitle: "Ask with confidence", emptyBody: "Elara’s answers will be grounded in connected workspace data, with approval required before important actions.", action: "Start a conversation" },
  { slug: "inbox", label: "Inbox", icon: Inbox, description: "Prioritize communication and turn messages into action.", emptyTitle: "Bring the important messages closer", emptyBody: "Connect an email account to summarize threads, find deadlines, and draft replies for review.", action: "Connect email" },
  { slug: "calendar", label: "Calendar", icon: CalendarDays, description: "Coordinate the executive’s time with context and guardrails.", emptyTitle: "Connect a calendar", emptyBody: "Events, conflicts, preparation gaps, and scheduling preferences will appear here.", action: "Connect calendar" },
  { slug: "meetings", label: "Meetings", icon: Video, description: "Prepare, capture, and follow through on every meeting.", emptyTitle: "No meetings captured yet", emptyBody: "Connected calendar events and uploaded recordings will become searchable meeting records.", action: "Add a meeting" },
  { slug: "tasks", label: "Tasks", icon: CheckSquare2, description: "Track work, ownership, deadlines, and source context.", emptyTitle: "No open tasks", emptyBody: "Create a task manually or, later, extract one from meetings, email, and documents.", action: "Create task" },
  { slug: "follow-ups", label: "Follow-ups", icon: Workflow, description: "Keep promises, replies, approvals, and requests from slipping.", emptyTitle: "Nothing needs a follow-up", emptyBody: "Pending responses and commitments will appear here with their original context.", action: "Create follow-up" },
  { slug: "contacts", label: "Contacts", icon: Users, description: "Build durable context around people, companies, and relationships.", emptyTitle: "Add the people who matter", emptyBody: "Contact records will connect meetings, tasks, decisions, and communication over time.", action: "Add contact" },
  { slug: "documents", label: "Documents", icon: FileText, description: "Keep executive documents organized and ready for analysis.", emptyTitle: "No documents yet", emptyBody: "Upload a file to keep it with the workspace. Analysis is only generated from its actual contents.", action: "Upload document" },
  { slug: "memory", label: "Memory", icon: Brain, description: "Keep projects, decisions, and commitments connected.", emptyTitle: "Memory starts with confirmed facts", emptyBody: "Add a project, decision, or commitment to make it available across Elara.", action: "Add memory" },
  { slug: "search", label: "Global search", icon: Search, description: "Search the workspace without losing source context.", emptyTitle: "Search your workspace", emptyBody: "Find matching tasks, contacts, meetings, email, documents, and decisions.", action: null },
  { slug: "activity", label: "Activity", icon: Activity, description: "Review user and AI actions across the workspace.", emptyTitle: "No activity yet", emptyBody: "Important actions and approvals will appear here.", action: null },
  { slug: "automations", label: "Automations", icon: Bot, description: "Review and control repeatable AI-assisted workflows.", emptyTitle: "Automation stays supervised", emptyBody: "Configured workflows will show their trigger, actions, approvals, and complete audit history here.", action: "Create automation" },
  { slug: "settings", label: "Settings", icon: Settings, description: "Manage workspace, executive preferences, people, and access.", emptyTitle: "Shape how Elara works", emptyBody: "Workspace preferences and secure integrations will be configured here.", action: "Configure workspace" },
] as const;

export function moduleBySlug(slug: string) {
  return modules.find((module) => module.slug === slug);
}
