import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { getTextAIProvider } from "@/lib/ai/provider-factory";
import { buildWorkspaceContext, groundedFallback } from "@/lib/ai/workspace-context";
import { ELARA_AGENT_POLICY } from "@/lib/ai/agent-policy";
import { runEmailAgent } from "@/lib/ai/email-agent";
import { isEmailActionRequest } from "@/lib/ai/email-intent";
import { runWorkspaceActionAgent } from "@/lib/ai/workspace-action-agent";
import { isWorkspaceActionRequest } from "@/lib/ai/workspace-action-intent";
import { RequestBodyError, enforceRateLimit, readJsonBody, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

const inputSchema = z.object({ prompt: z.string().trim().min(1).max(8000), conversationId: z.string().max(128).optional().nullable() });

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const authContext = await getWorkspaceContext();
  if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(authContext.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`ai:chat:${authContext.user.id}`, 20, 60_000);
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await readJsonBody(request, 20_000);
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "A valid message is required" }, { status: 400 });

  const organizationId = authContext.organization.id;
  let conversation = parsed.data.conversationId ? await prisma.aIConversation.findFirst({ where: { id: parsed.data.conversationId, organizationId } }) : null;
  if (parsed.data.conversationId && !conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  conversation ??= await prisma.aIConversation.create({ data: { organizationId, title: parsed.data.prompt.slice(0, 80) } });
  await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "user", content: parsed.data.prompt } });
  const history = (await prisma.aIMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "desc" }, take: 20 })).reverse();
  const providerSelection = getTextAIProvider();
  const encoder = new TextEncoder();

  if (providerSelection.provider && isEmailActionRequest(parsed.data.prompt)) {
    try {
      const result = await runEmailAgent({ provider: providerSelection.provider, organizationId, user: authContext.user, prompt: parsed.data.prompt, history });
      if (result) {
        await prisma.$transaction([
          prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "assistant", content: result.text } }),
          prisma.aIConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } }),
          prisma.aIAction.create({ data: { organizationId, conversationId: conversation.id, toolName: `email_${result.action}`, permission: "EXECUTE", inputJson: JSON.stringify({ prompt: parsed.data.prompt }), resultJson: JSON.stringify({ count: result.count, status: result.action, rationale: result.reason }), approvalStatus: result.action === "draft" ? "PENDING" : "APPROVED", approverId: result.action === "draft" ? null : authContext.user.id, executedAt: result.action === "draft" ? null : new Date() } }),
        ]);
        return new Response(result.text, { headers: { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store", "x-conversation-id": conversation.id } });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "I could not prepare that email safely.";
      await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "assistant", content: message } });
      return new Response(message, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-conversation-id": conversation.id } });
    }
  }

  if (providerSelection.provider && isWorkspaceActionRequest(parsed.data.prompt)) {
    try {
      const result = await runWorkspaceActionAgent({
        provider: providerSelection.provider,
        organizationId,
        user: authContext.user,
        conversationId: conversation.id,
        prompt: parsed.data.prompt,
        history,
      });
      if (result) {
        await prisma.$transaction([
          prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "assistant", content: result.text } }),
          prisma.aIConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } }),
          prisma.activityLog.create({ data: { organizationId, actorUserId: authContext.user.id, actorType: "ai", action: "ai.workspace-actions.processed", entityType: "ai-conversation", entityId: conversation.id, source: "command", resultJson: JSON.stringify({ completed: result.results.filter((item) => item.ok).length, failed: result.results.filter((item) => !item.ok).length }) } }),
        ]);
        return new Response(result.text, { headers: { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store", "x-conversation-id": conversation.id } });
      }
    } catch {
      const message = "I couldn’t safely complete that workspace action. Please include the exact record, date, and time you want me to use.";
      await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "assistant", content: message } });
      return new Response(message, { headers: { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store", "x-conversation-id": conversation.id } });
    }
  }

  const snapshot = await buildWorkspaceContext(organizationId);

  const body = new ReadableStream({
    async start(controller) {
      let answer = "";
      try {
        if (providerSelection.provider) {
          const provider = providerSelection.provider;
          const instructions = `${ELARA_AGENT_POLICY}\n\nFor this response, answer only from the WORKSPACE DATA below. If information is absent, say you do not have it. Clearly distinguish confirmed records from inference. Never claim an external action was performed.\n\n<WORKSPACE_DATA>\n${JSON.stringify(snapshot)}\n</WORKSPACE_DATA>`;
          for await (const delta of provider.stream(history.map((item) => ({ role: item.role as "user" | "assistant", content: item.content })), instructions)) {
            answer += delta;
            controller.enqueue(encoder.encode(delta));
          }
        } else {
          answer = groundedFallback(parsed.data.prompt, snapshot);
          for (const part of answer.split(/(?<=\s)/)) controller.enqueue(encoder.encode(part));
        }
        await prisma.$transaction([
          prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "assistant", content: answer } }),
          prisma.aIConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } }),
          prisma.aIAction.create({ data: { organizationId, conversationId: conversation.id, toolName: "workspace_context", permission: "READ", inputJson: JSON.stringify({ prompt: parsed.data.prompt }), resultJson: JSON.stringify({ answer, provider: providerSelection.provider ? providerSelection.name : "grounded-fallback", model: providerSelection.model }) } }),
          prisma.activityLog.create({ data: { organizationId, actorUserId: authContext.user.id, actorType: "user", action: "ai.response.generated", entityType: "ai-conversation", entityId: conversation.id, source: "command" } }),
        ]);
        controller.close();
      } catch {
        controller.enqueue(encoder.encode("I couldn’t generate a grounded response. Please try again."));
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store", "x-conversation-id": conversation.id } });
}
