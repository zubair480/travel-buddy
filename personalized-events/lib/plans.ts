import { api } from "./api";
import type { BackendItineraryCollection } from "./types";

function defaultPlanDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function ensurePrimaryPlan() {
  const plansPayload = await api<{ data: BackendItineraryCollection[] }>("me/itineraries");
  const existingPlan = plansPayload.data[0];
  if (existingPlan) {
    return existingPlan.plan.id;
  }

  const created = await api<{ data: { id: string } }>("me/itineraries", {
    method: "POST",
    body: JSON.stringify({
      planDate: defaultPlanDate(),
      title: "My SF day",
      notes: "Created from the app.",
    }),
  });

  return created.data.id;
}
