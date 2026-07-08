"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { FilterBar } from "@/components/FilterBar";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import { toEventCard, toPlan } from "@/lib/adapters";
import type { BootstrapPayload } from "@/lib/backend-types";
import type { EventCard as EventCardType, EventFilters, OneDayPlan } from "@/lib/types";

const initialFilters: EventFilters = {
  q: "",
  date: "any",
  category: "any",
  price: "any",
  neighborhood: "any",
  sort: "recommended",
};

function priceMatches(event: EventCardType, price: EventFilters["price"]) {
  if (price === "any") return true;
  if (price === "free") return event.priceMin === 0;
  if (price === "under25") return event.priceMin <= 25;
  if (price === "under75") return event.priceMin <= 75;
  return true;
}

function weekendMatches(event: EventCardType, date: EventFilters["date"]) {
  if (date !== "weekend") return true;
  const day = new Date(event.startsAt).getDay();
  return day === 0 || day === 6;
}

async function ensurePlan(plans: OneDayPlan[], setPlans: (plans: OneDayPlan[]) => void) {
  if (plans[0]) return plans[0];
  const nextSaturday = new Date();
  nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
  await api.createPlan({
    title: "SF day plan",
    planDate: nextSaturday.toISOString().slice(0, 10),
    notes: "Created from Discover.",
  });
  const hydrated = (await api.plans()).map(toPlan);
  setPlans(hydrated);
  return hydrated[0];
}

export default function DiscoverPage() {
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [events, setEvents] = useState<EventCardType[]>([]);
  const [plans, setPlans] = useState<OneDayPlan[]>([]);
  const [filters, setFilters] = useState<EventFilters>(initialFilters);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSaveId, setPendingSaveId] = useState("");
  const [pendingPlanId, setPendingPlanId] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const payload = await api.bootstrap();
        const hydratedPlans = (await api.plans()).map(toPlan);
        if (!ignore) {
          setBootstrap(payload);
          setPlans(hydratedPlans);
          setEvents(payload.recommendations.map(toEventCard));
        }
      } catch (caught) {
        if (!ignore) setError(caught instanceof Error ? caught.message : "Could not load discovery.");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!bootstrap) return;
    let ignore = false;
    async function loadRecommendations() {
      setIsLoading(true);
      setError("");
      try {
        const cards = await api.recommendations(filters);
        if (!ignore) setEvents(cards.map(toEventCard));
      } catch (caught) {
        if (!ignore) setError(caught instanceof Error ? caught.message : "Could not refresh recommendations.");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    loadRecommendations();
    return () => {
      ignore = true;
    };
  }, [filters, bootstrap]);

  const visibleEvents = useMemo(
    () => events.filter((event) => priceMatches(event, filters.price)).filter((event) => weekendMatches(event, filters.date)),
    [events, filters.price, filters.date],
  );

  const lanes = useMemo(
    () => [
      { label: "Best fits", count: visibleEvents.filter((event) => event.score >= 3).length },
      { label: "Saved", count: visibleEvents.filter((event) => event.isSaved).length },
      { label: "Tech-adjacent", count: visibleEvents.filter((event) => `${event.title} ${event.tags.join(" ")}`.toLowerCase().includes("tech")).length },
    ],
    [visibleEvents],
  );

  const toggleSaved = async (id: string) => {
    const event = events.find((item) => item.id === id);
    if (!event) return;
    setPendingSaveId(id);
    setEvents((current) => current.map((item) => (item.id === id ? { ...item, isSaved: !item.isSaved } : item)));
    try {
      if (event.isSaved) await api.unsaveEvent(id);
      else await api.saveEvent(id);
    } catch (caught) {
      setEvents((current) => current.map((item) => (item.id === id ? { ...item, isSaved: event.isSaved } : item)));
      setError(caught instanceof Error ? caught.message : "Could not update saved state.");
    } finally {
      setPendingSaveId("");
    }
  };

  const addToPlan = async (id: string) => {
    setPendingPlanId(id);
    setError("");
    try {
      const plan = await ensurePlan(plans, setPlans);
      const nextPlan = toPlan(await api.addPlanItem(plan.id, id));
      setPlans((current) => [nextPlan, ...current.filter((item) => item.id !== nextPlan.id)]);
      setEvents((current) => current.map((item) => (item.id === id ? { ...item, isSaved: true } : item)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add event to your plan.");
    } finally {
      setPendingPlanId("");
    }
  };

  return (
    <AppShell>
      <RequireAuth>
        <section>
          <p className="eyebrow">Personalized discovery</p>
          <h1>What should I do in SF this week?</h1>
          <p className="lead">A backend-ranked feed that turns your goals, profile, and preferences into practical event options.</p>
        </section>

        {bootstrap ? <FilterBar filters={filters} onChange={setFilters} categories={bootstrap.categories} neighborhoods={bootstrap.neighborhoods} /> : null}

        <section className="lane-row" aria-label="Recommendation lanes">
          {lanes.map((lane) => (
            <div className="lane" key={lane.label}>
              <strong>{lane.count}</strong>
              <span>{lane.label}</span>
            </div>
          ))}
        </section>

        {error ? <ErrorState label={error} action={<button className="button secondary" onClick={() => setFilters({ ...filters })}>Retry</button>} /> : null}
        {isLoading ? <LoadingState label="Loading backend recommendations..." /> : null}
        {!isLoading && !error && visibleEvents.length === 0 ? (
          <EmptyState
            title="No matches yet"
            body="Loosen one filter or update your profile to broaden the feed."
            action={<Link className="button secondary" href="/onboarding">Update profile</Link>}
          />
        ) : null}
        {!isLoading && visibleEvents.length > 0 ? (
          <section className="grid three">
            {visibleEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onSaveToggle={toggleSaved}
                onAddToPlan={addToPlan}
                isSaving={pendingSaveId === event.id}
                isAddingToPlan={pendingPlanId === event.id}
              />
            ))}
          </section>
        ) : null}
      </RequireAuth>
    </AppShell>
  );
}
