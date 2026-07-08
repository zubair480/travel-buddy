"use client";

import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { FilterBar } from "@/components/FilterBar";
import { EmptyState, LoadingState } from "@/components/StateBlocks";
import { getEventCards } from "@/lib/catalog";
import type { EventFilters, OneDayPlan } from "@/lib/types";
import { useLocalState } from "@/hooks/useLocalState";

const initialFilters: EventFilters = {
  date: "any",
  category: "any",
  price: "any",
  neighborhood: "any",
  sort: "recommended"
};

const initialPlan: OneDayPlan = {
  id: "saturday-plan",
  date: "2026-07-11",
  title: "Saturday in SF",
  items: []
};

export default function DiscoverPage() {
  const [filters, setFilters] = useLocalState<EventFilters>("fogline-filters", initialFilters);
  const [savedIds, setSavedIds, savedReady] = useLocalState<string[]>("fogline-saved", []);
  const [plan, setPlan] = useLocalState<OneDayPlan>("fogline-plan", initialPlan);
  const events = getEventCards(filters);

  const toggleSaved = (id: string) => {
    setSavedIds(savedIds.includes(id) ? savedIds.filter((savedId) => savedId !== id) : [...savedIds, id]);
  };

  const addToPlan = (id: string) => {
    if (!plan.items.some((item) => item.eventId === id)) {
      setPlan({ ...plan, items: [...plan.items, { eventId: id }] });
    }
    if (!savedIds.includes(id)) {
      setSavedIds([...savedIds, id]);
    }
  };

  return (
    <AppShell>
      <section>
        <p className="eyebrow">Personalized discovery</p>
        <h1>What should I do in SF this week?</h1>
        <p className="lead">A recommendation-first feed with filters when users know the neighborhood, budget, or time window they want.</p>
      </section>

      <FilterBar filters={filters} onChange={setFilters} />

      {!savedReady ? (
        <LoadingState />
      ) : events.length === 0 ? (
        <EmptyState title="No matches yet" body="Loosen one filter or update your preferences to broaden the feed." />
      ) : (
        <section className="grid three">
          {events.map((event) => (
            <EventCard key={event.id} event={event} isSaved={savedIds.includes(event.id)} onSaveToggle={toggleSaved} onAddToPlan={addToPlan} />
          ))}
        </section>
      )}
    </AppShell>
  );
}
