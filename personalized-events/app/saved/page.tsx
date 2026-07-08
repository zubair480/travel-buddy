"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { useApiResource } from "@/hooks/useApiResource";
import { api } from "@/lib/api";
import { toEventCard, toPlan } from "@/lib/adapters";
import type { EventCard as EventCardType, OneDayPlan } from "@/lib/types";

async function ensurePlan(plans: OneDayPlan[], setPlans: (plans: OneDayPlan[]) => void) {
  if (plans[0]) return plans[0];
  const date = new Date();
  date.setDate(date.getDate() + 1);
  await api.createPlan({ title: "Saved-event plan", planDate: date.toISOString().slice(0, 10), notes: "Created from Saved." });
  const nextPlans = (await api.plans()).map(toPlan);
  setPlans(nextPlans);
  return nextPlans[0];
}

export default function SavedPage() {
  const { data, error, isLoading, setData, refresh } = useApiResource(() => api.savedEvents(), []);
  const [plans, setPlans] = useState<OneDayPlan[]>([]);
  const [actionError, setActionError] = useState("");
  const [pendingId, setPendingId] = useState("");

  const savedEvents: EventCardType[] = (data ?? []).map(toEventCard);

  const removeSaved = async (id: string) => {
    const previous = data ?? [];
    setPendingId(id);
    setActionError("");
    setData(previous.filter((card) => card.event.id !== id));

    try {
      await api.unsaveEvent(id);
    } catch (caught) {
      setData(previous);
      setActionError(caught instanceof Error ? caught.message : "Could not remove saved event.");
    } finally {
      setPendingId("");
    }
  };

  const addToPlan = async (id: string) => {
    setPendingId(id);
    setActionError("");
    try {
      const currentPlans = plans.length ? plans : (await api.plans()).map(toPlan);
      setPlans(currentPlans);
      const plan = await ensurePlan(currentPlans, setPlans);
      const updated = toPlan(await api.addPlanItem(plan.id, id));
      setPlans((items) => [updated, ...items.filter((item) => item.id !== updated.id)]);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not add event to plan.");
    } finally {
      setPendingId("");
    }
  };

  return (
    <AppShell>
      <RequireAuth>
        <section className="section-header">
          <div>
            <p className="eyebrow">Bookmarks</p>
            <h1>Saved events</h1>
            <p className="lead">A backend-synced shortlist before you commit to the final day plan.</p>
          </div>
          <Link className="button" href="/planner">
            Open planner
          </Link>
        </section>

        {error ? <ErrorState label={error} action={<button className="button secondary" onClick={refresh}>Retry</button>} /> : null}
        {actionError ? <ErrorState label={actionError} /> : null}
        {isLoading ? <LoadingState label="Loading saved events..." /> : null}
        {!isLoading && !error && savedEvents.length === 0 ? (
          <EmptyState
            title="No saved events"
            body="Save a few recommendations from Discover, then come back here to shape the day."
            action={<Link className="button secondary" href="/discover">Find events</Link>}
          />
        ) : null}
        {!isLoading && savedEvents.length > 0 ? (
          <section className="grid three">
            {savedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isSaved
                onSaveToggle={removeSaved}
                onAddToPlan={addToPlan}
                isSaving={pendingId === event.id}
                isAddingToPlan={pendingId === event.id}
              />
            ))}
          </section>
        ) : null}
      </RequireAuth>
    </AppShell>
  );
}
