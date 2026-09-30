import { prisma } from "@/lib/prisma";
import { personalWorkspaceSlug } from "@/lib/workspace-identity";

export async function ensureWorkspaceForUser(userId: string, userName: string) {
  const existing = await prisma.membership.findFirst({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (existing) return existing;

  return prisma.$transaction(async (transaction) => {
    const raced = await transaction.membership.findFirst({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });
    if (raced) return raced;

    const slug = personalWorkspaceSlug(userId);
    const organization = await transaction.organization.upsert({
      where: { slug },
      update: {},
      create: { name: `${userName.trim() || "My"}’s workspace`, slug },
    });

    const membership = await transaction.membership.upsert({
      where: { userId_organizationId: { userId, organizationId: organization.id } },
      update: {},
      create: { userId, organizationId: organization.id, role: "OWNER" },
      include: { organization: true },
    });

    await transaction.userProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    await transaction.activityLog.create({
      data: {
        organizationId: organization.id,
        actorUserId: userId,
        actorType: "user",
        action: "workspace.created",
        entityType: "organization",
        entityId: organization.id,
        source: "signup",
      },
    });

    return membership;
  });
}
