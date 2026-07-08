"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/StateBlocks";
import { getEventById, getRelatedEvents } from "@/lib/catalog";
import { formatDateTime, formatTimeRange } from "@/lib/format";
import type { OneDayPlan } from "@/lib/types";
import { useLocalState } from "@/hooks/useLocalState";

const initialPlan: OneDayPlan = {
  id: "saturday-plan",
  date: "2026-07-11",
  title: "Saturday in SF",
  items: []
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const event = getEventById(params.id);
  const [savedIds, setSavedIds] = useLocalState<string[]>("fogline-saved", []);
  const [plan, setPlan] = useLocalState<OneDayPlan>("fogline-plan", initialPlan);

  if (!event) {
    return (
      <AppShell>
        <EmptyState title="Event not found" body="This event may have expired or moved." />
      </AppShell>
    );
  }

  const related = getRelatedEvents(event);
  const isSaved = savedIds.includes(event.id);

  const toggleSaved = () => {
    setSavedIds(isSaved ? savedIds.filter((id) => id !== event.id) : [...savedIds, event.id]);
  };

  const addToPlan = () => {
    if (!plan.items.some((item) => item.eventId === event.id)) {
      setPlan({ ...plan, items: [...plan.items, { eventId: event.id }] });
    }
    if (!isSaved) {
      setSavedIds([...savedIds, event.id]);
    }
  };

  return (
    <AppShell>
      <section className="detail-hero" style={{ backgroundImage: `url(${event.imageUrl})` }}>
        <div className="detail-hero-overlay">
          <div>
            <p className="eyebrow">{event.neighborhood}</p>
            <h1>{event.title}</h1>
            <p>{formatDateTime(event.startsAt)} at {event.venueName}</p>
          </div>
        </div>
      </section>

      <section className="split section">
        <div>
          <p className="lead">{event.summary}</p>
          <p className="subtle">{event.description}</p>
          <div className="why">
            <strong>{event.recommendation.label}.</strong> {event.recommendation.detail}
          </div>
          <div className="section">
            <h2>Related picks</h2>
            <div className="grid two">
              {related.map((relatedEvent) => (
                <EventCard key={relatedEvent.id} event={relatedEvent} />
              ))}
            </div>
          </div>
        </div>
        <aside className="panel">
          <h3>Plan details</h3>
          <div className="meta">
            <span>{formatTimeRange(event.startsAt, event.endsAt)}</span>
            <span>{event.priceLabel}</span>
            <span>{event.category}</span>
          </div>
          <p className="subtle">{event.address}</p>
          <div className="pill-row">
            {event.tags.map((tag) => (
              <span className="chip" key={tag}>{tag}</span>
            ))}
          </div>
          {event.transitNotes ? <p className="subtle">{event.transitNotes}</p> : null}
          {event.accessibilityNotes ? <p className="subtle">{event.accessibilityNotes}</p> : null}
          <div className="actions">
            <button className="button secondary" type="button" onClick={toggleSaved}>
              {isSaved ? "Saved" : "Save"}
            </button>
            <button className="button" type="button" onClick={addToPlan}>
              Add to plan
            </button>
          </div>
          <Link className="button secondary" href={event.sourceUrl}>
            Event source
          </Link>
        </aside>
      </section>
    </AppShell>
  );
}
