"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("demo@signalsf.local");
  const [password, setPassword] = useState("demo12345");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ email, password, displayName: displayName || email.split("@")[0] });
      }
      router.push("/onboarding");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Authentication failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <section className="auth-layout">
        <div>
          <p className="eyebrow">Signal SF account</p>
          <h1>Keep your event graph synced.</h1>
          <p className="lead">
            Your goals, saved events, and itinerary now live in the backend session instead of browser storage.
          </p>
          <div className="panel auth-note">
            <h3>Demo access</h3>
            <p className="subtle">Use the seeded demo account to test the integrated flow.</p>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setMode("login");
                setEmail("demo@signalsf.local");
                setPassword("demo12345");
              }}
            >
              Fill demo login
            </button>
          </div>
        </div>
        <form className="panel form-panel" onSubmit={submit}>
          <div className="segmented" aria-label="Authentication mode">
            <button className={mode === "login" ? "selected" : ""} type="button" onClick={() => setMode("login")}>
              Login
            </button>
            <button className={mode === "register" ? "selected" : ""} type="button" onClick={() => setMode("register")}>
              Register
            </button>
          </div>

          {mode === "register" ? (
            <label className="field">
              <span>Display name</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Alice Peng" />
            </label>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          {error ? <div className="error inline">{error}</div> : null}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
