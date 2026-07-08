"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { EmptyState, LoadingState } from "@/components/StateBlocks";
import { getEventCards } from "@/lib/catalog";
import type { OneDayPlan } from "@/lib/types";
import { useLocalState } from "@/hooks/useLocalState";

const initialPlan: OneDayPlan = {
  id: "saturday-plan",
  date: "2026-07-11",
  title: "Saturday in SF",
  items: []
};

export default function SavedPage() {
  const [savedIds, setSavedIds, ready] = useLocalState<string[]>("fogline-saved", []);
  const [plan, setPlan] = useLocalState<OneDayPlan>("fogline-plan", initialPlan);
  const savedEvents = getEventCards().filter((event) => savedIds.includes(event.id));

  const removeSaved = (id: string) => {
    setSavedIds(savedIds.filter((savedId) => savedId !== id));
  };

  const addToPlan = (id: string) => {
    if (!plan.items.some((item) => item.eventId === id)) {
      setPlan({ ...plan, items: [...plan.items, { eventId: id }] });
    }
  };

  return (
    <AppShell>
      <section className="section-header">
        <div>
          <p className="eyebrow">Bookmarks</p>
          <h1>Saved events</h1>
          <p className="lead">A short bench of options before users commit to a day plan.</p>
        </div>
        <Link className="button" href="/planner">
          Open planner
        </Link>
      </section>
      {!ready ? (
        <LoadingState label="Loading saved events..." />
      ) : savedEvents.length === 0 ? (
        <EmptyState title="No saved events" body="Save a few events from Discover, then come back to build a plan." />
      ) : (
        <section className="grid three">
          {savedEvents.map((event) => (
            <EventCard key={event.id} event={event} isSaved onSaveToggle={removeSaved} onAddToPlan={addToPlan} />
          ))}
        </section>
      )}
    </AppShell>
  );
}
