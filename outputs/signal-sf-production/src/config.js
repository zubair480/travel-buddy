import path from "node:path";

const DEFAULT_PUBLIC_SF_FEED_URLS = [
  "https://www.eventbrite.com/d/ca--san-francisco/events/",
  "https://www.meetup.com/find/?location=us--ca--San%20Francisco&source=EVENTS",
  "https://lu.ma/sf",
];
const DEFAULT_SCRAPLING_SOURCE_URLS = ["https://partiful.com/explore/sf"];

const DEFAULT_PUBLIC_SCRAPE_EVENT_URLS = [
  "https://partiful.com/discover/san-francisco",
  "https://partiful.com/discover",
];

export function getConfig(rootDir) {
  const brightDataBrowserWsEndpoint = buildBrightDataBrowserWsEndpoint({
    endpoint: process.env.BRIGHT_DATA_BROWSER_WS_ENDPOINT,
    username: process.env.BRIGHT_DATA_BROWSER_USERNAME,
    password: process.env.BRIGHT_DATA_BROWSER_PASSWORD,
    host: process.env.BRIGHT_DATA_BROWSER_HOST,
  });

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
      sfEventFeedUrls: parseListEnv(process.env.SF_EVENT_FEED_URLS, DEFAULT_PUBLIC_SF_FEED_URLS),
      scrapeEventUrls: parseListEnv(process.env.SCRAPE_EVENT_URLS, DEFAULT_PUBLIC_SCRAPE_EVENT_URLS),
      enablePublicEventScraping: process.env.ENABLE_PUBLIC_EVENT_SCRAPING ? process.env.ENABLE_PUBLIC_EVENT_SCRAPING === "true" : true,
      brightDataBrowserWsEndpoint,
      brightDataSourceUrls: parseListEnv(process.env.BRIGHT_DATA_SOURCE_URLS),
      enableBrightDataScraping: process.env.ENABLE_BRIGHT_DATA_SCRAPING === "true",
      brightDataMaxPages: Number(process.env.BRIGHT_DATA_MAX_PAGES ?? 12),
      enableScraplingScraping: process.env.ENABLE_SCRAPLING_SCRAPING === "true",
      scraplingSourceUrls: parseListEnv(process.env.SCRAPLING_SOURCE_URLS, DEFAULT_SCRAPLING_SOURCE_URLS),
      scraplingFetchMode: process.env.SCRAPLING_FETCH_MODE ?? "fetcher",
      scraplingPythonBin: process.env.SCRAPLING_PYTHON_BIN ?? "python3",
      scraplingTimeoutMs: Number(process.env.SCRAPLING_TIMEOUT_MS ?? 60000),
      scraplingMaxPages: Number(process.env.SCRAPLING_MAX_PAGES ?? 12),
      scraplingFetcherScriptPath: path.join(rootDir, "tools", "scrapling_fetch.py"),
    },
  };
}

function buildBrightDataBrowserWsEndpoint({ endpoint, username, password, host }) {
  if (endpoint) return endpoint;
  if (!username || !password || !host) return "";

  const normalizedHost = String(host)
    .replace(/^wss?:\/\//i, "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  return `wss://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${normalizedHost}`;
}

function parseListEnv(value, fallback = []) {
  const parsed = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length ? parsed : fallback;
}
