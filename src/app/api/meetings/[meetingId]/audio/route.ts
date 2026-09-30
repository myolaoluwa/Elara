import { NextResponse } from "next/server";
import { OpenAIProvider } from "@/lib/ai/openai-provider";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";

const audioTypes = new Set(["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/webm", "video/mp4"]);
export async function POST(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const context = await getWorkspaceContext(); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { meetingId } = await params; const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, organizationId: context.organization.id } }); if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Configure OPENAI_API_KEY to transcribe audio, or paste a transcript manually." }, { status: 503 });
  const form = await request.formData(); const file = form.get("audio"); if (!(file instanceof File)) return NextResponse.json({ error: "Choose an audio file" }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Audio files must be 25 MB or smaller" }, { status: 400 });
  if (!audioTypes.has(file.type)) return NextResponse.json({ error: "Use MP3, MP4, M4A, WAV, or WebM audio" }, { status: 400 });
  try { const text = await new OpenAIProvider(process.env.OPENAI_API_KEY).transcribe(file); const transcript = await prisma.transcription.create({ data: { meetingId, provider: "openai", status: "complete", text } }); await prisma.activityLog.create({ data: { organizationId: context.organization.id, actorUserId: context.user.id, actorType: "ai", action: "meeting.audio.transcribed", entityType: "meeting", entityId: meetingId, source: "meeting" } }); return NextResponse.json({ transcript }); } catch { return NextResponse.json({ error: "Audio transcription failed" }, { status: 502 }); }
}
