"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { laneCards, mapBackendCard } from "@/lib/backend";
import type { BackendEventCard, BackendProfileInsights, BootstrapPayload } from "@/lib/backend-types";
import type { EventCard as EventCardType, UserProfile } from "@/lib/types";

const fallbackProfile: UserProfile = {
  onboardingCompleted: false,
  primaryGoals: [],
  currentStage: "exploring",
  experienceLevel: "intermediate",
  targetRoles: [],
  skills: [],
  networkingIntent: "",
  preferredCompanyStage: "",
  bio: "",
  resumeText: "",
  cityHint: "San Francisco",
};

const fallbackInsights: BackendProfileInsights = {
  inferredThemes: [],
  hasResumeContext: false,
  profileCompletenessScore: 0,
};

export default function LandingPage() {
  const { status, login, register } = useAuth();
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"login" | "register" | "">("");

  useEffect(() => {
    if (status !== "authenticated") {
      setBootstrap(null);
      return;
    }

    let active = true;
    api
      .bootstrap()
      .then((payload) => {
        if (active) setBootstrap(payload);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load your dashboard.");
      });

    return () => {
      active = false;
    };
  }, [status]);

  const profile = useMemo(() => bootstrap?.profile ?? fallbackProfile, [bootstrap]);
  const profileInsights = useMemo(() => bootstrap?.profileInsights ?? fallbackInsights, [bootstrap]);
  const picks = useMemo<EventCardType[]>(
    () => bootstrap?.recommendations.slice(0, 3).map((event: BackendEventCard) => mapBackendCard(event)) ?? [],
    [bootstrap],
  );
  const lanes = useMemo(() => laneCards(bootstrap?.recommendationLanes ?? []).slice(0, 3), [bootstrap]);

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>, mode: "login" | "register") {
    event.preventDefault();
    setError("");
    setIsSubmitting(mode);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        const displayName = String(form.get("displayName") ?? "").trim() || email.split("@")[0];
        await register({ email, password, displayName });
      }
      const payload = await api.bootstrap();
      setBootstrap(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setIsSubmitting("");
    }
  }

  return (
    <AppShell>
      <section className="hero">
        <div>
          <p className="eyebrow">San Francisco only</p>
          <h1>Find the SF plan that actually fits your goals.</h1>
          <p className="lead">
            SF Buddy starts with who you are and what you want right now, then turns that into a short list of events and a day plan that actually feels doable.
          </p>
          <div className="actions">
            {status === "authenticated" ? (
              <>
                <Link className="button" href="/onboarding">
                  Build my setup
                </Link>
                <Link className="button secondary" href="/discover">
                  Browse recommendations
                </Link>
              </>
            ) : (
              <>
                <a className="button" href="#auth-panel">
                  Sign in to start
                </a>
                <Link className="button secondary" href="/auth">
                  Open auth page
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="panel">
          {status === "authenticated" && bootstrap ? (
            <>
              <p className="eyebrow">Your profile snapshot</p>
              <h2>{bootstrap.user.displayName}</h2>
              <p className="subtle">
                Goals: {profile.primaryGoals.join(", ") || "not set"}.
                {" "}Themes: {profileInsights.inferredThemes.join(", ") || "still learning from your profile"}.
              </p>
              <div className="grid">
                {lanes.map((lane) => (
                  <div key={lane.key}>
                    <h3>{lane.title}</h3>
                    <p className="subtle">{lane.description}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">How it works</p>
              <h2>Profile first, events second.</h2>
              <div className="grid">
                <div>
                  <h3>1. Start with your situation</h3>
                  <p className="subtle">Learning, job search, startup energy, or meeting tech people all change what counts as a good recommendation.</p>
                </div>
                <div>
                  <h3>2. Save what feels real</h3>
                  <p className="subtle">Every event card explains why it is ranked instead of showing a generic city calendar.</p>
                </div>
                <div>
                  <h3>3. Build one solid day</h3>
                  <p className="subtle">Saved events become a plan with overlap and travel warnings before you commit.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {status !== "authenticated" ? (
        <section className="section" id="auth-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Account access</p>
              <h2>Connect to the real backend</h2>
            </div>
          </div>
          {error ? <div className="error inline">{error}</div> : null}
          <div className="grid two">
            <form className="panel form-panel" onSubmit={(event) => void handleAuthSubmit(event, "login")}>
              <h3>Login</h3>
              <p className="subtle">Use the seeded demo account or your own account to unlock saved events and itineraries.</p>
              <div className="form-stack compact-stack">
                <input className="field-input" name="email" type="email" placeholder="Email" defaultValue="demo@signalsf.local" required />
                <input className="field-input" name="password" type="password" placeholder="Password" defaultValue="demo12345" required />
                <button className="button" type="submit" disabled={isSubmitting !== ""}>
                  {isSubmitting === "login" ? "Signing in..." : "Login"}
                </button>
              </div>
            </form>
            <form className="panel form-panel" onSubmit={(event) => void handleAuthSubmit(event, "register")}>
              <h3>Create account</h3>
              <p className="subtle">Registration is already wired to the backend session flow, so frontend and backend stay in sync.</p>
              <div className="form-stack compact-stack">
                <input className="field-input" name="displayName" type="text" placeholder="Display name" />
                <input className="field-input" name="email" type="email" placeholder="Email" required />
                <input className="field-input" name="password" type="password" placeholder="Password" minLength={8} required />
                <button className="button" type="submit" disabled={isSubmitting !== ""}>
                  {isSubmitting === "register" ? "Creating..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Recommendation preview</p>
            <h2>Short, personal, and usable.</h2>
          </div>
          <Link className="button secondary" href="/discover">
            Open Discover
          </Link>
        </div>
        {error && status === "authenticated" ? <div className="error inline">{error}</div> : null}
        <div className="grid three">
          {picks.map((event) => (
            <EventCard key={event.id} event={event} isSaved={event.saved} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
