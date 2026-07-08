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
import { PREFERENCES_UPDATED_EVENT, PROFILE_UPDATED_EVENT } from "@/lib/uiSignals";
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
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(true);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingSaveId, setPendingSaveId] = useState("");
  const [pendingPlanId, setPendingPlanId] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    function handleProfileRefresh() {
      setRefreshNonce((value) => value + 1);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === PROFILE_UPDATED_EVENT || event.key === PREFERENCES_UPDATED_EVENT) {
        handleProfileRefresh();
      }
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileRefresh);
    window.addEventListener(PREFERENCES_UPDATED_EVENT, handleProfileRefresh);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileRefresh);
      window.removeEventListener(PREFERENCES_UPDATED_EVENT, handleProfileRefresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadBootstrap() {
      setIsBootstrapLoading(true);
      setError("");
      try {
        const bootstrap = await api.bootstrap();
        if (!active) return;
        setCategories(bootstrap.categories);
        setNeighborhoods(bootstrap.neighborhoods);
        setLanes(laneCards(bootstrap.recommendationLanes));
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load discovery.");
      } finally {
        if (active) setIsBootstrapLoading(false);
      }
    }

    void loadBootstrap();
    return () => {
      active = false;
    };
  }, [refreshNonce]);

  useEffect(() => {
    let active = true;

    async function loadRecommendations() {
      setIsRecommendationsLoading(true);
      setError("");
      try {
        const recommendations = await api.recommendations(filters);
        if (active) setCards(recommendations.map(mapBackendCard));
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Could not refresh recommendations.");
      } finally {
        if (active) setIsRecommendationsLoading(false);
      }
    }

    void loadRecommendations();
    return () => {
      active = false;
    };
  }, [filters, refreshNonce]);

  const visibleCards = useMemo(() => {
    if (filters.price === "any") return cards;
    return cards.filter((event) => {
      if (filters.price === "free") return event.priceMin === 0;
      if (filters.price === "under25") return event.priceMin <= 25;
      if (filters.price === "under75") return event.priceMin <= 75;
      return true;
    });
  }, [cards, filters.price]);

  const recommendedCount = useMemo(() => visibleCards.filter((event) => event.recommendation.score >= 0.55).length, [visibleCards]);
  const focusRatio = visibleCards.length ? Math.round((recommendedCount / visibleCards.length) * 100) : 0;
  const routePreview = useMemo(() => {
    const candidates = visibleCards
      .filter((event) => event.venueName || event.address)
      .slice(0, 2);
    if (candidates.length < 2) return null;

    const stopLabel = (event: EventCardType) => {
      const address = event.address?.trim();
      if (address && address.toLowerCase() !== "address tba") return `${event.venueName}, ${address}`;
      return `${event.venueName}, San Francisco`;
    };

    const origin = stopLabel(candidates[0]);
    const destination = stopLabel(candidates[1]);
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=transit`;
    const embedUrl = `https://maps.google.com/maps?output=embed&saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}`;

    return {
      first: candidates[0],
      second: candidates[1],
      directionsUrl,
      embedUrl,
    };
  }, [visibleCards]);

  const timeConflictMeta = useMemo(() => {
    const byStartSlot = new Map<string, EventCardType[]>();
    const toSlotKey = (iso: string) => {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "";
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const hm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      return `${day} ${hm}`;
    };

    for (const event of visibleCards) {
      const slot = toSlotKey(event.startsAt);
      if (!slot) continue;
      const list = byStartSlot.get(slot) ?? [];
      list.push(event);
      byStartSlot.set(slot, list);
    }

    const meta = new Map<string, { count: number; isTop: boolean }>();
    for (const group of byStartSlot.values()) {
      if (group.length < 2) continue;
      const topScore = Math.max(...group.map((event) => event.recommendation.score));
      for (const event of group) {
        meta.set(event.id, {
          count: group.length,
          isTop: event.recommendation.score >= topScore,
        });
      }
    }
    return meta;
  }, [visibleCards]);

  const isLoading = isBootstrapLoading || isRecommendationsLoading;
  const showEmptyState = !isLoading && !error && visibleCards.length === 0;
  const showGrid = visibleCards.length > 0;

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
        <section className="discover-hero">
          <div>
            <p className="eyebrow">Personalized discovery</p>
            <h1>What should I do in SF this week?</h1>
            <p className="lead">A calmer discovery flow: fewer noisy choices, stronger matches, and clearer reasoning behind each suggestion.</p>
            <div className="actions">
              <Link className="button secondary" href="/preferences">
                Edit setup
              </Link>
            </div>
          </div>
          <aside className="discover-hero-card">
            <p className="eyebrow">Decision confidence</p>
            <h3>{recommendedCount} strong matches right now</h3>
            <p className="subtle">We prioritize events that align with your goals, timing, neighborhood comfort, and budget fit.</p>
            <div className="discover-meter">
              <div className="discover-meter-fill" style={{ width: `${focusRatio}%` }} />
            </div>
            <div className="pill-row">
              <span className="chip">Focus score: {focusRatio}%</span>
              <span className="chip">{visibleCards.length} events in feed</span>
            </div>
          </aside>
        </section>

        <section className="discover-strip" aria-label="Feed principles">
          <div className="discover-strip-item">
            <strong>Clarity first</strong>
            <span>Each card surfaces when, where, and why it fits.</span>
          </div>
          <div className="discover-strip-item">
            <strong>Less decision fatigue</strong>
            <span>Recommendations are pre-ranked so your top options appear first.</span>
          </div>
          <div className="discover-strip-item">
            <strong>Trust signals</strong>
            <span>Source labels make it obvious which platform each event comes from.</span>
          </div>
        </section>

        {isLoading && cards.length === 0 ? <LoadingState label="Loading backend recommendations..." /> : null}
        {isLoading && cards.length > 0 ? <div className="loading inline">Refreshing recommendations from your latest profile...</div> : null}
        <FilterBar
          filters={filters}
          categoryOptions={categoryOptions(categories)}
          neighborhoodOptions={neighborhoodOptions(neighborhoods)}
          onChange={setFilters}
        />

        {routePreview ? (
          <section className="route-preview" aria-label="Route preview">
            <div className="route-preview-head">
              <div>
                <p className="eyebrow">Next Feature: Route map</p>
                <h3>Your first event is at {routePreview.first.venueName}, then next at {routePreview.second.venueName}</h3>
                <p className="subtle">This uses your current ranking order so you can move from top pick to next best with less planning friction.</p>
              </div>
              <Link className="button secondary" href={routePreview.directionsUrl} target="_blank" rel="noreferrer">
                Open in Maps
              </Link>
            </div>
            <div className="route-preview-grid">
              <div className="route-stops">
                <div className="route-stop">
                  <strong>1. {routePreview.first.title}</strong>
                  <span>{routePreview.first.venueName}</span>
                  <span>{routePreview.first.address || "San Francisco"}</span>
                </div>
                <div className="route-arrow">→</div>
                <div className="route-stop">
                  <strong>2. {routePreview.second.title}</strong>
                  <span>{routePreview.second.venueName}</span>
                  <span>{routePreview.second.address || "San Francisco"}</span>
                </div>
              </div>
              <div className="route-map-frame">
                <iframe title="Event route map" src={routePreview.embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </div>
          </section>
        ) : null}

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

        {error && cards.length > 0 ? <div className="error inline">{error}</div> : null}
        {error && cards.length === 0 ? (
          <ErrorState
            label={error}
            action={
              <Link className="button secondary" href="/preferences">
                Update profile
              </Link>
            }
          />
        ) : null}
        {showEmptyState ? (
          <EmptyState
            title="No matches yet"
            body="Loosen a filter or update your onboarding profile to broaden the feed."
            action={
              <Link className="button secondary" href="/preferences">
                Update profile
              </Link>
            }
          />
        ) : null}
        {showGrid ? (
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
                timeConflictCount={timeConflictMeta.get(event.id)?.count ?? 0}
                isTopTimeRecommendation={timeConflictMeta.get(event.id)?.isTop ?? false}
              />
            ))}
          </section>
        ) : null}
      </RequireAuth>
    </AppShell>
  );
}
