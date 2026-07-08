"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { defaultPreferences } from "@/lib/mock-data";
import type { BudgetLevel, EventCategory, Neighborhood, PreferredDay, SocialContext, TimeOfDay, UserPreferences } from "@/lib/types";
import { useLocalState } from "@/hooks/useLocalState";

const interestOptions: EventCategory[] = ["food", "outdoors", "music", "arts", "film", "markets", "wellness", "community"];
const neighborhoodOptions: Neighborhood[] = ["Mission", "Hayes Valley", "Richmond", "Sunset", "North Beach", "SoMa", "Embarcadero", "Golden Gate Park", "Dogpatch", "Marina"];
const dayOptions: PreferredDay[] = ["weekday", "friday", "saturday", "sunday"];
const timeOptions: TimeOfDay[] = ["morning", "afternoon", "evening", "late"];
const contextOptions: SocialContext[] = ["solo", "date", "friends", "family"];

function toggle<T extends string>(items: T[], item: T) {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useLocalState<UserPreferences>("fogline-preferences", defaultPreferences);

  const finish = () => {
    router.push("/discover");
  };

  return (
    <AppShell>
      <section className="onboarding">
        <p className="eyebrow">Fast setup</p>
        <h1>Make the feed yours in under a minute.</h1>
        <div className="stepper">
          <div className="progress">
            <span style={{ width: "100%" }} />
          </div>
          <div className="grid">
            <div>
              <h3>Interests</h3>
              <p className="subtle">Use chips so onboarding feels quick and reversible.</p>
              <div className="pill-row">
                {interestOptions.map((option) => (
                  <button key={option} className={`chip ${preferences.interests.includes(option) ? "selected" : ""}`} type="button" onClick={() => setPreferences({ ...preferences, interests: toggle(preferences.interests, option) })}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3>Budget</h3>
              <div className="pill-row">
                {(["free", "under25", "under75", "splurge"] as BudgetLevel[]).map((option) => (
                  <button key={option} className={`chip ${preferences.budget === option ? "selected" : ""}`} type="button" onClick={() => setPreferences({ ...preferences, budget: option })}>
                    {option === "under25" ? "Under $25" : option === "under75" ? "Under $75" : option}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3>Neighborhoods</h3>
              <div className="pill-row">
                {neighborhoodOptions.map((option) => (
                  <button key={option} className={`chip ${preferences.neighborhoods.includes(option) ? "selected" : ""}`} type="button" onClick={() => setPreferences({ ...preferences, neighborhoods: toggle(preferences.neighborhoods, option) })}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid two">
              <div>
                <h3>Days</h3>
                <div className="pill-row">
                  {dayOptions.map((option) => (
                    <button key={option} className={`chip ${preferences.preferredDays.includes(option) ? "selected" : ""}`} type="button" onClick={() => setPreferences({ ...preferences, preferredDays: toggle(preferences.preferredDays, option) })}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3>Time</h3>
                <div className="pill-row">
                  {timeOptions.map((option) => (
                    <button key={option} className={`chip ${preferences.timeOfDay.includes(option) ? "selected" : ""}`} type="button" onClick={() => setPreferences({ ...preferences, timeOfDay: toggle(preferences.timeOfDay, option) })}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <h3>Who is this for?</h3>
              <div className="pill-row">
                {contextOptions.map((option) => (
                  <button key={option} className={`chip ${preferences.socialContext.includes(option) ? "selected" : ""}`} type="button" onClick={() => setPreferences({ ...preferences, socialContext: toggle(preferences.socialContext, option) })}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="actions">
            <button className="button" type="button" onClick={finish}>
              Show my picks
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
