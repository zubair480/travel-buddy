const state = {
  bootstrap: null,
  plans: [],
  activePlanId: null,
  selectedEventId: null,
  filters: {
    date: "",
    q: "",
    categories: [],
    neighborhoods: [],
    sort: "recommended",
  },
};

const elements = {
  preferencesForm: document.querySelector("#preferencesForm"),
  filtersForm: document.querySelector("#filtersForm"),
  recommendationsGrid: document.querySelector("#recommendationsGrid"),
  recommendationsMeta: document.querySelector("#recommendationsMeta"),
  savedList: document.querySelector("#savedList"),
  plannerSummary: document.querySelector("#plannerSummary"),
  plannerWarnings: document.querySelector("#plannerWarnings"),
  plannerItems: document.querySelector("#plannerItems"),
  planSelect: document.querySelector("#planSelect"),
  exploreGrid: document.querySelector("#exploreGrid"),
  detailTitle: document.querySelector("#detailTitle"),
  detailView: document.querySelector("#detailView"),
  refreshButton: document.querySelector("#refreshButton"),
  createPlanButton: document.querySelector("#createPlanButton"),
  eventCardTemplate: document.querySelector("#eventCardTemplate"),
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload;
}

function formatMoney(minCents, maxCents) {
  if ((minCents ?? 0) === 0 && (maxCents ?? 0) === 0) return "Free";
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (minCents != null && maxCents != null && minCents !== maxCents) {
    return `${formatter.format(minCents / 100)}-${formatter.format(maxCents / 100)}`;
  }
  const value = maxCents ?? minCents;
  return formatter.format((value ?? 0) / 100);
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getBootstrapCategoryOptions() {
  return state.bootstrap.categories
    .map((category) => `<label class="checkbox-pill"><input type="checkbox" name="interest" value="${category}" /> ${category}</label>`)
    .join("");
}

function getNeighborhoodOptions(selected) {
  return state.bootstrap.neighborhoods
    .map(
      (neighborhood) =>
        `<label class="checkbox-pill"><input type="checkbox" name="neighborhood" value="${neighborhood.slug}" ${selected.includes(neighborhood.slug) ? "checked" : ""} /> ${neighborhood.name}</label>`,
    )
    .join("");
}

function renderPreferencesForm() {
  const preferences = state.bootstrap.preferences;
  elements.preferencesForm.innerHTML = `
    <div class="field-group">
      <label class="field-label">Interests</label>
      <div class="checkbox-grid">
        ${state.bootstrap.categories
          .map(
            (category) =>
              `<label class="checkbox-pill"><input type="checkbox" name="interest" value="${category}" ${preferences.interests.includes(category) ? "checked" : ""} /> ${category}</label>`,
          )
          .join("")}
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">Preferred neighborhoods</label>
      <div class="checkbox-grid">${getNeighborhoodOptions(preferences.preferredNeighborhoodSlugs)}</div>
    </div>
    <div class="field-row">
      <div class="field-group">
        <label class="field-label" for="budgetMax">Budget cap</label>
        <input id="budgetMax" class="text-input" name="budgetMaxCents" type="number" min="0" step="500" value="${preferences.budgetMaxCents ?? 5000}" />
      </div>
      <div class="field-group">
        <label class="field-label" for="groupContext">Going with</label>
        <select id="groupContext" class="select-control" name="groupContext">
          ${["solo", "date", "friends", "family"]
            .map((value) => `<option value="${value}" ${preferences.groupContext === value ? "selected" : ""}>${value}</option>`)
            .join("")}
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field-group">
        <label class="field-label" for="indoorPreference">Indoor vs outdoor</label>
        <select id="indoorPreference" class="select-control" name="indoorPreference">
          ${["mixed", "indoor", "outdoor"]
            .map((value) => `<option value="${value}" ${preferences.indoorPreference === value ? "selected" : ""}>${value}</option>`)
            .join("")}
        </select>
      </div>
      <div class="field-group">
        <label class="field-label" for="preferredDayParts">Preferred day part</label>
        <select id="preferredDayParts" class="select-control" name="preferredDayPart">
          ${["morning", "afternoon", "evening", "late_night"]
            .map((value) => `<option value="${value}" ${preferences.preferredDayParts.includes(value) ? "selected" : ""}>${value}</option>`)
            .join("")}
        </select>
      </div>
    </div>
    <button class="primary-button" type="submit">Update taste profile</button>
  `;

  elements.preferencesForm.onsubmit = submitPreferences;
}

async function submitPreferences(event) {
  event.preventDefault();
  const form = new FormData(elements.preferencesForm);
  const interests = form.getAll("interest");
  const preferredNeighborhoodSlugs = form.getAll("neighborhood");
  const budgetMaxCents = Number(form.get("budgetMaxCents") ?? 5000);
  const groupContext = String(form.get("groupContext") ?? "friends");
  const indoorPreference = String(form.get("indoorPreference") ?? "mixed");
  const preferredDayPart = String(form.get("preferredDayPart") ?? "evening");

  await api("/api/me/preferences", {
    method: "PUT",
    body: JSON.stringify({
      interests,
      preferredNeighborhoodSlugs,
      preferredDaysOfWeek: [5, 6],
      preferredDayParts: [preferredDayPart],
      indoorPreference,
      budgetMinCents: 0,
      budgetMaxCents,
      maxTravelMinutes: 30,
      groupContext,
      dislikedCategories: [],
    }),
  });

  await refresh();
}

function renderFilters() {
  elements.filtersForm.innerHTML = `
    <input class="text-input" id="searchInput" type="search" placeholder="Search title or tag" value="${state.filters.q}" />
    <input class="text-input" id="dateInput" type="date" value="${state.filters.date}" />
    <select class="select-control" id="sortInput">
      ${[
        ["recommended", "Recommended"],
        ["soonest", "Soonest"],
        ["popular", "Popular"],
        ["price_low_to_high", "Price low to high"],
      ]
        .map(([value, label]) => `<option value="${value}" ${state.filters.sort === value ? "selected" : ""}>${label}</option>`)
        .join("")}
    </select>
    <button class="secondary-button" type="submit">Apply</button>
  `;

  elements.filtersForm.onsubmit = async (event) => {
    event.preventDefault();
    state.filters.q = document.querySelector("#searchInput").value.trim();
    state.filters.date = document.querySelector("#dateInput").value;
    state.filters.sort = document.querySelector("#sortInput").value;
    await renderEventCollections();
  };
}

function buildEventCard(card, { compact = false } = {}) {
  const fragment = elements.eventCardTemplate.content.cloneNode(true);
  const root = fragment.querySelector(".event-card");
  const [kicker, saveButton, title, description, meta, reasons, detailButton, planButton] = [
    fragment.querySelector(".event-kicker"),
    fragment.querySelector(".event-save-button"),
    fragment.querySelector(".event-title"),
    fragment.querySelector(".event-description"),
    fragment.querySelector(".event-meta"),
    fragment.querySelector(".reason-chips"),
    fragment.querySelector(".detail-button"),
    fragment.querySelector(".plan-button"),
  ];

  kicker.textContent = `${card.event.category} · ${card.neighborhood?.name ?? "SF"}`;
  saveButton.textContent = card.saved ? "Saved" : "Save";
  title.textContent = card.event.title;
  description.textContent = card.event.shortDescription ?? card.event.description ?? "";

  meta.innerHTML = [
    `<span class="meta-pill">${formatDateTime(card.event.startAt)}</span>`,
    `<span class="meta-pill">${formatMoney(card.event.priceMinCents, card.event.priceMaxCents)}</span>`,
    `<span class="meta-pill">${card.venue?.name ?? "Venue TBA"}</span>`,
  ].join("");

  reasons.innerHTML = (card.recommendation?.reasons ?? [])
    .slice(0, compact ? 1 : 2)
    .map((reason) => `<span class="reason-chip">${reason}</span>`)
    .join("");

  saveButton.addEventListener("click", async () => {
    if (card.saved) {
      await api(`/api/me/saved-events/${card.event.id}`, { method: "DELETE" });
    } else {
      await api("/api/me/saved-events", {
        method: "POST",
        body: JSON.stringify({ eventId: card.event.id }),
      });
    }
    await refresh();
  });

  detailButton.addEventListener("click", async () => {
    state.selectedEventId = card.event.id;
    await renderDetail();
  });

  planButton.addEventListener("click", async () => {
    if (!state.activePlanId) return;
    await api(`/api/me/itineraries/${state.activePlanId}/items`, {
      method: "POST",
      body: JSON.stringify({ eventId: card.event.id }),
    });
    await refreshPlans();
  });

  return root;
}

async function fetchRecommendations() {
  const params = new URLSearchParams();
  if (state.filters.date) params.set("date", state.filters.date);
  if (state.filters.q) params.set("q", state.filters.q);
  if (state.filters.sort) params.set("sort", state.filters.sort);

  const [recommended, explore] = await Promise.all([
    api(`/api/me/recommendations?${params.toString()}`),
    api(`/api/events?${params.toString()}`),
  ]);

  return { recommended: recommended.data, recommendedMeta: recommended.meta, explore: explore.data };
}

async function renderEventCollections() {
  const { recommended, recommendedMeta, explore } = await fetchRecommendations();
  elements.recommendationsMeta.textContent = `${recommendedMeta.total} total events in this SF demo. Sorted by ${state.filters.sort.replaceAll("_", " ")}.`;
  elements.recommendationsGrid.replaceChildren(...recommended.slice(0, 6).map((card) => buildEventCard(card)));
  elements.exploreGrid.replaceChildren(...explore.map((card) => buildEventCard(card, { compact: true })));
}

function buildStackCard({ title, subtext, tags = [], actions = [] }) {
  const root = document.createElement("article");
  root.className = "stack-card";
  root.innerHTML = `
    <div class="stack-card-header">
      <div>
        <h3 class="stack-title">${title}</h3>
        <p class="stack-subtext">${subtext}</p>
      </div>
      <div class="event-actions"></div>
    </div>
    <div class="stack-tags">${tags.map((tag) => `<span class="tag-chip">${tag}</span>`).join("")}</div>
  `;

  const actionRoot = root.querySelector(".event-actions");
  actions.forEach((action) => actionRoot.appendChild(action));
  return root;
}

async function renderSaved() {
  const payload = await api("/api/me/saved-events");
  if (payload.data.length === 0) {
    elements.savedList.innerHTML = `<div class="empty-detail">Saved events will show up here once you shortlist them.</div>`;
    return;
  }

  const cards = payload.data.map((item) =>
    buildStackCard({
      title: item.event.title,
      subtext: `${formatDateTime(item.event.startAt)} · ${item.neighborhood?.name ?? "SF"} · ${formatMoney(item.event.priceMinCents, item.event.priceMaxCents)}`,
      tags: item.recommendation.reasons.slice(0, 2),
      actions: [
        Object.assign(document.createElement("button"), {
          className: "secondary-button small-button",
          textContent: "Details",
          onclick: async () => {
            state.selectedEventId = item.event.id;
            await renderDetail();
          },
        }),
      ],
    }),
  );

  elements.savedList.replaceChildren(...cards);
}

async function refreshPlans() {
  const payload = await api("/api/me/itineraries");
  const plans = payload.data;
  state.plans = plans;

  if (!state.activePlanId && plans.length > 0) {
    state.activePlanId = plans[0].plan.id;
  }

  elements.planSelect.innerHTML = plans
    .map((item) => `<option value="${item.plan.id}" ${state.activePlanId === item.plan.id ? "selected" : ""}>${item.plan.title} · ${item.plan.planDate}</option>`)
    .join("");

  elements.planSelect.onchange = async () => {
    state.activePlanId = elements.planSelect.value;
    await refreshPlans();
  };

  const active = plans.find((item) => item.plan.id === state.activePlanId);
  if (!active) {
    elements.plannerSummary.innerHTML = "Create a plan to start building a route.";
    elements.plannerWarnings.innerHTML = "";
    elements.plannerItems.innerHTML = "";
    return;
  }

  elements.plannerSummary.innerHTML = `${active.plan.title} · ${active.plan.planDate}<br />${active.plan.notes ?? ""}`;

  if (active.warnings.length === 0) {
    elements.plannerWarnings.innerHTML = `<div class="warning-item info">No timing conflicts right now. This route looks feasible.</div>`;
  } else {
    elements.plannerWarnings.replaceChildren(
      ...active.warnings.map((warning) => {
        const root = document.createElement("div");
        root.className = `warning-item ${warning.severity}`;
        root.textContent = warning.message;
        return root;
      }),
    );
  }

  const plannerCards = active.items.map((item, index) =>
    buildStackCard({
      title: `${index + 1}. ${item.event.title}`,
      subtext: `${formatDateTime(item.event.startAt)} · ${item.neighborhood?.name ?? "SF"} · ${item.venue?.name ?? "Venue TBA"}`,
      tags: [item.event.category, formatMoney(item.event.priceMinCents, item.event.priceMaxCents)],
      actions: [
        Object.assign(document.createElement("button"), {
          className: "secondary-button small-button",
          textContent: "Up",
          disabled: index === 0,
          onclick: async () => {
            await reorderPlanItem(item.item.id, -1);
          },
        }),
        Object.assign(document.createElement("button"), {
          className: "secondary-button small-button",
          textContent: "Down",
          disabled: index === active.items.length - 1,
          onclick: async () => {
            await reorderPlanItem(item.item.id, 1);
          },
        }),
        Object.assign(document.createElement("button"), {
          className: "secondary-button small-button",
          textContent: "Remove",
          onclick: async () => {
            await api(`/api/me/itineraries/${active.plan.id}/items/${item.item.id}`, { method: "DELETE" });
            await refreshPlans();
          },
        }),
      ],
    }),
  );

  elements.plannerItems.replaceChildren(...plannerCards);
}

async function reorderPlanItem(itemId, direction) {
  const active = state.plans.find((item) => item.plan.id === state.activePlanId);
  if (!active) return;
  const ids = active.items.map((item) => item.item.id);
  const currentIndex = ids.indexOf(itemId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ids.length) return;

  [ids[currentIndex], ids[nextIndex]] = [ids[nextIndex], ids[currentIndex]];

  await api(`/api/me/itineraries/${state.activePlanId}/items/reorder`, {
    method: "POST",
    body: JSON.stringify({ itemIdsInOrder: ids }),
  });
  await refreshPlans();
}

async function renderDetail() {
  if (!state.selectedEventId) {
    elements.detailTitle.textContent = "Select an event";
    elements.detailView.className = "detail-view empty-detail";
    elements.detailView.textContent = "Choose an event card to inspect its timing, recommendation reasons, and planner fit.";
    return;
  }

  const payload = await api(`/api/events/${state.selectedEventId}`);
  const { event, neighborhood, venue, recommendation } = payload.data;

  elements.detailTitle.textContent = event.title;
  elements.detailView.className = "detail-view";
  elements.detailView.innerHTML = `
    <article class="detail-pane">
      <div class="detail-head">
        <div>
          <p class="event-kicker">${event.category} · ${neighborhood?.name ?? "SF"}</p>
          <h3 class="stack-title">${event.title}</h3>
        </div>
        <span class="meta-pill">Score ${recommendation.score}</span>
      </div>
      <p class="detail-copy">${event.description ?? event.shortDescription ?? ""}</p>
      <div class="event-meta">
        <span class="meta-pill">${formatDateTime(event.startAt)}</span>
        <span class="meta-pill">${formatMoney(event.priceMinCents, event.priceMaxCents)}</span>
        <span class="meta-pill">${venue?.name ?? "Venue TBA"}</span>
        <span class="meta-pill">${event.ageRestriction === "all_ages" ? "All ages" : event.ageRestriction === "18_plus" ? "18+" : "21+"}</span>
      </div>
      <div class="reason-chips">
        ${recommendation.reasons.map((reason) => `<span class="reason-chip">${reason}</span>`).join("")}
      </div>
      <div class="stack-tags">
        ${event.tags.map((tag) => `<span class="tag-chip">${tag}</span>`).join("")}
      </div>
    </article>
  `;
}

async function createPlan() {
  const defaultDate = state.filters.date || "2026-07-12";
  await api("/api/me/itineraries", {
    method: "POST",
    body: JSON.stringify({
      planDate: defaultDate,
      title: `New plan ${defaultDate}`,
      notes: "Built from the recommendation feed.",
    }),
  });
  await refresh();
}

async function refresh() {
  const payload = await api("/api/bootstrap");
  state.bootstrap = payload.data;
  if (!state.activePlanId && payload.data.plans[0]) {
    state.activePlanId = payload.data.plans[0].id;
  }
  renderPreferencesForm();
  renderFilters();
  await renderEventCollections();
  await renderSaved();
  await refreshPlans();
  await renderDetail();
}

elements.refreshButton.addEventListener("click", refresh);
elements.createPlanButton.addEventListener("click", createPlan);

refresh().catch((error) => {
  document.body.innerHTML = `<pre style="padding:20px">${error.message}</pre>`;
});
