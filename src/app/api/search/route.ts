import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/http/security";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = enforceRateLimit(`search:${context.user.id}`, 60, 60_000);
  if (limited) return limited;
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 200);
  if (!query) return NextResponse.json({ results: [] });
  const organizationId = context.organization.id;
  const [tasks, contacts, meetings, emails, documents, decisions] = await Promise.all([
    prisma.task.findMany({ where: { organizationId, OR: [{ title: { contains: query } }, { notes: { contains: query } }] }, take: 10 }),
    prisma.contact.findMany({ where: { organizationId, OR: [{ name: { contains: query } }, { email: { contains: query } }, { notes: { contains: query } }] }, take: 10 }),
    prisma.meeting.findMany({ where: { organizationId, OR: [{ title: { contains: query } }, { agenda: { contains: query } }] }, take: 10 }),
    prisma.email.findMany({ where: { organizationId, OR: [{ subject: { contains: query } }, { sender: { contains: query } }, { bodyText: { contains: query } }] }, take: 10 }),
    prisma.document.findMany({ where: { organizationId, OR: [{ name: { contains: query } }, { extractedText: { contains: query } }] }, take: 10 }),
    prisma.decision.findMany({ where: { organizationId, OR: [{ title: { contains: query } }, { rationale: { contains: query } }] }, take: 10 }),
  ]);
  return NextResponse.json({ results: [
    ...tasks.map((item) => ({ id: item.id, type: "Task", title: item.title, excerpt: item.notes?.slice(0, 220), href: "/tasks" })),
    ...contacts.map((item) => ({ id: item.id, type: "Contact", title: item.name, excerpt: item.email, href: "/contacts" })),
    ...meetings.map((item) => ({ id: item.id, type: "Meeting", title: item.title, excerpt: item.agenda?.slice(0, 220), href: `/meetings/${item.id}` })),
    ...emails.map((item) => ({ id: item.id, type: "Email", title: item.subject, excerpt: item.bodyText?.slice(0, 220), href: "/inbox" })),
    ...documents.map((item) => ({ id: item.id, type: "Document", title: item.name, excerpt: item.extractedText?.slice(0, 220), href: `/api/documents/${item.id}` })),
    ...decisions.map((item) => ({ id: item.id, type: "Decision", title: item.title, excerpt: item.rationale?.slice(0, 220), href: "/memory" })),
  ] }, { headers: { "cache-control": "private, no-store" } });
}
