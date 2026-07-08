"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { useApiResource } from "@/hooks/useApiResource";
import { api } from "@/lib/api";
import { toPlan } from "@/lib/adapters";
import { formatTimeRange } from "@/lib/format";
import type { OneDayPlan } from "@/lib/types";

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function resolvePlanItems(plan: OneDayPlan | null, ids: string[] | undefined) {
  if (!plan || !ids?.length) return [];

  const byId = new Map<string, (typeof plan.items)[number]>();
  for (const item of plan.items) {
    byId.set(item.id, item);
    byId.set(item.eventId, item);
  }

  return [...new Set(ids)]
    .map((id) => byId.get(id))
    .filter((item): item is (typeof plan.items)[number] => Boolean(item));
}

function buildConflictMap(plan: OneDayPlan | null) {
  const conflictMap = new Map<string, string[]>();
  if (!plan) return conflictMap;

  for (const warning of plan.warnings) {
    const linkedItems = resolvePlanItems(plan, warning.itemIds ?? warning.eventIds);
    if (linkedItems.length < 2) continue;

    for (const item of linkedItems) {
      const relatedTitles = linkedItems.filter((candidate) => candidate.id !== item.id).map((candidate) => candidate.event.title);
      const next = conflictMap.get(item.id) ?? [];
      conflictMap.set(item.id, [...new Set([...next, ...relatedTitles])]);
    }
  }

  return conflictMap;
}

export default function PlannerPage() {
  const { data, error, isLoading, setData, refresh } = useApiResource<OneDayPlan[]>(async () => (await api.plans()).map(toPlan), []);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [title, setTitle] = useState("SF day plan");
  const [planDate, setPlanDate] = useState(tomorrow());
  const [actionError, setActionError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [pendingItemId, setPendingItemId] = useState("");

  const plans = data ?? [];
  const activePlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null, [plans, selectedPlanId]);
  const conflictMap = useMemo(() => buildConflictMap(activePlan), [activePlan]);
  const detailedWarnings = useMemo(
    () =>
      (activePlan?.warnings ?? []).map((warning) => {
        const linkedItems = resolvePlanItems(activePlan, warning.itemIds ?? warning.eventIds);
        return {
          ...warning,
          linkedItems,
        };
      }),
    [activePlan],
  );

  const createPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setActionError("");
    try {
      await api.createPlan({ title, planDate, notes: "Created from Planner." });
      const nextPlans = (await api.plans()).map(toPlan);
      setData(nextPlans);
      setSelectedPlanId(nextPlans[0]?.id ?? "");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not create plan.");
    } finally {
      setIsCreating(false);
    }
  };

  const remove = async (itemId: string) => {
    if (!activePlan) return;
    setPendingItemId(itemId);
    setActionError("");
    try {
      const nextPlan = toPlan(await api.removePlanItem(activePlan.id, itemId));
      setData(plans.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan)));
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not remove event from plan.");
    } finally {
      setPendingItemId("");
    }
  };

  const move = async (itemId: string, direction: -1 | 1) => {
    if (!activePlan) return;
    const index = activePlan.items.findIndex((item) => item.id === itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= activePlan.items.length) return;

    const nextItems = [...activePlan.items];
    const [item] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, item);

    const optimisticPlan = { ...activePlan, items: nextItems };
    setData(plans.map((plan) => (plan.id === activePlan.id ? optimisticPlan : plan)));
    setPendingItemId(itemId);
    setActionError("");

    try {
      const nextPlan = toPlan(await api.reorderPlanItems(activePlan.id, nextItems.map((planItem) => planItem.id)));
      setData(plans.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan)));
    } catch (caught) {
      setData(plans);
      setActionError(caught instanceof Error ? caught.message : "Could not reorder plan.");
    } finally {
      setPendingItemId("");
    }
  };

  return (
    <AppShell>
      <RequireAuth>
        <section className="split">
          <div>
            <p className="eyebrow">One-day planner</p>
            <h1>{activePlan?.title ?? "Build an SF day plan"}</h1>
            <p className="lead">Saved events become a real timeline with overlap and travel warnings, not just a wishlist.</p>

            {plans.length > 1 ? (
              <label className="field compact-field">
                <span>Plan</span>
                <select value={activePlan?.id ?? ""} onChange={(event) => setSelectedPlanId(event.target.value)}>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title} | {plan.date}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {error ? <ErrorState label={error} action={<button className="button secondary" onClick={refresh}>Retry</button>} /> : null}
            {actionError ? <ErrorState label={actionError} /> : null}
            {isLoading ? <LoadingState label="Loading your plans..." /> : null}

            {detailedWarnings.length ? (
              <div className="grid">
                {detailedWarnings.map((warning, index) => {
                  const pairedTitles = warning.linkedItems.map((item) => item.event.title);
                  return (
                    <div className="warning" key={warning.id ?? `${warning.type}-${index}`}>
                      <strong>{warning.message}</strong>
                      {pairedTitles.length > 0 ? (
                        <div className="subtle">
                          {pairedTitles.length === 1 ? `Affects ${pairedTitles[0]}` : `Involves ${pairedTitles.join(" and ")}`}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            <section className="section planner-board">
              {!isLoading && !activePlan ? (
                <EmptyState title="No plan yet" body="Create a plan here, or add an event from Discover and one will be created for you." />
              ) : null}
              {activePlan && activePlan.items.length === 0 ? (
                <EmptyState
                  title="Your timeline is empty"
                  body="Add events from Discover or Saved to start shaping the day."
                  action={<Link className="button secondary" href="/discover">Find events</Link>}
                />
              ) : null}
              {activePlan?.items.map((item) => (
                <article className="timeline-item" key={item.id}>
                  <div className="timeline-time">{formatTimeRange(item.startAtOverride ?? item.event.startsAt, item.endAtOverride ?? item.event.endsAt)}</div>
                  <div>
                    <h3>{item.event.title}</h3>
                    <p className="subtle">{item.event.venueName} in {item.event.neighborhood}</p>
                    <div className="why">{item.event.recommendation.label}</div>
                    {conflictMap.get(item.id)?.length ? (
                      <div className="warning inline">
                        Conflicts with {conflictMap.get(item.id)?.join(", ")}
                      </div>
                    ) : null}
                  </div>
                  <div className="actions">
                    <button className="button secondary" type="button" onClick={() => void move(item.id, -1)} disabled={pendingItemId === item.id}>
                      Up
                    </button>
                    <button className="button secondary" type="button" onClick={() => void move(item.id, 1)} disabled={pendingItemId === item.id}>
                      Down
                    </button>
                    <button className="button danger" type="button" onClick={() => void remove(item.id)} disabled={pendingItemId === item.id}>
                      {pendingItemId === item.id ? "Working..." : "Remove"}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </div>
          <aside className="panel sticky-panel">
            <h3>Create a plan</h3>
            <p className="subtle">The backend supports multiple plans, so users can keep one per date or intent.</p>
            <form className="form-stack compact-stack" onSubmit={createPlan}>
              <label className="field">
                <span>Title</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="field">
                <span>Date</span>
                <input type="date" value={planDate} onChange={(event) => setPlanDate(event.target.value)} />
              </label>
              <button className="button" type="submit" disabled={isCreating || !title.trim() || !planDate}>
                {isCreating ? "Creating..." : "Create plan"}
              </button>
            </form>
            <div className="actions">
              <Link className="button secondary" href="/saved">
                Add saved events
              </Link>
              <Link className="button secondary" href="/discover">
                Find more
              </Link>
            </div>
          </aside>
        </section>
      </RequireAuth>
    </AppShell>
  );
}
