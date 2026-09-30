import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensureWorkspaceForUser } from "@/lib/workspace-bootstrap";

export async function getWorkspaceContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const membership = await ensureWorkspaceForUser(session.user.id, session.user.name);
  return {
    user: session.user,
    organization: membership.organization,
    role: membership.role,
  };
}

export async function requireWorkspaceContext() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/sign-in");
  return context;
}
