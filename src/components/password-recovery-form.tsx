"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function PasswordRecoveryForm({ mode, token, enabled }: { mode: "request" | "reset"; token?: string; enabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true); setMessage(null);
    try {
      if (mode === "request") {
        const email = String(new FormData(form).get("email") || "").trim().toLowerCase();
        const result = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
        if (result.error) throw new Error(result.error.message || "Unable to request a reset");
        setMessage("If an account exists for that address, a secure reset link is on its way.");
        setComplete(true);
      } else {
        if (!token) throw new Error("This reset link is missing or invalid.");
        const data = new FormData(form);
        const password = String(data.get("password") || "");
        if (password !== String(data.get("confirmPassword") || "")) throw new Error("Passwords do not match.");
        const result = await authClient.resetPassword({ newPassword: password, token });
        if (result.error) throw new Error(result.error.message || "Unable to reset the password");
        setMessage("Password updated. You can now sign in securely.");
        setComplete(true);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to complete the request."); } finally { setPending(false); }
  }
  return <main className="auth-page"><section className="auth-story"><Link href="/sign-in" className="brand auth-brand"><span className="brand-symbol">E</span><span>ELARA</span></Link><div><span className="auth-orbit"><Sparkles size={20} /></span><p className="eyebrow">Secure account recovery</p><h1>Return to the work that matters.</h1><p>Reset access without weakening the safeguards around your executive workspace.</p></div><p className="auth-footnote">Secure links · Existing sessions revoked</p></section><section className="auth-panel"><form className="auth-form" onSubmit={submit}><p className="eyebrow">{mode === "request" ? "Password recovery" : "Choose a new password"}</p><h2>{mode === "request" ? "Reset your access." : "Create a secure password."}</h2><p className="auth-intro">{mode === "request" ? "We will email a time-limited reset link if the account exists." : "Use at least 10 characters. Completing this reset signs out existing sessions."}</p>{!enabled ? <p className="form-error">Email delivery is not configured. Contact the workspace administrator.</p> : complete ? <><p className="auth-notice" role="status">{message}</p><Link className="auth-submit" href="/sign-in">Return to sign in<ArrowRight size={16} /></Link></> : <>{mode === "request" ? <label>Email address<input name="email" required type="email" autoComplete="email" maxLength={254} /></label> : <><label>New password<input name="password" required type="password" autoComplete="new-password" minLength={10} maxLength={128} /></label><label>Confirm password<input name="confirmPassword" required type="password" autoComplete="new-password" minLength={10} maxLength={128} /></label></>}{message && <p className="form-error" role="alert">{message}</p>}<button className="auth-submit" disabled={pending} type="submit">{pending ? <LoaderCircle className="spin" size={17} /> : <>{mode === "request" ? "Send reset link" : "Update password"}<ArrowRight size={16} /></>}</button></>}<p className="auth-switch"><Link href="/sign-in">Back to sign in</Link></p></form></section></main>;
}
