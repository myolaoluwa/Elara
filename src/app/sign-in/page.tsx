import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getWorkspaceContext()) redirect("/");
  return <AuthForm mode="sign-in" />;
}
