import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function LandingPage() {
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
          <h2>From context to a workable SF day.</h2>
          <div className="grid">
            <div>
              <h3>1. Share your context</h3>
              <p className="subtle">Goals, stage, roles, skills, and networking intent shape the recommendation graph.</p>
            </div>
            <div>
              <h3>2. Review ranked lanes</h3>
              <p className="subtle">Backend-powered event cards explain why each pick fits instead of behaving like a static catalog.</p>
            </div>
            <div>
              <h3>3. Build one day</h3>
              <p className="subtle">Saved events become a real itinerary with warnings for overlaps and tight travel gaps.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Integration pass</p>
            <h2>Backend truth, editorial surface.</h2>
          </div>
          <Link className="button secondary" href="/discover">
            Open Discover
          </Link>
        </div>
        <div className="grid three">
          <article className="card card-body">
            <h3>Session-backed</h3>
            <p className="subtle">Login, logout, profile, preferences, saved events, and plans flow through the backend session cookie.</p>
          </article>
          <article className="card card-body">
            <h3>Profile-first</h3>
            <p className="subtle">Onboarding collects the career and networking fields the recommender needs before discovery.</p>
          </article>
          <article className="card card-body">
            <h3>Plan-ready</h3>
            <p className="subtle">Discover, saved, detail, and planner pages share the same typed API client and UI adapters.</p>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
