import { redirect } from "next/navigation";
import { PasswordRecoveryForm } from "@/components/password-recovery-form";
import { isBrevoConfigured } from "@/lib/email/brevo";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Choose a new password" };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (await getWorkspaceContext()) redirect("/");
  const { token } = await searchParams;
  return <PasswordRecoveryForm mode="reset" token={token} enabled={isBrevoConfigured()} />;
}
