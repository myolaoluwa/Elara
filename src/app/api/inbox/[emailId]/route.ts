import { NextResponse } from "next/server";
import { z } from "zod";
import { getTextAIProvider } from "@/lib/ai/provider-factory";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";

const schema = z.object({ action: z.enum(["summarize", "draft-reply", "create-task"]) });

export async function POST(request: Request, { params }: { params: Promise<{ emailId: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { emailId } = await params;
  const email = await prisma.email.findFirst({ where: { id: emailId, organizationId: context.organization.id } });
  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  if (parsed.data.action === "create-task") {
    const task = await prisma.$transaction(async (transaction) => {
      const created = await transaction.task.create({
        data: {
          organizationId: context.organization.id,
          ownerId: context.user.id,
          title: `Respond: ${email.subject}`.slice(0, 180),
          notes: `From ${email.sender}\n\n${email.bodyText?.slice(0, 3000) || ""}`,
          sourceType: "email",
          sourceId: email.id,
        },
      });
      await transaction.activityLog.create({
        data: {
          organizationId: context.organization.id,
          actorUserId: context.user.id,
          actorType: "user",
          action: "email.task.created",
          entityType: "task",
          entityId: created.id,
          source: "inbox",
        },
      });
      return created;
    });
    return NextResponse.json({ task });
  }

  const isDraft = parsed.data.action === "draft-reply";
  const { provider } = getTextAIProvider();
  let text: string;
  if (provider) {
    const result = await provider.complete({
      intent: isDraft ? "chat" : "summarize",
      workspaceId: context.organization.id,
      messages: [
        {
          role: "system",
          content: isDraft
            ? "Draft a concise professional reply for EA review. Do not claim any action was completed and do not invent facts."
            : "Summarize this email using only its contents. Include requests, deadlines, and decisions if explicitly present.",
        },
        { role: "user", content: `Subject: ${email.subject}\nFrom: ${email.sender}\n\n${email.bodyText || ""}` },
      ],
    });
    text = result.text;
  } else {
    text = isDraft
      ? `Hi,\n\nThank you for your message regarding “${email.subject}.” I’m reviewing this and will follow up shortly.\n\nBest,`
      : (email.bodyText || "No message body available.").slice(0, 700);
  }

  await prisma.activityLog.create({
    data: {
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      actorType: "ai",
      action: isDraft ? "email.reply.drafted" : "email.summarized",
      entityType: "email",
      entityId: email.id,
      source: "inbox",
      approvalStatus: isDraft ? "PENDING" : "NOT_REQUIRED",
    },
  });
  return NextResponse.json({ text, draft: isDraft });
}
