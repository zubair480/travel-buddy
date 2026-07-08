import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { getEventCards } from "@/lib/catalog";

export default function LandingPage() {
  const picks = getEventCards().slice(0, 3);

  return (
    <AppShell>
      <section className="hero">
        <div>
          <p className="eyebrow">San Francisco only</p>
          <h1>Find the SF plan that fits your week.</h1>
          <p className="lead">
            Fogline turns your taste, budget, neighborhoods, and social context into a short list of events and a simple one-day itinerary.
          </p>
          <div className="actions">
            <Link className="button" href="/onboarding">
              Set preferences
            </Link>
            <Link className="button secondary" href="/discover">
              Browse this week
            </Link>
          </div>
        </div>
        <div className="panel">
          <p className="eyebrow">MVP flow</p>
          <h2>From maybe to Saturday.</h2>
          <div className="grid">
            <div>
              <h3>1. Tune the vibe</h3>
              <p className="subtle">Pick interests, neighborhoods, budget, time of day, and whether this is solo, a date, friends, or family.</p>
            </div>
            <div>
              <h3>2. Save strong picks</h3>
              <p className="subtle">Every card explains why it is shown so the feed feels personal, not random.</p>
            </div>
            <div>
              <h3>3. Build one day</h3>
              <p className="subtle">Drop saved events into a timeline and get lightweight conflict and travel warnings.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Editorial feed preview</p>
            <h2>Local, curated, scannable.</h2>
          </div>
          <Link className="button secondary" href="/discover">
            See all
          </Link>
        </div>
        <div className="grid three">
          {picks.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
