import { redirect } from "next/navigation";
import { PasswordRecoveryForm } from "@/components/password-recovery-form";
import { isBrevoConfigured } from "@/lib/email/brevo";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Reset password" };
export default async function ForgotPasswordPage() {
  if (await getWorkspaceContext()) redirect("/");
  return <PasswordRecoveryForm mode="request" enabled={isBrevoConfigured()} />;
}
