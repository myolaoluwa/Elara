"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));

    const result = isSignUp
      ? await authClient.signUp.email({ name: String(data.get("name")), email, password })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message || "Authentication failed. Please try again.");
      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
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
        <form className="auth-form" onSubmit={submit}>
          <p className="eyebrow">{isSignUp ? "Create your workspace" : "Welcome back"}</p>
          <h2>{isSignUp ? "Begin with clarity." : "Sign in to Elara."}</h2>
          <p className="auth-intro">{isSignUp ? "Your private executive workspace will be created automatically." : "Return to your executive workspace."}</p>
          {isSignUp && <label>Full name<input name="name" required autoComplete="name" maxLength={100} placeholder="Racheal Adams" /></label>}
          <label>Email address<input name="email" required type="email" autoComplete="email" placeholder="you@company.com" /></label>
          <label>Password<input name="password" required type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={10} placeholder="At least 10 characters" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={pending} type="submit">
            {pending ? <LoaderCircle className="spin" size={17} /> : <>{isSignUp ? "Create workspace" : "Sign in"}<ArrowRight size={16} /></>}
          </button>
          <p className="auth-switch">
            {isSignUp ? "Already have an account?" : "New to Elara?"}{" "}
            <Link href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create a workspace"}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
