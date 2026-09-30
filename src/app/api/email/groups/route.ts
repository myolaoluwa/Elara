import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { RequestBodyError, enforceRateLimit, readJsonBody, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

const groupSchema = z.object({ name: z.string().trim().min(1).max(100), description: z.string().trim().max(500).optional(), contactIds: z.array(z.string().min(1).max(128)).max(100).default([]) });

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const groups = await prisma.contactGroup.findMany({ where: { organizationId: context.organization.id }, include: { members: { include: { contact: { select: { id: true, name: true, email: true } } } } }, orderBy: { name: "asc" } });
  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`email-groups:create:${context.user.id}`, 30, 5 * 60_000);
  if (limited) return limited;
  try {
    const input = groupSchema.parse(await readJsonBody(request, 20_000));
    const contacts = input.contactIds.length ? await prisma.contact.findMany({ where: { id: { in: input.contactIds }, organizationId: context.organization.id }, select: { id: true } }) : [];
    if (contacts.length !== new Set(input.contactIds).size) return NextResponse.json({ error: "One or more contacts do not belong to this workspace" }, { status: 400 });
    const group = await prisma.contactGroup.create({ data: { organizationId: context.organization.id, name: input.name, description: input.description || null, members: { create: contacts.map((contact) => ({ contactId: contact.id })) } }, include: { members: { include: { contact: true } } } });
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Invalid group" }, { status: 400 });
    if (error instanceof Error && error.message.includes("Unique constraint")) return NextResponse.json({ error: "A group with this name already exists" }, { status: 409 });
    return NextResponse.json({ error: "Unable to create group" }, { status: 500 });
  }
}
