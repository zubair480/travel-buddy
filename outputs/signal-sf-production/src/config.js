import path from "node:path";

export function getConfig(rootDir) {
  return {
    appName: "Signal SF",
    port: Number(process.env.PORT ?? 4180),
    databasePath: process.env.DATABASE_PATH ?? path.join(rootDir, "data", "signal-sf.db"),
    adminIngestToken: process.env.ADMIN_INGEST_TOKEN ?? "dev-admin-token",
    sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),
    cookieName: "signal_sf_session",
    sourceIngestion: {
      eventbriteToken: process.env.EVENTBRITE_TOKEN ?? "",
      meetupToken: process.env.MEETUP_TOKEN ?? "",
      lumaIcsUrls: parseListEnv(process.env.LUMA_ICS_URLS),
      cerebralValleyIcsUrls: parseListEnv(process.env.CEREBRAL_VALLEY_ICS_URLS),
      pieSocialIcsUrls: parseListEnv(process.env.PIE_SOCIAL_ICS_URLS),
      sfEventFeedUrls: parseListEnv(process.env.SF_EVENT_FEED_URLS),
      scrapeEventUrls: parseListEnv(process.env.SCRAPE_EVENT_URLS),
      enablePublicEventScraping: process.env.ENABLE_PUBLIC_EVENT_SCRAPING === "true",
    },
  };
}

function parseListEnv(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
