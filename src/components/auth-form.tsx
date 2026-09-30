"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Challenge = { type: "verify-email" | "new-device"; email: string };

export function AuthForm({ mode, otpEnabled }: { mode: "sign-in" | "sign-up"; otpEnabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const isSignUp = mode === "sign-up";

  function finishSignIn() {
    router.push("/");
    router.refresh();
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const data = new FormData(event.currentTarget);
      const email = String(data.get("email")).trim().toLowerCase();
      const password = String(data.get("password"));
      const result = isSignUp
        ? await authClient.signUp.email({ name: String(data.get("name")).trim(), email, password })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(result.error.message || "Authentication failed. Please try again.");
        return;
      }

      if (isSignUp && otpEnabled) {
        setChallenge({ type: "verify-email", email });
        setNotice(`We sent a six-digit verification code to ${email}.`);
        return;
      }

      const signInData = result.data as { twoFactorRedirect?: boolean } | null;
      if (!isSignUp && otpEnabled && signInData?.twoFactorRedirect) {
        const sent = await authClient.twoFactor.sendOtp({ trustDevice: true });
        if (sent.error) {
          setError(sent.error.message || "Unable to send the verification code.");
          return;
        }
        setChallenge({ type: "new-device", email });
        setNotice(`This device needs verification. We sent a six-digit code to ${email}.`);
        return;
      }

      finishSignIn();
    } catch {
      setError("Unable to reach Elara. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function submitOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    setPending(true);
    setError(null);
    try {
      const code = String(new FormData(event.currentTarget).get("otp")).replace(/\D/g, "");
      const result = challenge.type === "verify-email"
        ? await authClient.emailOtp.verifyEmail({ email: challenge.email, otp: code })
        : await authClient.twoFactor.verifyOtp({ code, trustDevice: true });
      if (result.error) {
        setError(result.error.message || "That verification code is invalid or expired.");
        return;
      }
      finishSignIn();
    } catch {
      setError("Unable to verify the code. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function resendOTP() {
    if (!challenge || pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = challenge.type === "verify-email"
        ? await authClient.emailOtp.sendVerificationOtp({ email: challenge.email, type: "email-verification" })
        : await authClient.twoFactor.sendOtp({ trustDevice: true });
      if (result.error) {
        setError(result.error.message || "Unable to resend the verification code.");
        return;
      }
      setNotice(`A new code was sent to ${challenge.email}.`);
    } catch {
      setError("Unable to resend the code. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link href="/sign-in" className="brand auth-brand"><span className="brand-symbol">E</span><span>ELARA</span></Link>
        <div>
          <span className="auth-orbit"><Sparkles size={20} /></span>
          <p className="eyebrow">Executive operations, composed</p>
          <h1>The work behind the work, finally in one place.</h1>
          <p>Keep meetings, communication, tasks, and commitments connected—without losing human control.</p>
        </div>
        <p className="auth-footnote">Private by design · Actions stay supervised</p>
      </section>
      <section className="auth-panel">
        {challenge ? (
          <form className="auth-form" onSubmit={submitOTP}>
            <button className="auth-back" type="button" onClick={() => { setChallenge(null); setError(null); setNotice(null); }}><ArrowLeft size={14} />Back</button>
            <p className="eyebrow">Identity verification</p>
            <h2>Enter your code.</h2>
            <p className="auth-intro">Use the six-digit code sent to <strong>{challenge.email}</strong>. It expires in five minutes.</p>
            <label>Verification code<input name="otp" required autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="000000" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="auth-notice" role="status">{notice}</p>}
            <button className="auth-submit" disabled={pending} type="submit">
              {pending ? <LoaderCircle className="spin" size={17} /> : <>Verify and continue<ArrowRight size={16} /></>}
            </button>
            <button className="auth-resend" disabled={pending} type="button" onClick={resendOTP}>Send a new code</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submitCredentials}>
            <p className="eyebrow">{isSignUp ? "Create your workspace" : "Welcome back"}</p>
            <h2>{isSignUp ? "Begin with clarity." : "Sign in to Elara."}</h2>
            <p className="auth-intro">{isSignUp ? "Your verified account receives its own private workspace." : "Your session stays active; new devices require an emailed code."}</p>
            {isSignUp && <label>Full name<input name="name" required autoComplete="name" maxLength={100} placeholder="Racheal Adams" /></label>}
            <label>Email address<input name="email" required type="email" autoComplete="email" maxLength={254} placeholder="you@company.com" /></label>
            <label>Password<input name="password" required type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={10} maxLength={128} placeholder="At least 10 characters" /></label>
            {!isSignUp && <Link className="auth-resend" href="/forgot-password">Forgot password?</Link>}
            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="auth-notice" role="status">{notice}</p>}
            <button className="auth-submit" disabled={pending} type="submit">
              {pending ? <LoaderCircle className="spin" size={17} /> : <>{isSignUp ? "Create workspace" : "Sign in"}<ArrowRight size={16} /></>}
            </button>
            <p className="auth-switch">
              {isSignUp ? "Already have an account?" : "New to Elara?"}{" "}
              <Link href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create a workspace"}</Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
