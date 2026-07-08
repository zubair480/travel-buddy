"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { FilterBar } from "@/components/FilterBar";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import { categoryOptions, laneCards, mapBackendCard, neighborhoodOptions } from "@/lib/backend";
import { ensurePrimaryPlan } from "@/lib/plans";
import type { EventCard as EventCardType, EventFilters } from "@/lib/types";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildInitialFilters(): EventFilters {
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 6);

  return {
    q: "",
    date: "",
    startDate: toDateInputValue(today),
    endDate: toDateInputValue(weekEnd),
    category: "any",
    price: "any",
    neighborhood: "any",
    sort: "recommended",
  };
}

export default function DiscoverPage() {
  const [filters, setFilters] = useState<EventFilters>(() => buildInitialFilters());
  const [cards, setCards] = useState<EventCardType[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Array<{ slug: string; name: string }>>([]);
  const [lanes, setLanes] = useState<ReturnType<typeof laneCards>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingSaveId, setPendingSaveId] = useState("");
  const [pendingPlanId, setPendingPlanId] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBootstrap() {
      setLoading(true);
      setError("");
      try {
        const bootstrap = await api.bootstrap();
        const recommendations = await api.recommendations(filters);
        if (!active) return;
        setCategories(bootstrap.categories);
        setNeighborhoods(bootstrap.neighborhoods);
        setLanes(laneCards(bootstrap.recommendationLanes));
        setCards(recommendations.map(mapBackendCard));
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load discovery.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRecommendations() {
      setLoading(true);
      setError("");
      try {
        const recommendations = await api.recommendations(filters);
        if (active) setCards(recommendations.map(mapBackendCard));
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Could not refresh recommendations.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRecommendations();
    return () => {
      active = false;
    };
  }, [filters]);

  const visibleCards = useMemo(() => {
    if (filters.price === "any") return cards;
    return cards.filter((event) => {
      if (filters.price === "free") return event.priceMin === 0;
      if (filters.price === "under25") return event.priceMin <= 25;
      if (filters.price === "under75") return event.priceMin <= 75;
      return true;
    });
  }, [cards, filters.price]);

  async function toggleSaved(eventId: string) {
    const existing = cards.find((event) => event.id === eventId);
    if (!existing) return;

    setPendingSaveId(eventId);
    setError("");
    setCards((current) =>
      current.map((event) =>
        event.id === eventId
          ? {
              ...event,
              saved: !(event.saved ?? event.isSaved ?? false),
              isSaved: !(event.saved ?? event.isSaved ?? false),
            }
          : event,
      ),
    );

    try {
      if (existing.saved ?? existing.isSaved) await api.unsaveEvent(eventId);
      else await api.saveEvent(eventId);
    } catch (caught) {
      setCards((current) =>
        current.map((event) =>
          event.id === eventId
            ? {
                ...event,
                saved: existing.saved ?? existing.isSaved ?? false,
                isSaved: existing.saved ?? existing.isSaved ?? false,
              }
            : event,
        ),
      );
      setError(caught instanceof Error ? caught.message : "Could not update saved state.");
    } finally {
      setPendingSaveId("");
    }
  }

  async function addToPlan(eventId: string) {
    setPendingPlanId(eventId);
    setError("");
    try {
      const planId = await ensurePrimaryPlan();
      await api.addPlanItem(planId, eventId);
      setCards((current) =>
        current.map((event) =>
          event.id === eventId
            ? {
                ...event,
                saved: true,
                isSaved: true,
              }
            : event,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add event to your plan.");
    } finally {
      setPendingPlanId("");
    }
  }

  return (
    <AppShell>
      <RequireAuth>
        <section>
          <p className="eyebrow">Personalized discovery</p>
          <h1>What should I do in SF this week?</h1>
          <p className="lead">Backend-ranked recommendations tuned to your goals, neighborhoods, budget, and time window.</p>
        </section>

        <FilterBar
          filters={filters}
          categoryOptions={categoryOptions(categories)}
          neighborhoodOptions={neighborhoodOptions(neighborhoods)}
          onChange={setFilters}
        />

        {lanes.length > 0 ? (
          <section className="lane-row" aria-label="Recommendation lanes">
            {lanes.slice(0, 3).map((lane) => (
              <div className="lane" key={lane.key}>
                <div>
                  <h3>{lane.title}</h3>
                  <p className="subtle">{lane.description}</p>
                </div>
                <strong>{lane.items.length}</strong>
              </div>
            ))}
          </section>
        ) : null}

        {error ? (
          <ErrorState
            label={error}
            action={
              <Link className="button secondary" href="/onboarding">
                Update profile
              </Link>
            }
          />
        ) : null}
        {loading ? <LoadingState label="Loading backend recommendations..." /> : null}
        {!loading && !error && visibleCards.length === 0 ? (
          <EmptyState
            title="No matches yet"
            body="Loosen a filter or update your onboarding profile to broaden the feed."
            action={
              <Link className="button secondary" href="/onboarding">
                Update profile
              </Link>
            }
          />
        ) : null}
        {!loading && visibleCards.length > 0 ? (
          <section className="grid three">
            {visibleCards.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isSaved={event.saved ?? event.isSaved}
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
