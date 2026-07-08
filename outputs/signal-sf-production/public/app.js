const state = {
  me: null,
  bootstrap: null,
  plans: [],
  activePlanId: null,
  selectedEventId: null,
  filters: { q: "", date: "", sort: "recommended" },
};

const GOAL_OPTIONS = [
  ["learn", "Learn"],
  ["find_job", "Find a job"],
  ["build_startup", "Build a startup"],
  ["connect_in_tech", "Connect in tech"],
  ["hire_people", "Hire people"],
  ["find_cofounder", "Find a cofounder"],
];

const $ = (selector) => document.querySelector(selector);

const ui = {
  authView: $("#authView"),
  appView: $("#appView"),
  authActions: $("#authActions"),
  heroTitle: $("#heroTitle"),
  heroText: $("#heroText"),
  profileSummary: $("#profileSummary"),
  onboardingPanel: $("#onboardingPanel"),
  preferencesForm: $("#preferencesForm"),
  filtersForm: $("#filtersForm"),
  recommendations: $("#recommendations"),
  savedEvents: $("#savedEvents"),
  planSelect: $("#planSelect"),
  plannerSummary: $("#plannerSummary"),
  plannerWarnings: $("#plannerWarnings"),
  plannerItems: $("#plannerItems"),
  explore: $("#explore"),
  detailHeading: $("#detailHeading"),
  detailPanel: $("#detailPanel"),
  refreshButton: $("#refreshButton"),
  newPlanButton: $("#newPlanButton"),
  eventCardTemplate: $("#eventCardTemplate"),
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    credentials: "same-origin",
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload;
}

function money(min, max) {
  if ((min ?? 0) === 0 && (max ?? 0) === 0) return "Free";
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (min != null && max != null && min !== max) return `${fmt.format(min / 100)}-${fmt.format(max / 100)}`;
  return fmt.format((max ?? min ?? 0) / 100);
}

function datetime(iso) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function commaSplit(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderAuth() {
  ui.authActions.innerHTML = state.me?.authenticated ? `<button id="logoutButton" class="secondary-button">Logout</button>` : "";

  const logoutButton = $("#logoutButton");
  if (logoutButton) {
    logoutButton.onclick = async () => {
      await api("/api/auth/logout", { method: "POST" });
      state.me = null;
      state.bootstrap = null;
      await init();
    };
  }

  if (state.me?.authenticated) {
    ui.authView.classList.add("hidden");
    ui.appView.classList.remove("hidden");
    return;
  }

  ui.appView.classList.add("hidden");
  ui.authView.classList.remove("hidden");
  ui.authView.innerHTML = `
    <article class="auth-card">
      <p class="eyebrow">Login</p>
      <h3>Existing account</h3>
      <p class="body-copy">Demo user: <code>demo@signalsf.local</code> / <code>demo12345</code></p>
      <form id="loginForm" class="form-stack">
        <input class="field" name="email" type="email" placeholder="Email" value="demo@signalsf.local" required />
        <input class="field" name="password" type="password" placeholder="Password" value="demo12345" required />
        <button class="primary-button" type="submit">Login</button>
      </form>
    </article>
    <article class="auth-card">
      <p class="eyebrow">Register</p>
      <h3>Create account</h3>
      <form id="registerForm" class="form-stack">
        <input class="field" name="displayName" type="text" placeholder="Display name" required />
        <input class="field" name="email" type="email" placeholder="Email" required />
        <input class="field" name="password" type="password" placeholder="Password" minlength="8" required />
        <button class="primary-button" type="submit">Register</button>
      </form>
    </article>
  `;

  $("#loginForm").onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    await api("/api/auth/login", { method: "POST", body: JSON.stringify(data) });
    await init();
  };

  $("#registerForm").onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    await api("/api/auth/register", { method: "POST", body: JSON.stringify(data) });
    await init();
  };
}

function renderProfileSummary() {
  const profile = state.bootstrap.profile;
  ui.profileSummary.innerHTML = `
    <p class="eyebrow">Profile context</p>
    <div class="body-copy">
      <strong>Goals:</strong> ${profile.primaryGoals.length ? profile.primaryGoals.join(", ") : "Not set yet"}<br />
      <strong>Stage:</strong> ${profile.currentStage}<br />
      <strong>Roles:</strong> ${profile.targetRoles.length ? profile.targetRoles.join(", ") : "Not set yet"}
    </div>
  `;
}

function renderOnboarding() {
  const profile = state.bootstrap.profile;
  ui.onboardingPanel.classList.remove("hidden");
  ui.onboardingPanel.innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">Context first</p>
        <h3>${profile.onboardingCompleted ? "Profile and goals" : "Tell Signal SF what you're optimizing for"}</h3>
      </div>
    </div>
    <form id="profileForm" class="form-stack">
      <div class="onboarding-grid">
        <div class="span-2">
          <label class="body-copy">Primary goals</label>
          <div class="checkbox-grid">
            ${GOAL_OPTIONS.map(([value, label]) => `<label class="check"><input type="checkbox" name="primaryGoal" value="${value}" ${profile.primaryGoals.includes(value) ? "checked" : ""} /> ${label}</label>`).join("")}
          </div>
        </div>
        <div>
          <label class="body-copy">Current stage</label>
          <select class="field" name="currentStage">
            ${["student", "exploring", "early_career", "mid_career", "founder", "operator", "investor"].map((value) => `<option value="${value}" ${profile.currentStage === value ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="body-copy">Experience level</label>
          <select class="field" name="experienceLevel">
            ${["beginner", "intermediate", "advanced"].map((value) => `<option value="${value}" ${profile.experienceLevel === value ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="body-copy">Target roles</label>
          <input class="field" name="targetRoles" type="text" value="${profile.targetRoles.join(", ")}" placeholder="founding engineer, PM, designer" />
        </div>
        <div>
          <label class="body-copy">Skills or themes</label>
          <input class="field" name="skills" type="text" value="${profile.skills.join(", ")}" placeholder="AI, product, GTM, frontend" />
        </div>
        <div>
          <label class="body-copy">Preferred company stage</label>
          <select class="field" name="preferredCompanyStage">
            ${["", "startup", "pre_seed", "seed", "series_a_plus", "big_tech", "open"].map((value) => `<option value="${value}" ${profile.preferredCompanyStage === value ? "selected" : ""}>${value || "not specified"}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="body-copy">City / base</label>
          <input class="field" name="cityHint" type="text" value="${profile.cityHint ?? ""}" placeholder="San Francisco" />
        </div>
        <div class="span-2">
          <label class="body-copy">Networking intent</label>
          <textarea class="field textarea" name="networkingIntent" placeholder="Who do you want to meet, and why?">${profile.networkingIntent ?? ""}</textarea>
        </div>
        <div class="span-2">
          <label class="body-copy">Short bio</label>
          <textarea class="field textarea" name="bio" placeholder="A short summary of your background and what you're after.">${profile.bio ?? ""}</textarea>
        </div>
        <div class="span-2">
          <label class="body-copy">Resume / CV / LinkedIn summary</label>
          <textarea class="field textarea" name="resumeText" placeholder="Paste your CV, highlights, or the kind of work you've done.">${profile.resumeText ?? ""}</textarea>
        </div>
      </div>
      <button class="primary-button" type="submit">${profile.onboardingCompleted ? "Update profile" : "Complete onboarding"}</button>
    </form>
  `;

  $("#profileForm").onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/me/profile", {
      method: "PUT",
      body: JSON.stringify({
        onboardingCompleted: true,
        primaryGoals: form.getAll("primaryGoal"),
        currentStage: String(form.get("currentStage") ?? "exploring"),
        experienceLevel: String(form.get("experienceLevel") ?? "intermediate"),
        targetRoles: commaSplit(form.get("targetRoles")),
        skills: commaSplit(form.get("skills")),
        networkingIntent: String(form.get("networkingIntent") ?? ""),
        preferredCompanyStage: String(form.get("preferredCompanyStage") ?? ""),
        bio: String(form.get("bio") ?? ""),
        resumeText: String(form.get("resumeText") ?? ""),
        cityHint: String(form.get("cityHint") ?? "San Francisco"),
      }),
    });
    await loadBootstrap();
  };
}

function renderPreferences() {
  const prefs = state.bootstrap.preferences;
  ui.preferencesForm.innerHTML = `
    <div class="checkbox-grid">
      ${state.bootstrap.categories
        .map((category) => `<label class="check"><input type="checkbox" name="interest" value="${category}" ${prefs.interests.includes(category) ? "checked" : ""} /> ${category}</label>`)
        .join("")}
    </div>
    <div class="checkbox-grid">
      ${state.bootstrap.neighborhoods
        .map((n) => `<label class="check"><input type="checkbox" name="neighborhood" value="${n.slug}" ${prefs.preferredNeighborhoodSlugs.includes(n.slug) ? "checked" : ""} /> ${n.name}</label>`)
        .join("")}
    </div>
    <input class="field" name="budgetMaxCents" type="number" min="0" step="500" value="${prefs.budgetMaxCents ?? 5000}" />
    <select class="field" name="indoorPreference">
      ${["mixed", "indoor", "outdoor"].map((value) => `<option value="${value}" ${prefs.indoorPreference === value ? "selected" : ""}>${value}</option>`).join("")}
    </select>
    <select class="field" name="preferredDayPart">
      ${["morning", "afternoon", "evening", "late_night"].map((value) => `<option value="${value}" ${prefs.preferredDayParts.includes(value) ? "selected" : ""}>${value}</option>`).join("")}
    </select>
    <select class="field" name="groupContext">
      ${["solo", "date", "friends", "family"].map((value) => `<option value="${value}" ${prefs.groupContext === value ? "selected" : ""}>${value}</option>`).join("")}
    </select>
    <button class="primary-button" type="submit">Save taste profile</button>
  `;

  ui.preferencesForm.onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/me/preferences", {
      method: "PUT",
      body: JSON.stringify({
        interests: form.getAll("interest"),
        dislikedCategories: [],
        preferredNeighborhoodSlugs: form.getAll("neighborhood"),
        preferredDaysOfWeek: [5, 6],
        preferredDayParts: [String(form.get("preferredDayPart"))],
        indoorPreference: String(form.get("indoorPreference")),
        budgetMinCents: 0,
        budgetMaxCents: Number(form.get("budgetMaxCents")),
        maxTravelMinutes: 30,
        groupContext: String(form.get("groupContext")),
      }),
    });
    await loadBootstrap();
  };
}

function renderFilters() {
  ui.filtersForm.innerHTML = `
    <input class="field" id="searchInput" type="search" placeholder="Search title, description, or tag" value="${state.filters.q}" />
    <input class="field" id="dateInput" type="date" value="${state.filters.date}" />
    <select class="field" id="sortInput">
      ${[
        ["recommended", "Recommended"],
        ["soonest", "Soonest"],
        ["popular", "Popular"],
        ["price_low_to_high", "Price low to high"],
      ].map(([value, label]) => `<option value="${value}" ${state.filters.sort === value ? "selected" : ""}>${label}</option>`).join("")}
    </select>
    <button class="secondary-button" type="submit">Apply</button>
  `;

  ui.filtersForm.onsubmit = async (event) => {
    event.preventDefault();
    state.filters.q = $("#searchInput").value.trim();
    state.filters.date = $("#dateInput").value;
    state.filters.sort = $("#sortInput").value;
    await renderFeeds();
  };
}

function eventCard(card) {
  const fragment = ui.eventCardTemplate.content.cloneNode(true);
  const root = fragment.querySelector(".card");
  fragment.querySelector(".event-eyebrow").textContent = `${card.event.category} · ${card.neighborhood?.name ?? "SF"}`;
  fragment.querySelector(".save-toggle").textContent = card.saved ? "Saved" : "Save";
  fragment.querySelector(".card-title").textContent = card.event.title;
  fragment.querySelector(".card-copy").textContent = card.event.shortDescription || card.event.description || "";
  fragment.querySelector(".meta-row").innerHTML = [
    `<span class="chip meta">${datetime(card.event.startAt)}</span>`,
    `<span class="chip meta">${money(card.event.priceMinCents, card.event.priceMaxCents)}</span>`,
    `<span class="chip meta">${card.venue?.name ?? "Venue TBA"}</span>`,
  ].join("");
  fragment.querySelector(".reason-row").innerHTML = (card.recommendation.reasons ?? []).slice(0, 3).map((reason) => `<span class="chip reason">${reason}</span>`).join("");

  fragment.querySelector(".save-toggle").onclick = async () => {
    if (card.saved) {
      await api(`/api/me/saved-events/${card.event.id}`, { method: "DELETE" });
    } else {
      await api("/api/me/saved-events", { method: "POST", body: JSON.stringify({ eventId: card.event.id }) });
    }
    await loadBootstrap();
  };

  fragment.querySelector(".detail-button").onclick = async () => {
    state.selectedEventId = card.event.id;
    await renderDetail();
  };

  fragment.querySelector(".plan-button").onclick = async () => {
    if (!state.activePlanId) return;
    await api(`/api/me/itineraries/${state.activePlanId}/items`, {
      method: "POST",
      body: JSON.stringify({ eventId: card.event.id }),
    });
    await renderPlans();
  };

  return root;
}

async function renderFeeds() {
  const params = new URLSearchParams();
  if (state.filters.q) params.set("q", state.filters.q);
  if (state.filters.date) params.set("date", state.filters.date);
  params.set("sort", state.filters.sort);
  const [reco, all] = await Promise.all([
    api(`/api/me/recommendations?${params.toString()}`),
    api(`/api/events?${params.toString()}`),
  ]);
  ui.recommendations.replaceChildren(...reco.data.slice(0, 6).map(eventCard));
  ui.explore.replaceChildren(...all.data.map(eventCard));
}

function stackCard({ title, body, chips, actions }) {
  const root = document.createElement("article");
  root.className = "stack-card";
  root.innerHTML = `<h4>${title}</h4><p class="body-copy">${body}</p><div class="chip-row">${chips.map((chip) => `<span class="chip tag">${chip}</span>`).join("")}</div><div class="button-row"></div>`;
  const buttonRow = root.querySelector(".button-row");
  actions.forEach((button) => buttonRow.appendChild(button));
  return root;
}

async function renderSaved() {
  const cards = state.bootstrap.saved;
  if (!cards.length) {
    ui.savedEvents.innerHTML = `<div class="detail empty">Save a few events and your shortlist will show up here.</div>`;
    return;
  }

  ui.savedEvents.replaceChildren(
    ...cards.map((card) =>
      stackCard({
        title: card.event.title,
        body: `${datetime(card.event.startAt)} · ${card.neighborhood?.name ?? "SF"} · ${money(card.event.priceMinCents, card.event.priceMaxCents)}`,
        chips: card.recommendation.reasons.slice(0, 2),
        actions: [
          Object.assign(document.createElement("button"), {
            className: "secondary-button small",
            textContent: "Details",
            onclick: async () => {
              state.selectedEventId = card.event.id;
              await renderDetail();
            },
          }),
        ],
      }),
    ),
  );
}

async function renderPlans() {
  const payload = await api("/api/me/itineraries");
  state.plans = payload.data;
  if (!state.activePlanId && state.plans[0]) state.activePlanId = state.plans[0].plan.id;
  ui.planSelect.innerHTML = state.plans.map((plan) => `<option value="${plan.plan.id}" ${plan.plan.id === state.activePlanId ? "selected" : ""}>${plan.plan.title} · ${plan.plan.planDate}</option>`).join("");
  ui.planSelect.onchange = async () => {
    state.activePlanId = ui.planSelect.value;
    await renderPlans();
  };

  const active = state.plans.find((item) => item.plan.id === state.activePlanId);
  if (!active) {
    ui.plannerSummary.textContent = "Create a plan to start building a day.";
    ui.plannerWarnings.innerHTML = "";
    ui.plannerItems.innerHTML = "";
    return;
  }

  ui.plannerSummary.textContent = `${active.plan.title} · ${active.plan.planDate}${active.plan.notes ? ` · ${active.plan.notes}` : ""}`;
  ui.plannerWarnings.replaceChildren(
    ...(active.warnings.length
      ? active.warnings.map((warning) => {
          const node = document.createElement("div");
          node.className = `warning ${warning.severity}`;
          node.textContent = warning.message;
          return node;
        })
      : [Object.assign(document.createElement("div"), { className: "warning info", textContent: "No current schedule conflicts." })]),
  );

  ui.plannerItems.replaceChildren(
    ...active.items.map((entry, index) =>
      stackCard({
        title: `${index + 1}. ${entry.event.title}`,
        body: `${datetime(entry.event.startAt)} · ${entry.neighborhood?.name ?? "SF"} · ${entry.venue?.name ?? "Venue TBA"}`,
        chips: [entry.event.category, money(entry.event.priceMinCents, entry.event.priceMaxCents)],
        actions: [
          Object.assign(document.createElement("button"), {
            className: "secondary-button small",
            textContent: "Up",
            disabled: index === 0,
            onclick: async () => reorderPlanItem(entry.item.id, -1),
          }),
          Object.assign(document.createElement("button"), {
            className: "secondary-button small",
            textContent: "Down",
            disabled: index === active.items.length - 1,
            onclick: async () => reorderPlanItem(entry.item.id, 1),
          }),
          Object.assign(document.createElement("button"), {
            className: "secondary-button small",
            textContent: "Remove",
            onclick: async () => {
              await api(`/api/me/itineraries/${active.plan.id}/items/${entry.item.id}`, { method: "DELETE" });
              await renderPlans();
            },
          }),
        ],
      }),
    ),
  );
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
  await renderPlans();
}

async function renderDetail() {
  if (!state.selectedEventId) {
    ui.detailHeading.textContent = "Select an event";
    ui.detailPanel.className = "detail empty";
    ui.detailPanel.textContent = "Click any event to inspect recommendation reasons and planner fit.";
    return;
  }

  const payload = await api(`/api/events/${state.selectedEventId}`);
  const card = payload.data;
  ui.detailHeading.textContent = card.event.title;
  ui.detailPanel.className = "detail";
  ui.detailPanel.innerHTML = `
    <article class="detail-pane">
      <p class="eyebrow">${card.event.category} · ${card.neighborhood?.name ?? "SF"}</p>
      <h4>${card.event.title}</h4>
      <p class="body-copy">${card.event.description ?? card.event.shortDescription ?? ""}</p>
      <div class="chip-row">
        <span class="chip meta">${datetime(card.event.startAt)}</span>
        <span class="chip meta">${money(card.event.priceMinCents, card.event.priceMaxCents)}</span>
        <span class="chip meta">${card.venue?.name ?? "Venue TBA"}</span>
      </div>
      <div class="chip-row">
        ${card.recommendation.reasons.map((reason) => `<span class="chip reason">${reason}</span>`).join("")}
      </div>
      <div class="chip-row">
        ${card.event.tags.map((tag) => `<span class="chip tag">${tag}</span>`).join("")}
      </div>
    </article>
  `;
}

async function loadBootstrap() {
  state.bootstrap = (await api("/api/bootstrap")).data;
  const profile = state.bootstrap.profile;
  ui.heroTitle.textContent = `Welcome back, ${state.bootstrap.user.displayName}`;
  ui.heroText.textContent = profile.onboardingCompleted
    ? `You’re optimizing for ${profile.primaryGoals.join(", ")} while tracking ${state.bootstrap.preferences.interests.join(", ")} across ${state.bootstrap.preferences.preferredNeighborhoodSlugs.join(", ")}.`
    : `Start by telling Signal SF whether you're here to learn, find a job, build a startup, or meet people in tech. We'll tune the feed from there.`;

  renderProfileSummary();
  renderOnboarding();
  renderPreferences();
  renderFilters();
  await renderFeeds();
  await renderSaved();
  await renderPlans();
  await renderDetail();
}

async function init() {
  state.me = (await api("/api/me")).data;
  renderAuth();
  if (state.me.authenticated) {
    await loadBootstrap();
  }
}

ui.refreshButton.onclick = () => loadBootstrap();
ui.newPlanButton.onclick = async () => {
  const date = state.filters.date || "2026-07-12";
  await api("/api/me/itineraries", {
    method: "POST",
    body: JSON.stringify({ planDate: date, title: `Plan ${date}`, notes: "Created from the dashboard." }),
  });
  await renderPlans();
};

init().catch((error) => {
  document.body.innerHTML = `<pre style="padding:20px">${error.message}</pre>`;
});
