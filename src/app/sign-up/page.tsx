import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getWorkspaceContext } from "@/lib/workspace";
import { isBrevoConfigured } from "@/lib/email/brevo";

export const metadata = { title: "Create account" };

export default async function SignUpPage() {
  if (await getWorkspaceContext()) redirect("/");
  return <AuthForm mode="sign-up" otpEnabled={isBrevoConfigured()} />;
}
