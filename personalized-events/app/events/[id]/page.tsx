"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { useApiResource } from "@/hooks/useApiResource";
import { api } from "@/lib/api";
import { toEventCard } from "@/lib/adapters";
import { formatDateTime, formatTimeRange } from "@/lib/format";
import { ensurePrimaryPlan } from "@/lib/plans";
import type { BackendEventCard } from "@/lib/backend-types";
import type { EventCard as EventCardType } from "@/lib/types";

function isBackendEventCard(value: unknown): value is BackendEventCard {
  return Boolean(value && typeof value === "object" && "event" in value && "recommendation" in value);
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventCardType | null>(null);
  const [related, setRelated] = useState<EventCardType[]>([]);
  const [actionError, setActionError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const { error, isLoading, refresh } = useApiResource(
    async () => {
      const payload = await api.eventDetail(params.id);
      const nextEvent = toEventCard(payload.data);
      setEvent(nextEvent);
      setRelated((payload.related ?? []).filter(isBackendEventCard).map(toEventCard));
      return payload;
    },
    [params.id],
  );

  const toggleSaved = async () => {
    if (!event) return;
    const wasSaved = event.isSaved ?? event.saved ?? false;
    setIsSaving(true);
    setActionError("");
    setEvent({ ...event, isSaved: !wasSaved, saved: !wasSaved });
    try {
      if (wasSaved) await api.unsaveEvent(event.id);
      else await api.saveEvent(event.id);
    } catch (caught) {
      setEvent({ ...event, isSaved: wasSaved, saved: wasSaved });
      setActionError(caught instanceof Error ? caught.message : "Could not update saved state.");
    } finally {
      setIsSaving(false);
    }
  };

  const addToPlan = async () => {
    if (!event) return;
    setIsAdding(true);
    setActionError("");
    try {
      const planId = await ensurePrimaryPlan();
      await api.addPlanItem(planId, event.id);
      setEvent({ ...event, isSaved: true, saved: true });
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not add this event to your plan.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <AppShell>
      <RequireAuth>
        {isLoading ? <LoadingState label="Loading event details..." /> : null}
        {error ? <ErrorState label={error} action={<button className="button secondary" onClick={refresh}>Retry</button>} /> : null}
        {actionError ? <ErrorState label={actionError} /> : null}
        {!isLoading && !error && !event ? <EmptyState title="Event not found" body="This event may have expired or moved." /> : null}

        {event ? (
          <>
            <section className={`detail-hero${event.imageUrl ? "" : " no-image"}`} style={event.imageUrl ? { backgroundImage: `url(${event.imageUrl})` } : undefined}>
              <div className="detail-hero-overlay">
                <div>
                  <p className="eyebrow">{event.neighborhood} · {event.sourceLabel ?? "Source"}</p>
                  <h1>{event.title}</h1>
                  <p>{formatDateTime(event.startsAt)} at {event.venueName}</p>
                </div>
              </div>
            </section>

            <section className="split section">
              <div>
                <p className="lead">{event.summary}</p>
                <p className="subtle">{event.recommendation.detail}</p>
                <div className="why">
                  <strong>{event.recommendation.label}.</strong> Match score {event.recommendation.score.toFixed(2)}
                </div>
                <div className="section">
                  <h2>Related picks</h2>
                  {related.length ? (
                    <div className="grid two">
                      {related.map((relatedEvent) => (
                        <EventCard key={relatedEvent.id} event={relatedEvent} isSaved={relatedEvent.saved ?? relatedEvent.isSaved} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No related events yet" body="The backend could not find any strong related matches for this event." />
                  )}
                </div>
              </div>
              <aside className="panel sticky-panel">
                <h3>Plan details</h3>
                <div className="meta">
                  <span>{formatTimeRange(event.startsAt, event.endsAt)}</span>
                  <span>{event.priceLabel}</span>
                  <span>{event.category}</span>
                  <span>{event.sourceLabel ?? "Source"}</span>
                </div>
                <p className="subtle">{event.address}</p>
                <div className="pill-row">
                  {event.tags.map((tag) => (
                    <span className="chip" key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="actions">
                  <button className="button secondary" type="button" onClick={() => void toggleSaved()} disabled={isSaving}>
                    {isSaving ? "Saving..." : event.isSaved || event.saved ? "Saved" : "Save"}
                  </button>
                  <button className="button" type="button" onClick={() => void addToPlan()} disabled={isAdding}>
                    {isAdding ? "Adding..." : "Add to plan"}
                  </button>
                </div>
                {event.sourceUrl ? (
                  <Link className="button secondary" href={event.sourceUrl} target="_blank" rel="noreferrer">
                    Open on {event.sourceLabel ?? "source"}
                  </Link>
                ) : (
                  <p className="subtle">No source URL is available yet.</p>
                )}
              </aside>
            </section>
          </>
        ) : null}
      </RequireAuth>
    </AppShell>
  );
}
