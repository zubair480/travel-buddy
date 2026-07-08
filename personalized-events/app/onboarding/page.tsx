"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import { toPreferences, toProfile } from "@/lib/adapters";
import type { BootstrapPayload } from "@/lib/backend-types";
import type { UserPreferences, UserProfile } from "@/lib/types";
import { useApiResource } from "@/hooks/useApiResource";

const goalOptions = [
  ["learn", "Learn"],
  ["find_job", "Find a job"],
  ["build_startup", "Build a startup"],
  ["connect_in_tech", "Meet tech people"],
  ["find_cofounder", "Find a cofounder"],
  ["hire_people", "Hire people"],
] as const;

const stageOptions = ["exploring", "student", "job-search", "founder", "operator", "career-change"];
const experienceOptions = ["beginner", "intermediate", "senior", "executive"];
const dayPartOptions = ["morning", "afternoon", "evening", "late"] as const;
const dayOptions = [
  [1, "Weekdays"],
  [5, "Friday"],
  [6, "Saturday"],
  [0, "Sunday"],
] as const;

function toggle<T>(items: T[], item: T) {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

function fromCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data, error, isLoading, refresh } = useApiResource<BootstrapPayload>(() => api.bootstrap(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data && !profile && !preferences) {
      setProfile(toProfile(data.profile));
      setPreferences(toPreferences(data.preferences));
    }
  }, [data, profile, preferences]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || !preferences) return;
    setFormError("");
    setMessage("");
    if (profile.primaryGoals.length === 0) {
      setFormError("Choose at least one primary goal so recommendations have a clear signal.");
      return;
    }
    if (!profile.bio.trim() && !profile.resumeText.trim()) {
      setFormError("Add a short bio or CV summary so the app has useful context.");
      return;
    }

    setIsSaving(true);
    try {
      await api.updateProfile({ ...profile, onboardingCompleted: true, cityHint: "San Francisco" });
      await api.updatePreferences(preferences);
      setMessage("Profile saved. Your discovery feed is ready.");
      router.push("/discover");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not save onboarding.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <RequireAuth>
        {isLoading ? <LoadingState label="Loading your profile..." /> : null}
        {error ? <ErrorState label={error} action={<button className="button secondary" onClick={refresh}>Retry</button>} /> : null}
        {!isLoading && !error && (!profile || !preferences) ? <EmptyState title="Profile unavailable" body="The backend did not return profile data for this session." /> : null}
        {profile && preferences && data ? (
          <section className="onboarding wide">
            <p className="eyebrow">Profile-first setup</p>
            <h1>Tell Fogline what kind of SF week you are building.</h1>
            <p className="lead">The backend uses this context to boost events for learning, job search, startups, and tech networking.</p>

            <form className="stepper form-stack" onSubmit={submit}>
              <div className="progress">
                <span style={{ width: profile.primaryGoals.length && (profile.bio || profile.resumeText) ? "100%" : "58%" }} />
              </div>

              <section>
                <h2>Goals</h2>
                <p className="subtle">Pick every goal that should influence ranking.</p>
                <div className="pill-row">
                  {goalOptions.map(([value, label]) => (
                    <button key={value} className={`chip ${profile.primaryGoals.includes(value) ? "selected" : ""}`} type="button" onClick={() => setProfile({ ...profile, primaryGoals: toggle(profile.primaryGoals, value) })}>
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid two">
                <label className="field">
                  <span>Current stage</span>
                  <select value={profile.currentStage} onChange={(event) => setProfile({ ...profile, currentStage: event.target.value })}>
                    {stageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Experience level</span>
                  <select value={profile.experienceLevel} onChange={(event) => setProfile({ ...profile, experienceLevel: event.target.value })}>
                    {experienceOptions.map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
              </section>

              <section className="grid two">
                <label className="field">
                  <span>Target roles</span>
                  <input value={profile.targetRoles.join(", ")} onChange={(event) => setProfile({ ...profile, targetRoles: fromCommaList(event.target.value) })} placeholder="frontend engineer, product, founder" />
                </label>
                <label className="field">
                  <span>Skills</span>
                  <input value={profile.skills.join(", ")} onChange={(event) => setProfile({ ...profile, skills: fromCommaList(event.target.value) })} placeholder="React, AI, design systems" />
                </label>
              </section>

              <label className="field">
                <span>Networking intent</span>
                <input value={profile.networkingIntent} onChange={(event) => setProfile({ ...profile, networkingIntent: event.target.value })} placeholder="Meet founders, talk to recruiters, find study partners..." />
              </label>

              <label className="field">
                <span>Bio</span>
                <textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} rows={4} placeholder="A short human summary of who you are and what you are exploring in SF." />
              </label>

              <label className="field">
                <span>CV or resume summary</span>
                <textarea value={profile.resumeText} onChange={(event) => setProfile({ ...profile, resumeText: event.target.value })} rows={5} placeholder="Paste a compact resume, LinkedIn summary, or project background." />
              </label>

              <section>
                <h2>Event taste</h2>
                <div className="grid two">
                  <div>
                    <h3>Interests</h3>
                    <div className="pill-row">
                      {data.categories.map((category) => (
                        <button key={category} className={`chip ${preferences.interests.includes(category) ? "selected" : ""}`} type="button" onClick={() => setPreferences({ ...preferences, interests: toggle(preferences.interests, category) })}>
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3>Preferred neighborhoods</h3>
                    <div className="pill-row">
                      {data.neighborhoods.map((neighborhood) => (
                        <button key={neighborhood.slug} className={`chip ${preferences.preferredNeighborhoodSlugs.includes(neighborhood.slug) ? "selected" : ""}`} type="button" onClick={() => setPreferences({ ...preferences, preferredNeighborhoodSlugs: toggle(preferences.preferredNeighborhoodSlugs, neighborhood.slug) })}>
                          {neighborhood.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid two">
                <div>
                  <h3>Days</h3>
                  <div className="pill-row">
                    {dayOptions.map(([value, label]) => (
                      <button key={value} className={`chip ${preferences.preferredDaysOfWeek.includes(value) ? "selected" : ""}`} type="button" onClick={() => setPreferences({ ...preferences, preferredDaysOfWeek: toggle(preferences.preferredDaysOfWeek, value) })}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Time of day</h3>
                  <div className="pill-row">
                    {dayPartOptions.map((part) => (
                      <button key={part} className={`chip ${preferences.preferredDayParts.includes(part) ? "selected" : ""}`} type="button" onClick={() => setPreferences({ ...preferences, preferredDayParts: toggle(preferences.preferredDayParts, part) })}>
                        {part}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid two">
                <label className="field">
                  <span>Budget max</span>
                  <select value={preferences.budgetMaxCents} onChange={(event) => setPreferences({ ...preferences, budgetMaxCents: Number(event.target.value) })}>
                    <option value={0}>Free only</option>
                    <option value={2500}>Under $25</option>
                    <option value={7500}>Under $75</option>
                    <option value={15000}>Splurge ok</option>
                  </select>
                </label>
                <label className="field">
                  <span>Group context</span>
                  <select value={preferences.groupContext} onChange={(event) => setPreferences({ ...preferences, groupContext: event.target.value })}>
                    <option value="solo">Solo</option>
                    <option value="date">Date</option>
                    <option value="friends">Friends</option>
                    <option value="family">Family</option>
                    <option value="colleagues">Colleagues</option>
                  </select>
                </label>
              </section>

              {formError ? <div className="error inline">{formError}</div> : null}
              {message ? <div className="success inline">{message}</div> : null}

              <div className="actions">
                <button className="button" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save and discover"}
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </RequireAuth>
    </AppShell>
  );
}
