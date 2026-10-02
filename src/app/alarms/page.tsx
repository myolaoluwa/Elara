import { AlarmManager } from "@/components/alarm-manager";
import { AppShell } from "@/components/app-shell";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Alarms" };

export default async function AlarmPage() {
  const context = await requireWorkspaceContext();

  return (
    <AppShell workspaceName={context.organization.name} userName={context.user.name}>
      <div className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Alerts</p>
          <h1>Alarms</h1>
          <p className="page-subtitle">Set personal alarms outside task and meeting reminders, with server-scheduled browser push.</p>
        </div>
      </div>
      <AlarmManager />
    </AppShell>
  );
}
