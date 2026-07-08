"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import type { BudgetLevel, PreferredDay, SocialContext, TimeOfDay, UserPreferences, UserProfile } from "@/lib/types";
import { useApiResource } from "@/hooks/useApiResource";

const goalOptions = [
  ["learn", "Learn"],
  ["find_job", "Find a job"],
  ["build_startup", "Build a startup"],
  ["connect_in_tech", "Meet people in tech"],
  ["find_cofounder", "Find a cofounder"],
  ["hire_people", "Hire people"],
] as const;

const stageOptions = ["exploring", "student", "job-search", "founder", "operator", "career-change"];
const experienceOptions = ["beginner", "intermediate", "senior", "executive"];
const dayOptions: Array<[PreferredDay, string]> = [
  ["weekday", "Weekdays"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
];
const timeOptions: Array<[TimeOfDay, string]> = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
  ["late_night", "Late night"],
];
const socialOptions: Array<[SocialContext, string]> = [
  ["solo", "Solo"],
  ["date", "Date"],
  ["friends", "Friends"],
  ["family", "Family"],
  ["colleagues", "Colleagues"],
];

const starterProfiles = [
  {
    id: "student",
    label: "I am a student",
    description: "Learning first, affordable events, and useful people to meet.",
    profile: {
      currentStage: "student",
      experienceLevel: "beginner",
      primaryGoals: ["learn", "connect_in_tech"],
      targetRoles: ["software engineer", "product intern"],
      skills: ["React", "Python"],
      networkingIntent: "Meet students, early-career builders, and mentors in SF.",
      preferredCompanyStage: "startup",
      bio: "Student exploring the SF tech scene and looking for practical learning opportunities.",
    },
    preferences: {
      interests: ["tech", "community", "art"],
      preferredNeighborhoodSlugs: ["mission", "soma"],
      preferredDaysOfWeek: ["weekday", "saturday"],
      preferredDayParts: ["afternoon", "evening"],
      budget: "under25" as BudgetLevel,
      groupContext: "friends" as SocialContext,
    },
  },
  {
    id: "job-seeker",
    label: "I want a job",
    description: "Career upside, warm intros, and stronger hiring-related rooms.",
    profile: {
      currentStage: "job-search",
      experienceLevel: "intermediate",
      primaryGoals: ["find_job", "connect_in_tech"],
      targetRoles: ["frontend engineer", "full-stack engineer"],
      skills: ["TypeScript", "React", "Node.js"],
      networkingIntent: "Meet recruiters, hiring managers, and engineers who can open doors.",
      preferredCompanyStage: "growth",
      bio: "Tech professional looking for events that can lead to real conversations and job opportunities.",
    },
    preferences: {
      interests: ["tech", "community"],
      preferredNeighborhoodSlugs: ["soma", "financial-district"],
      preferredDaysOfWeek: ["weekday", "friday"],
      preferredDayParts: ["evening"],
      budget: "under75" as BudgetLevel,
      groupContext: "solo" as SocialContext,
    },
  },
  {
    id: "founder",
    label: "I am building a startup",
    description: "Founder energy, operators, cofounders, demos, and community.",
    profile: {
      currentStage: "founder",
      experienceLevel: "senior",
      primaryGoals: ["build_startup", "find_cofounder", "connect_in_tech"],
      targetRoles: ["founder", "product engineer"],
      skills: ["product strategy", "growth", "AI"],
      networkingIntent: "Meet founders, operators, angels, and potential cofounders.",
      preferredCompanyStage: "startup",
      bio: "Founder looking for high-signal rooms, startup community, and people building ambitious products.",
    },
    preferences: {
      interests: ["tech", "nightlife", "community"],
      preferredNeighborhoodSlugs: ["mission", "soma", "dogpatch"],
      preferredDaysOfWeek: ["friday", "saturday"],
      preferredDayParts: ["evening", "late_night"],
      budget: "splurge" as BudgetLevel,
      groupContext: "colleagues" as SocialContext,
    },
  },
  {
    id: "new-in-sf",
    label: "I am new in SF",
    description: "Easy entry, social momentum, and welcoming neighborhoods.",
    profile: {
      currentStage: "exploring",
      experienceLevel: "intermediate",
      primaryGoals: ["connect_in_tech", "learn"],
      targetRoles: ["designer", "engineer"],
      skills: ["design systems", "JavaScript"],
      networkingIntent: "Meet warm, interesting people and get comfortable with the city quickly.",
      preferredCompanyStage: "community-first",
      bio: "Recently in San Francisco and trying to build a smart, social routine around the city.",
    },
    preferences: {
      interests: ["community", "food", "art", "tech"],
      preferredNeighborhoodSlugs: ["mission", "hayes-valley", "north-beach"],
      preferredDaysOfWeek: ["saturday", "sunday"],
      preferredDayParts: ["afternoon", "evening"],
      budget: "under75" as BudgetLevel,
      groupContext: "friends" as SocialContext,
    },
  },
] as const;

const roleSuggestions = ["frontend engineer", "full-stack engineer", "designer", "PM", "founder", "student"];
const skillSuggestions = ["React", "TypeScript", "AI", "Product thinking", "Design systems", "Growth"];
const networkingSuggestions = [
  "Meet mentors and peers who can help me level up.",
  "Find warm intros to recruiters and hiring teams.",
  "Meet founders and people building ambitious products.",
  "Build a circle of smart people in SF I actually want to see again.",
];
const bioSuggestions = [
  "Curious builder exploring San Francisco through events that are actually worth showing up for.",
  "Career-focused tech professional looking for learning, networking, and practical momentum.",
  "Early-stage founder looking for community, talent, and useful startup conversations.",
];

const fallbackProfile: UserProfile = {
  onboardingCompleted: false,
  primaryGoals: [],
  currentStage: "exploring",
  experienceLevel: "intermediate",
  targetRoles: [],
  skills: [],
  networkingIntent: "",
  preferredCompanyStage: "any",
  bio: "",
  resumeText: "",
  cityHint: "San Francisco",
};

const fallbackPreferences: UserPreferences = {
  interests: [],
  dislikedCategories: [],
  preferredNeighborhoodSlugs: [],
  preferredDaysOfWeek: [],
  preferredDayParts: [],
  indoorPreference: "mixed",
  budgetMinCents: 0,
  budgetMaxCents: 7500,
  maxTravelMinutes: 35,
  groupContext: "friends",
};

function toggle<T extends string>(items: T[], item: T) {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

function mergeUnique(current: string[], additions: readonly string[]) {
  return [...new Set([...current, ...additions])];
}

function fromCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function budgetFromCents(maxCents: number | null | undefined): BudgetLevel {
  if ((maxCents ?? 0) <= 0) return "free";
  if ((maxCents ?? 0) <= 2500) return "under25";
  if ((maxCents ?? 0) <= 7500) return "under75";
  return "splurge";
}

function budgetToRange(budget: BudgetLevel) {
  if (budget === "free") return { min: 0, max: 0 };
  if (budget === "under25") return { min: 0, max: 2500 };
  if (budget === "under75") return { min: 0, max: 7500 };
  return { min: 0, max: 20000 };
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data, error, isLoading, refresh } = useApiResource(() => api.bootstrap(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [budget, setBudget] = useState<BudgetLevel>("under75");
  const [starterId, setStarterId] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!data || profile || preferences) return;
    setProfile({
      ...fallbackProfile,
      ...data.profile,
      cityHint: data.profile?.cityHint || "San Francisco",
    });
    setPreferences({
      ...fallbackPreferences,
      ...data.preferences,
      preferredNeighborhoodSlugs: data.preferences?.preferredNeighborhoodSlugs ?? [],
      preferredDaysOfWeek: data.preferences?.preferredDaysOfWeek ?? [],
      preferredDayParts: data.preferences?.preferredDayParts ?? [],
    });
    setBudget(budgetFromCents(data.preferences?.budgetMaxCents));
  }, [data, preferences, profile]);

  const profileProgress = useMemo(() => {
    if (!profile) return 0;
    return [
      profile.primaryGoals.length > 0,
      profile.targetRoles.length > 0,
      profile.skills.length > 0,
      Boolean(profile.networkingIntent.trim()),
      Boolean(profile.bio.trim()),
      Boolean(profile.resumeText.trim()),
    ].filter(Boolean).length;
  }, [profile]);

  const suggestedCategories = useMemo(() => {
    if (!profile) return [];
    if (profile.currentStage === "student") return ["tech", "community", "art"];
    if (profile.primaryGoals.includes("find_job")) return ["tech", "community"];
    if (profile.primaryGoals.includes("build_startup")) return ["tech", "community", "nightlife"];
    return ["tech", "food", "community"];
  }, [profile]);

  const setupSummary = useMemo(() => {
    if (!profile || !preferences) return [];

    const notes: string[] = [];
    if (starterId) {
      const starter = starterProfiles.find((item) => item.id === starterId);
      if (starter) notes.push(`Starting point: ${starter.label}`);
    }
    if (profile.currentStage === "student") notes.push("Student-friendly defaults are active");
    if (profile.primaryGoals.includes("find_job")) notes.push("Career and hiring events will rank higher");
    if (profile.primaryGoals.includes("build_startup")) notes.push("Founder and builder rooms will be boosted");
    if ((preferences.preferredNeighborhoodSlugs?.length ?? 0) > 0) notes.push(`Neighborhood focus: ${preferences.preferredNeighborhoodSlugs?.join(", ")}`);
    if ((preferences.preferredDayParts?.length ?? 0) > 0) notes.push(`Best time windows: ${preferences.preferredDayParts?.join(", ")}`);
    notes.push(
      budget === "free" ? "Free events only" : budget === "under25" ? "Budget-conscious suggestions" : budget === "under75" ? "Balanced price mix" : "Open to premium events",
    );
    return notes;
  }, [budget, preferences, profile, starterId]);

  const stepReady = useMemo(() => {
    if (!profile || !preferences) return false;
    if (activeStep === 0) return profile.primaryGoals.length > 0 || starterId.length > 0;
    if (activeStep === 1) return preferences.interests.length > 0;
    return Boolean(profile.bio.trim() || profile.resumeText.trim());
  }, [activeStep, preferences, profile, starterId]);

  const applyStarter = (starterKey: string) => {
    if (!profile || !preferences) return;
    const starter = starterProfiles.find((item) => item.id === starterKey);
    if (!starter) return;

    setStarterId(starterKey);
    setProfile({
      ...profile,
      currentStage: starter.profile.currentStage,
      experienceLevel: starter.profile.experienceLevel,
      primaryGoals: mergeUnique(profile.primaryGoals, starter.profile.primaryGoals),
      targetRoles: mergeUnique(profile.targetRoles, starter.profile.targetRoles),
      skills: mergeUnique(profile.skills, starter.profile.skills),
      networkingIntent: profile.networkingIntent || starter.profile.networkingIntent,
      preferredCompanyStage: profile.preferredCompanyStage === "any" || !profile.preferredCompanyStage ? starter.profile.preferredCompanyStage : profile.preferredCompanyStage,
      bio: profile.bio || starter.profile.bio,
    });
    setPreferences({
      ...preferences,
      interests: mergeUnique(preferences.interests, starter.preferences.interests),
      preferredNeighborhoodSlugs: mergeUnique(preferences.preferredNeighborhoodSlugs ?? [], starter.preferences.preferredNeighborhoodSlugs),
      preferredDaysOfWeek: mergeUnique((preferences.preferredDaysOfWeek ?? []).map(String), starter.preferences.preferredDaysOfWeek),
      preferredDayParts: mergeUnique(preferences.preferredDayParts ?? [], starter.preferences.preferredDayParts),
      groupContext: starter.preferences.groupContext,
    });
    setBudget(starter.preferences.budget);
    setActiveStep(1);
  };

  const saveProfile = async () => {
    if (!profile || !preferences) return;

    setFormError("");
    setMessage("");

    if (profile.primaryGoals.length === 0) {
      setFormError("Choose at least one goal so recommendations have a strong direction.");
      return;
    }

    if (!profile.bio.trim() && !profile.resumeText.trim()) {
      setFormError("Add a short bio or CV summary so the app has useful context.");
      return;
    }

    setIsSaving(true);
    const budgetRange = budgetToRange(budget);

    try {
      await api.updateProfile({
        ...profile,
        onboardingCompleted: true,
        cityHint: "San Francisco",
      });
      await api.updatePreferences({
        ...preferences,
        budgetMinCents: budgetRange.min,
        budgetMaxCents: budgetRange.max,
      });
      setMessage("Profile saved. Your personalized feed is ready.");
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
        {!isLoading && !error && (!profile || !preferences || !data) ? (
          <EmptyState title="Profile unavailable" body="The backend did not return profile data for this session." />
        ) : null}
        {profile && preferences && data ? (
          <section className="onboarding wide">
            <p className="eyebrow">Profile-first setup</p>
            <h1>Tell SF Buddy what kind of SF day you want to build.</h1>
            <p className="lead">Start with one quick identity choice, then let the app suggest the rest.</p>
            <div className="hero-ribbon">
              <span className="pill">SF only</span>
              <span className="hero-ribbon-copy">Guided setup, better defaults, and more intentional recommendations.</span>
            </div>

            <div className="stepper form-stack">
              <div className="progress">
                <span style={{ width: `${Math.min(100, ((activeStep + 1) / 3) * 100)}%` }} />
              </div>

              <div className="step-tabs" role="tablist" aria-label="Onboarding steps">
                {["Quick start", "Preferences", "About you"].map((label, index) => (
                  <button
                    key={label}
                    className={`step-tab ${activeStep === index ? "selected" : ""}`}
                    type="button"
                    onClick={() => setActiveStep(index)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeStep === 0 ? (
                <>
                  <section className="guided-panel">
                    <div className="guided-panel-head">
                      <div>
                        <h2>Start here</h2>
                        <p className="subtle">Pick the option that sounds closest to you. We will prefill the form and tune the first recommendation feed automatically.</p>
                      </div>
                    </div>
                    <div className="preset-grid">
                      {starterProfiles.map((starter) => (
                        <button
                          key={starter.id}
                          className={`preset-card ${starterId === starter.id ? "selected" : ""}`}
                          type="button"
                          onClick={() => applyStarter(starter.id)}
                        >
                          <strong>{starter.label}</strong>
                          <span>{starter.description}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h2>Your goal</h2>
                    <p className="subtle">Pick the main reasons you are using the app.</p>
                    <div className="pill-row">
                      {goalOptions.map(([value, label]) => (
                        <button
                          key={value}
                          className={`chip ${profile.primaryGoals.includes(value) ? "selected" : ""}`}
                          type="button"
                          onClick={() => setProfile({ ...profile, primaryGoals: toggle(profile.primaryGoals, value) })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="grid two">
                    <label className="field">
                      <span>Current stage</span>
                      <select value={profile.currentStage} onChange={(event) => setProfile({ ...profile, currentStage: event.target.value })}>
                        {stageOptions.map((option) => (
                          <option key={option} value={option}>
                            {option.replaceAll("-", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Experience level</span>
                      <select value={profile.experienceLevel} onChange={(event) => setProfile({ ...profile, experienceLevel: event.target.value })}>
                        {experienceOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>
                </>
              ) : null}

              {activeStep === 1 ? (
                <>
                  <section className="guided-panel">
                    <div className="guided-panel-head">
                      <div>
                        <h2>What should the app optimize for?</h2>
                        <p className="subtle">These preferences decide which events show up first before the user even starts browsing.</p>
                      </div>
                    </div>
                    <div className="summary-list">
                      {setupSummary.map((item) => (
                        <div className="summary-item" key={item}>
                          {item}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="grid two">
                    <div>
                      <h3>Interests</h3>
                      <p className="subtle helper-copy">Suggested from your stage and goal: {suggestedCategories.join(", ")}.</p>
                      <div className="pill-row">
                        {data.categories.map((category) => (
                          <button
                            key={category}
                            className={`chip ${preferences.interests.includes(category) ? "selected" : ""}`}
                            type="button"
                            onClick={() => setPreferences({ ...preferences, interests: toggle(preferences.interests, category) })}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      <div className="suggestion-row">
                        {suggestedCategories.map((category) => (
                          <button
                            key={category}
                            className="suggestion-chip"
                            type="button"
                            onClick={() => setPreferences({ ...preferences, interests: mergeUnique(preferences.interests, [category]) })}
                          >
                            Add suggested {category}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3>Preferred neighborhoods</h3>
                      <div className="pill-row">
                        {data.neighborhoods.map((neighborhood) => (
                          <button
                            key={neighborhood.slug}
                            className={`chip ${preferences.preferredNeighborhoodSlugs?.includes(neighborhood.slug) ? "selected" : ""}`}
                            type="button"
                            onClick={() =>
                              setPreferences({
                                ...preferences,
                                preferredNeighborhoodSlugs: toggle(preferences.preferredNeighborhoodSlugs ?? [], neighborhood.slug),
                              })
                            }
                          >
                            {neighborhood.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="grid two">
                    <div>
                      <h3>Days</h3>
                      <div className="pill-row">
                        {dayOptions.map(([value, label]) => (
                          <button
                            key={value}
                            className={`chip ${preferences.preferredDaysOfWeek?.includes(value) ? "selected" : ""}`}
                            type="button"
                            onClick={() =>
                              setPreferences({
                                ...preferences,
                                preferredDaysOfWeek: toggle((preferences.preferredDaysOfWeek ?? []).map(String), value),
                              })
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3>Time of day</h3>
                      <div className="pill-row">
                        {timeOptions.map(([value, label]) => (
                          <button
                            key={value}
                            className={`chip ${preferences.preferredDayParts?.includes(value) ? "selected" : ""}`}
                            type="button"
                            onClick={() =>
                              setPreferences({
                                ...preferences,
                                preferredDayParts: toggle((preferences.preferredDayParts ?? []) as string[], value),
                              })
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="grid two">
                    <div>
                      <h3>Budget</h3>
                      <div className="pill-row">
                        {(["free", "under25", "under75", "splurge"] as BudgetLevel[]).map((value) => (
                          <button key={value} className={`chip ${budget === value ? "selected" : ""}`} type="button" onClick={() => setBudget(value)}>
                            {value === "under25" ? "Under $25" : value === "under75" ? "Under $75" : value}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3>Who are you going with?</h3>
                      <div className="pill-row">
                        {socialOptions.map(([value, label]) => (
                          <button
                            key={value}
                            className={`chip ${preferences.groupContext === value ? "selected" : ""}`}
                            type="button"
                            onClick={() => setPreferences({ ...preferences, groupContext: value })}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                </>
              ) : null}

              {activeStep === 2 ? (
                <>
                  <section className="grid two">
                    <label className="field">
                      <span>Target roles</span>
                      <input
                        value={profile.targetRoles.join(", ")}
                        onChange={(event) => setProfile({ ...profile, targetRoles: fromCommaList(event.target.value) })}
                        placeholder="frontend engineer, PM, founder"
                      />
                      <div className="suggestion-row">
                        {roleSuggestions.map((role) => (
                          <button
                            key={role}
                            className="suggestion-chip"
                            type="button"
                            onClick={() => setProfile({ ...profile, targetRoles: mergeUnique(profile.targetRoles, [role]) })}
                          >
                            + {role}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label className="field">
                      <span>Skills</span>
                      <input
                        value={profile.skills.join(", ")}
                        onChange={(event) => setProfile({ ...profile, skills: fromCommaList(event.target.value) })}
                        placeholder="React, product strategy, AI"
                      />
                      <div className="suggestion-row">
                        {skillSuggestions.map((skill) => (
                          <button
                            key={skill}
                            className="suggestion-chip"
                            type="button"
                            onClick={() => setProfile({ ...profile, skills: mergeUnique(profile.skills, [skill]) })}
                          >
                            + {skill}
                          </button>
                        ))}
                      </div>
                    </label>
                  </section>

                  <label className="field">
                    <span>Networking intent</span>
                    <textarea
                      value={profile.networkingIntent}
                      onChange={(event) => setProfile({ ...profile, networkingIntent: event.target.value })}
                      rows={3}
                      placeholder="What kind of people do you want to meet?"
                    />
                    <div className="suggestion-row">
                      {networkingSuggestions.map((suggestion) => (
                        <button key={suggestion} className="suggestion-chip" type="button" onClick={() => setProfile({ ...profile, networkingIntent: suggestion })}>
                          Use suggestion
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="field">
                    <span>Bio</span>
                    <textarea
                      value={profile.bio}
                      onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                      rows={4}
                      placeholder="Short bio or what you are currently focused on."
                    />
                    <div className="suggestion-row">
                      {bioSuggestions.map((suggestion) => (
                        <button key={suggestion} className="suggestion-chip" type="button" onClick={() => setProfile({ ...profile, bio: suggestion })}>
                          Use suggestion
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="field">
                    <span>CV or resume summary</span>
                    <textarea
                      value={profile.resumeText}
                      onChange={(event) => setProfile({ ...profile, resumeText: event.target.value })}
                      rows={5}
                      placeholder="Paste a compact resume, LinkedIn summary, or project background."
                    />
                  </label>
                </>
              ) : null}

              {formError ? <div className="error inline">{formError}</div> : null}
              {message ? <div className="success inline">{message}</div> : null}

              <div className="actions split-actions">
                {activeStep > 0 ? (
                  <button className="button secondary" type="button" onClick={() => setActiveStep((step) => Math.max(0, step - 1))}>
                    Back
                  </button>
                ) : null}
                {activeStep < 2 ? (
                  <button className="button" type="button" disabled={!stepReady} onClick={() => setActiveStep((step) => Math.min(2, step + 1))}>
                    Continue
                  </button>
                ) : (
                  <button className="button" type="button" disabled={isSaving || !stepReady} onClick={() => void saveProfile()}>
                    {isSaving ? "Saving..." : "Save and discover"}
                  </button>
                )}
              </div>

              <p className="subtle helper-copy">Profile completion: {profileProgress}/6 signals collected.</p>
            </div>
          </section>
        ) : null}
      </RequireAuth>
    </AppShell>
  );
}
