import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { moduleBySlug, modules } from "@/lib/navigation";
import { requireWorkspaceContext } from "@/lib/workspace";

export function generateStaticParams() {
  return modules.filter(({ slug }) => slug !== "dashboard" && slug !== "tasks").map(({ slug }) => ({ section: slug }));
}

export default async function ModulePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const moduleConfig = moduleBySlug(section);
  if (!moduleConfig || section === "dashboard") notFound();
  const Icon = moduleConfig.icon;
  const context = await requireWorkspaceContext();

  return (
    <AppShell workspaceName={context.organization.name} userName={context.user.name}>
      <div className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>{moduleConfig.label}</h1>
          <p className="page-subtitle">{moduleConfig.description}</p>
        </div>
        {moduleConfig.action && <button className="primary-button" type="button"><Plus size={16} />{moduleConfig.action}</button>}
      </div>
      <section className="panel module-empty">
        <div className="module-art"><Icon size={30} /></div>
        <span className="section-kicker">Ready when you are</span>
        <h2>{moduleConfig.emptyTitle}</h2>
        <p>{moduleConfig.emptyBody}</p>
        {moduleConfig.action && <button className="secondary-button" type="button">{moduleConfig.action}</button>}
      </section>
    </AppShell>
  );
}
