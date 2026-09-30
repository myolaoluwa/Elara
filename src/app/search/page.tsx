import { AppShell } from "@/components/app-shell";
import { GlobalSearch } from "@/components/global-search";
import { requireWorkspaceContext } from "@/lib/workspace";
export const metadata = { title: "Search" };
export default async function SearchPage() { const context = await requireWorkspaceContext(); return <AppShell workspaceName={context.organization.name} userName={context.user.name}><GlobalSearch /></AppShell>; }
