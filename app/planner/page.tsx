"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingState } from "@/components/StateBlocks";
import { getEventById, getPlannerWarnings } from "@/lib/catalog";
import { formatTimeRange } from "@/lib/format";
import type { OneDayPlan } from "@/lib/types";
import { useLocalState } from "@/hooks/useLocalState";

const initialPlan: OneDayPlan = {
  id: "saturday-plan",
  date: "2026-07-11",
  title: "Saturday in SF",
  items: []
};

export default function PlannerPage() {
  const [plan, setPlan, ready] = useLocalState<OneDayPlan>("fogline-plan", initialPlan);
  const plannedEvents = plan.items.map((item) => getEventById(item.eventId)).filter(Boolean);
  const warnings = getPlannerWarnings(plan);

  const remove = (id: string) => {
    setPlan({ ...plan, items: plan.items.filter((item) => item.eventId !== id) });
  };

  const move = (id: string, direction: -1 | 1) => {
    const index = plan.items.findIndex((item) => item.eventId === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= plan.items.length) return;
    const nextItems = [...plan.items];
    const [item] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, item);
    setPlan({ ...plan, items: nextItems });
  };

  return (
    <AppShell>
      <section className="split">
        <div>
          <p className="eyebrow">One-day planner</p>
          <h1>{plan.title}</h1>
          <p className="lead">A lightweight timeline for turning saved picks into a realistic Saturday, with just enough warnings to avoid bad plans.</p>

          {warnings.length > 0 ? (
            <div className="grid">
              {warnings.map((warning) => (
                <div className="warning" key={warning.id}>{warning.message}</div>
              ))}
            </div>
          ) : null}

          <section className="section planner-board">
            {!ready ? (
              <LoadingState label="Loading your plan..." />
            ) : plannedEvents.length === 0 ? (
              <EmptyState title="Your timeline is empty" body="Add events from Discover or Saved to start shaping the day." />
            ) : (
              plannedEvents.map((event) => (
                <article className="timeline-item" key={event!.id}>
                  <div className="timeline-time">{formatTimeRange(event!.startsAt, event!.endsAt)}</div>
                  <div>
                    <h3>{event!.title}</h3>
                    <p className="subtle">{event!.venueName} in {event!.neighborhood}</p>
                    <div className="why">{event!.recommendation.label}</div>
                  </div>
                  <div className="actions">
                    <button className="button secondary" type="button" onClick={() => move(event!.id, -1)} aria-label={`Move ${event!.title} earlier`}>
                      Up
                    </button>
                    <button className="button secondary" type="button" onClick={() => move(event!.id, 1)} aria-label={`Move ${event!.title} later`}>
                      Down
                    </button>
                    <button className="button danger" type="button" onClick={() => remove(event!.id)}>
                      Remove
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
        <aside className="panel">
          <h3>Planner model</h3>
          <p className="subtle">MVP keeps planning concrete: one date, saved events, timeline order, overlap checks, and travel-gap warnings between neighborhoods.</p>
          <div className="actions">
            <Link className="button" href="/saved">
              Add saved events
            </Link>
            <Link className="button secondary" href="/discover">
              Find more
            </Link>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
