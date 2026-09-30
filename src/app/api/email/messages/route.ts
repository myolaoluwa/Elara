import { NextResponse } from "next/server";
import { z } from "zod";
import { createOutboundEmails, recipientsForSelection } from "@/lib/email/outbound";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { RequestBodyError, enforceRateLimit, readJsonBody, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

const composeSchema = z.object({
  groupId: z.string().max(128).optional(),
  contactIds: z.array(z.string().max(128)).max(100).optional(),
  recipients: z.array(z.object({ name: z.string().trim().min(1).max(120), email: z.email() })).max(100).optional(),
  subject: z.string().trim().min(1).max(200),
  bodyText: z.string().trim().min(1).max(50_000),
  action: z.enum(["draft", "send", "schedule"]),
  scheduledAt: z.iso.datetime().optional(),
  threadId: z.string().max(256).optional(),
});

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const messages = await prisma.outboundEmail.findMany({ where: { organizationId: context.organization.id, createdById: context.user.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, toEmail: true, toName: true, subject: true, status: true, scheduledAt: true, sentAt: true, lastError: true, createdAt: true } });
  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`email:compose:${context.user.id}`, 30, 5 * 60_000);
  if (limited) return limited;
  try {
    const input = composeSchema.parse(await readJsonBody(request, 100_000));
    const recipients = await recipientsForSelection(context.organization.id, input);
    const messages = await createOutboundEmails(context.organization.id, context.user, { subject: input.subject, bodyText: input.bodyText, recipients, action: input.action, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined, threadId: input.threadId });
    return NextResponse.json({ messages }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Invalid email" }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare email" }, { status: 400 });
  }
}
