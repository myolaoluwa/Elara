import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { analyzeTranscript, meetingAnalysisSchema } from "@/lib/meetings/analysis";
import { RequestBodyError, enforceRateLimit, readJsonBody, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save-transcript"), transcript: z.string().trim().min(1).max(200_000) }),
  z.object({ action: z.literal("analyze") }),
  z.object({ action: z.literal("create-tasks") }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`meetings:action:${context.user.id}`, 30, 5 * 60_000);
  if (limited) return limited;
  const { meetingId } = await params;
  const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, organizationId: context.organization.id }, include: { transcriptions: { orderBy: { createdAt: "desc" } }, notes: true } });
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  let raw: unknown;
  try {
    raw = await readJsonBody(request, 550_000);
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid meeting action" }, { status: 400 });

  if (parsed.data.action === "save-transcript") {
    const transcript = await prisma.transcription.create({ data: { meetingId, provider: "manual", status: "complete", text: parsed.data.transcript } });
    await log(context.organization.id, context.user.id, meetingId, "meeting.transcript.saved");
    return NextResponse.json({ transcript });
  }

  if (parsed.data.action === "analyze") {
    const transcript = meeting.transcriptions[0]?.text;
    if (!transcript) return NextResponse.json({ error: "Add a transcript before generating minutes" }, { status: 400 });
    const analysis = await analyzeTranscript(transcript.slice(0, 200_000));
    await prisma.$transaction([
      prisma.meetingNote.deleteMany({ where: { meetingId, kind: { in: ["ai_summary", "decisions", "action_items", "questions", "next_steps"] }, confirmed: false } }),
      prisma.meetingNote.createMany({ data: [
        { meetingId, kind: "ai_summary", content: analysis.summary },
        { meetingId, kind: "decisions", content: JSON.stringify(analysis.decisions) },
        { meetingId, kind: "action_items", content: JSON.stringify(analysis.actionItems) },
        { meetingId, kind: "questions", content: JSON.stringify(analysis.questions) },
        { meetingId, kind: "next_steps", content: JSON.stringify(analysis.nextSteps) },
      ] }),
      prisma.activityLog.create({ data: { organizationId: context.organization.id, actorUserId: context.user.id, actorType: "ai", action: "meeting.minutes.generated", entityType: "meeting", entityId: meetingId, source: "meeting", approvalStatus: "PENDING" } }),
    ]);
    return NextResponse.json({ analysis });
  }

  const actionNote = meeting.notes.find((note) => note.kind === "action_items" && !note.confirmed);
  if (!actionNote) return NextResponse.json({ error: "There are no pending meeting tasks to approve" }, { status: 409 });
  let actionItems: z.infer<typeof meetingAnalysisSchema>["actionItems"];
  try {
    actionItems = meetingAnalysisSchema.shape.actionItems.parse(JSON.parse(actionNote.content));
  } catch {
    return NextResponse.json({ error: "The saved action items are invalid. Generate the minutes again." }, { status: 409 });
  }
  const created = await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.meetingNote.updateMany({ where: { id: actionNote.id, confirmed: false }, data: { confirmed: true } });
    if (claimed.count === 0) return null;
    const tasks = [];
    for (const item of actionItems) tasks.push(await transaction.task.create({ data: { organizationId: context.organization.id, ownerId: context.user.id, title: item.task.slice(0, 180), notes: item.owner ? `Extracted owner: ${item.owner}` : null, sourceType: "meeting", sourceId: meetingId } }));
    await transaction.meetingNote.updateMany({ where: { meetingId, kind: { in: ["ai_summary", "decisions", "action_items", "questions", "next_steps"] } }, data: { confirmed: true } });
    await transaction.activityLog.create({ data: { organizationId: context.organization.id, actorUserId: context.user.id, actorType: "user", action: "meeting.tasks.approved", entityType: "meeting", entityId: meetingId, source: "meeting", approvalStatus: "APPROVED", resultJson: JSON.stringify({ taskCount: tasks.length }) } });
    return tasks;
  });
  if (!created) return NextResponse.json({ error: "These meeting tasks were already approved" }, { status: 409 });
  return NextResponse.json({ tasks: created });
}

async function log(organizationId: string, userId: string, meetingId: string, action: string) {
  await prisma.activityLog.create({ data: { organizationId, actorUserId: userId, actorType: "user", action, entityType: "meeting", entityId: meetingId, source: "meeting" } });
}
