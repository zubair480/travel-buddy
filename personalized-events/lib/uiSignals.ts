"use client";

export const PROFILE_UPDATED_EVENT = "sf-buddy:profile-updated";
export const PREFERENCES_UPDATED_EVENT = "sf-buddy:preferences-updated";

function emitStorageSignal(key: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, String(Date.now()));
  } catch {
    // Storage can be unavailable in private mode or locked-down browsers.
  }
}

export function broadcastProfileRefresh() {
  if (typeof window === "undefined") return;
  emitStorageSignal(PROFILE_UPDATED_EVENT);
  window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

export function broadcastPreferencesRefresh() {
  if (typeof window === "undefined") return;
  emitStorageSignal(PREFERENCES_UPDATED_EVENT);
  window.dispatchEvent(new Event(PREFERENCES_UPDATED_EVENT));
}
