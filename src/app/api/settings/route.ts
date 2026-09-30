import { NextResponse } from "next/server";
import { z } from "zod";
import { RequestBodyError, enforceRateLimit, readJsonBody, rejectCrossOrigin } from "@/lib/http/security";
import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  workspaceName: z.string().trim().min(1).max(120),
  executiveName: z.string().trim().min(1).max(120),
  executiveEmail: z.email().optional().or(z.literal("")),
  executiveTitle: z.string().trim().max(160).optional(),
  timezone: z.string().trim().min(1).max(80),
  workingHours: z.string().trim().max(1000).optional(),
  schedulingRules: z.string().trim().max(5000).optional(),
});

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["OWNER", "ADMIN", "EA"] as string[]).includes(context.role)) {
    return NextResponse.json({ error: "Insufficient permission" }, { status: 403 });
  }
  const limited = enforceRateLimit(`settings:${context.user.id}`, 20, 5 * 60_000);
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await readJsonBody(request, 10_000);
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid settings" }, { status: 400 });
  const value = parsed.data;

  await prisma.$transaction(async (transaction) => {
    await transaction.organization.update({ where: { id: context.organization.id }, data: { name: value.workspaceName } });
    const executive = await transaction.executive.findFirst({ where: { organizationId: context.organization.id } });
    const saved = executive
      ? await transaction.executive.update({
          where: { id: executive.id },
          data: { name: value.executiveName, email: value.executiveEmail || null, title: value.executiveTitle || null, timezone: value.timezone },
        })
      : await transaction.executive.create({
          data: { organizationId: context.organization.id, name: value.executiveName, email: value.executiveEmail || null, title: value.executiveTitle || null, timezone: value.timezone },
        });

    for (const [key, content] of [["working_hours", value.workingHours || ""], ["scheduling_rules", value.schedulingRules || ""]]) {
      await transaction.executivePreference.upsert({
        where: { executiveId_category_key: { executiveId: saved.id, category: "scheduling", key } },
        create: { executiveId: saved.id, category: "scheduling", key, valueJson: JSON.stringify(content) },
        update: { valueJson: JSON.stringify(content) },
      });
    }
    await transaction.activityLog.create({
      data: {
        organizationId: context.organization.id,
        actorUserId: context.user.id,
        actorType: "user",
        action: "settings.updated",
        entityType: "organization",
        entityId: context.organization.id,
        source: "settings",
      },
    });
  });
  return NextResponse.json({ ok: true });
}
