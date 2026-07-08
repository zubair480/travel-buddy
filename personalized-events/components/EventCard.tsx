"use client";

import Link from "next/link";
import { formatDateLabel, formatTimeRange } from "@/lib/format";
import type { EventCard as EventCardType } from "@/lib/types";

interface EventCardProps {
  event: EventCardType;
  isSaved?: boolean;
  onSaveToggle?: (id: string) => void;
  onAddToPlan?: (id: string) => void;
  isSaving?: boolean;
  isAddingToPlan?: boolean;
}

export function EventCard({ event, isSaved, onSaveToggle, onAddToPlan, isSaving, isAddingToPlan }: EventCardProps) {
  const resolvedSaved = isSaved ?? event.saved ?? event.isSaved ?? false;
  const recommended = event.recommendation.score >= 0.55;
  const recommendationStatus = recommended ? "Recommended for you" : "Not strongly recommended";

  return (
    <article className="card editorial-card">
      {event.imageUrl ? (
        <Link href={`/events/${event.id}`} aria-label={`Open ${event.title}`}>
          <img className="event-image" src={event.imageUrl} alt="" />
        </Link>
      ) : (
        <Link href={`/events/${event.id}`} aria-label={`Open ${event.title}`}>
          <div className="event-visual-fallback" aria-hidden="true">
            <span className="event-visual-kicker">{event.sourceLabel ?? "SF Event"}</span>
            <strong>{event.category}</strong>
            <span>{formatDateLabel(event.startsAt)}</span>
          </div>
        </Link>
      )}
      <div className="card-body">
        <div className="pill-row">
          <span className="pill">{event.neighborhood}</span>
          <span className="chip">{event.priceLabel}</span>
          <span className="chip source-chip">{event.sourceLabel ?? "Source"}</span>
          <span className={`chip recommendation-chip ${recommended ? "is-recommended" : "is-not-recommended"}`}>{recommendationStatus}</span>
        </div>
        <Link href={`/events/${event.id}`}>
          <h3>{event.title}</h3>
        </Link>
        <p className="subtle">{event.summary}</p>
        <div className="meta">
          <span>{formatDateLabel(event.startsAt)}</span>
          <span>{formatTimeRange(event.startsAt, event.endsAt)}</span>
          <span>{event.venueName}</span>
        </div>
        <div className="why">{event.recommendation.label}</div>
        <div className="actions">
          <button className="button secondary" type="button" onClick={() => onSaveToggle?.(event.id)} disabled={!onSaveToggle || isSaving}>
            {isSaving ? "Saving..." : resolvedSaved ? "Saved" : "Save"}
          </button>
          <button className="button" type="button" onClick={() => onAddToPlan?.(event.id)} disabled={!onAddToPlan || isAddingToPlan}>
            {isAddingToPlan ? "Adding..." : "Add to plan"}
          </button>
        </div>
      </div>
    </article>
  );
}
