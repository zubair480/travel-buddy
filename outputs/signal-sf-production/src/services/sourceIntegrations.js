const SF_LAT = 37.7749;
const SF_LON = -122.4194;
const DEFAULT_RADIUS_MILES = 20;

const PROVIDERS = {
  eventbrite: {
    label: "Eventbrite",
    mode: "api",
    requires: ["EVENTBRITE_TOKEN"],
  },
  meetup: {
    label: "Meetup",
    mode: "graphql_api",
    requires: ["MEETUP_TOKEN"],
  },
  luma: {
    label: "Luma",
    mode: "configured_ics",
    requires: ["LUMA_ICS_URLS"],
  },
  partiful: {
    label: "Partiful",
    mode: "manual_or_jsonld",
    requires: ["SCRAPE_EVENT_URLS", "ENABLE_PUBLIC_EVENT_SCRAPING=true"],
  },
  "cerebral-valley": {
    label: "Cerebral Valley",
    mode: "configured_ics_or_jsonld",
    requires: ["CEREBRAL_VALLEY_ICS_URLS"],
  },
  "pie-social": {
    label: "Pie Social",
    mode: "configured_ics_or_jsonld",
    requires: ["PIE_SOCIAL_ICS_URLS"],
  },
  "sf-feeds": {
    label: "SF event feeds",
    mode: "configured_ics_rss_or_jsonld",
    requires: ["SF_EVENT_FEED_URLS"],
  },
  "bright-data": {
    label: "Bright Data public page fetcher",
    mode: "rendered_public_pages",
    requires: ["BRIGHT_DATA_BROWSER_WS_ENDPOINT or BRIGHT_DATA_BROWSER_USERNAME/PASSWORD/HOST", "BRIGHT_DATA_SOURCE_URLS", "ENABLE_BRIGHT_DATA_SCRAPING=true"],
  },
};

export function listSourceProviders(config) {
  const sourceConfig = config.sourceIngestion ?? {};
  return Object.entries(PROVIDERS).map(([id, provider]) => ({
    id,
    ...provider,
    configured: isProviderConfigured(id, sourceConfig),
  }));
}

function isProviderConfigured(provider, sourceConfig) {
  if (provider === "eventbrite") return Boolean(sourceConfig.eventbriteToken);
  if (provider === "meetup") return Boolean(sourceConfig.meetupToken);
  if (provider === "luma") return sourceConfig.lumaIcsUrls?.length > 0;
  if (provider === "cerebral-valley") return sourceConfig.cerebralValleyIcsUrls?.length > 0;
  if (provider === "pie-social") return sourceConfig.pieSocialIcsUrls?.length > 0;
  if (provider === "sf-feeds") return sourceConfig.sfEventFeedUrls?.length > 0;
  if (provider === "partiful") return sourceConfig.enablePublicEventScraping && sourceConfig.scrapeEventUrls?.length > 0;
  if (provider === "bright-data") {
    return Boolean(sourceConfig.enableBrightDataScraping && sourceConfig.brightDataBrowserWsEndpoint && sourceConfig.brightDataSourceUrls?.length);
  }
  return false;
}

export async function fetchSourceEvents({ config, providers = [], now = new Date() }) {
  const sourceConfig = config.sourceIngestion ?? {};
  const requestedProviders = providers.length ? providers : Object.keys(PROVIDERS);
  const results = [];

  for (const provider of requestedProviders) {
    try {
      if (provider === "eventbrite") results.push(await fetchEventbriteEvents(sourceConfig, now));
      else if (provider === "meetup") results.push(await fetchMeetupEvents(sourceConfig, now));
      else if (provider === "luma") results.push(await fetchIcsProvider("luma", sourceConfig.lumaIcsUrls ?? []));
      else if (provider === "cerebral-valley") results.push(await fetchIcsProvider("cerebral-valley", sourceConfig.cerebralValleyIcsUrls ?? []));
      else if (provider === "pie-social") results.push(await fetchIcsProvider("pie-social", sourceConfig.pieSocialIcsUrls ?? []));
      else if (provider === "sf-feeds") results.push(await fetchConfiguredFeeds(sourceConfig.sfEventFeedUrls ?? []));
      else if (provider === "partiful") results.push(await fetchPublicJsonLdProvider("partiful", sourceConfig));
      else if (provider === "bright-data") results.push(await fetchBrightDataProvider(sourceConfig));
      else results.push({ provider, imported: [], skipped: true, reason: "Unknown provider" });
    } catch (error) {
      results.push({ provider, imported: [], error: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    records: results.flatMap((result) => result.imported ?? []),
    results,
  };
}

async function fetchEventbriteEvents(sourceConfig, now) {
  if (!sourceConfig.eventbriteToken) {
    return { provider: "eventbrite", imported: [], skipped: true, reason: "EVENTBRITE_TOKEN is not configured" };
  }
  const start = now.toISOString();
  const end = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString();
  const url = new URL("https://www.eventbriteapi.com/v3/events/search/");
  url.searchParams.set("location.latitude", String(SF_LAT));
  url.searchParams.set("location.longitude", String(SF_LON));
  url.searchParams.set("location.within", `${DEFAULT_RADIUS_MILES}mi`);
  url.searchParams.set("start_date.range_start", start);
  url.searchParams.set("start_date.range_end", end);
  url.searchParams.set("expand", "venue,ticket_availability,category");

  const payload = await fetchJson(url, {
    headers: { Authorization: `Bearer ${sourceConfig.eventbriteToken}` },
  });
  const records = (payload.events ?? []).map((event) => eventbriteToRecord(event)).filter(Boolean);
  return { provider: "eventbrite", imported: records };
}

function eventbriteToRecord(event) {
  if (!event?.id || !event?.name?.text || !event?.start?.local) return null;
  const venue = event.venue ?? {};
  return {
    provider: "eventbrite",
    providerEventId: event.id,
    sourceUrl: event.url,
    title: event.name.text,
    description: event.description?.text ?? event.summary ?? "",
    category: event.category?.name ?? event.category?.short_name ?? "community",
    tags: ["eventbrite", event.category?.short_name, event.format?.short_name].filter(Boolean),
    startAt: withPacificOffset(event.start.local),
    endAt: event.end?.local ? withPacificOffset(event.end.local) : null,
    timezone: event.start.timezone ?? "America/Los_Angeles",
    venueName: venue.name ?? "Eventbrite venue TBA",
    neighborhoodSlug: inferNeighborhoodSlug(`${venue.address?.localized_address_display ?? ""} ${venue.name ?? ""}`),
    sourceStatus: event.status,
    imageUrl: event.logo?.url ?? null,
    priceText: event.is_free ? "Free" : event.ticket_availability?.minimum_ticket_price?.display ?? "",
    popularityScore: Number(event.capacity ?? 50),
    qualityScore: 72,
  };
}

async function fetchMeetupEvents(sourceConfig, now) {
  if (!sourceConfig.meetupToken) {
    return { provider: "meetup", imported: [], skipped: true, reason: "MEETUP_TOKEN is not configured" };
  }

  const query = `
    query SearchEvents($lat: Float!, $lon: Float!, $radius: Float!) {
      keywordSearch(input: { query: "San Francisco tech startup social", lat: $lat, lon: $lon, radius: $radius }) {
        edges {
          node {
            result {
              ... on Event {
                id
                title
                description
                eventUrl
                dateTime
                endTime
                timezone
                venue { name address city state }
                group { name }
              }
            }
          }
        }
      }
    }
  `;
  const payload = await fetchJson("https://api.meetup.com/gql", {
    method: "POST",
    headers: { Authorization: `Bearer ${sourceConfig.meetupToken}` },
    body: JSON.stringify({
      query,
      variables: { lat: SF_LAT, lon: SF_LON, radius: DEFAULT_RADIUS_MILES },
    }),
  });

  const nodes = payload.data?.keywordSearch?.edges?.map((edge) => edge.node?.result).filter(Boolean) ?? [];
  return { provider: "meetup", imported: nodes.map(meetupToRecord).filter(Boolean) };
}

function meetupToRecord(event) {
  if (!event?.id || !event?.title || !event?.dateTime) return null;
  return {
    provider: "meetup",
    providerEventId: event.id,
    sourceUrl: event.eventUrl,
    title: event.title,
    description: stripHtml(event.description ?? ""),
    category: "community",
    tags: ["meetup", event.group?.name, "networking"].filter(Boolean),
    startAt: event.dateTime,
    endAt: event.endTime ?? null,
    timezone: event.timezone ?? "America/Los_Angeles",
    venueName: event.venue?.name ?? event.group?.name ?? "Meetup venue TBA",
    neighborhoodSlug: inferNeighborhoodSlug(`${event.venue?.address ?? ""} ${event.venue?.city ?? ""}`),
    priceText: "",
    popularityScore: 65,
    qualityScore: 72,
  };
}

async function fetchIcsProvider(provider, urls) {
  if (!urls.length) return { provider, imported: [], skipped: true, reason: `${provider.toUpperCase().replace(/-/g, "_")}_ICS_URLS is not configured` };
  const batches = await Promise.all(urls.map(async (url) => parseIcsFeed(await fetchText(url), provider, url)));
  return { provider, imported: batches.flat() };
}

async function fetchConfiguredFeeds(urls) {
  if (!urls.length) return { provider: "sf-feeds", imported: [], skipped: true, reason: "SF_EVENT_FEED_URLS is not configured" };
  const records = [];
  for (const url of urls) {
    const text = await fetchText(url);
    if (text.includes("BEGIN:VCALENDAR")) records.push(...parseIcsFeed(text, "sf-feed", url));
    else if (text.includes("<rss") || text.includes("<feed")) records.push(...parseRssFeed(text, "sf-feed", url));
    else records.push(...parseJsonLdEvents(text, "sf-feed", url));
  }
  return { provider: "sf-feeds", imported: records };
}

async function fetchPublicJsonLdProvider(provider, sourceConfig) {
  if (!sourceConfig.enablePublicEventScraping) {
    return { provider, imported: [], skipped: true, reason: "ENABLE_PUBLIC_EVENT_SCRAPING must be true for JSON-LD page extraction" };
  }
  if (!sourceConfig.scrapeEventUrls?.length) {
    return { provider, imported: [], skipped: true, reason: "SCRAPE_EVENT_URLS is not configured" };
  }
  const batches = await Promise.all(sourceConfig.scrapeEventUrls.map(async (url) => parseJsonLdEvents(await fetchText(url), provider, url)));
  return { provider, imported: batches.flat() };
}

async function fetchBrightDataProvider(sourceConfig) {
  if (!sourceConfig.enableBrightDataScraping) {
    return { provider: "bright-data", imported: [], skipped: true, reason: "ENABLE_BRIGHT_DATA_SCRAPING must be true" };
  }
  if (!sourceConfig.brightDataBrowserWsEndpoint) {
    return { provider: "bright-data", imported: [], skipped: true, reason: "BRIGHT_DATA_BROWSER_WS_ENDPOINT or Bright Data username/password/host is not configured" };
  }
  if (!sourceConfig.brightDataSourceUrls?.length) {
    return { provider: "bright-data", imported: [], skipped: true, reason: "BRIGHT_DATA_SOURCE_URLS is not configured" };
  }

  const maxPages = Number.isFinite(sourceConfig.brightDataMaxPages) ? sourceConfig.brightDataMaxPages : 12;
  const urls = sourceConfig.brightDataSourceUrls.slice(0, Math.max(1, maxPages));
  const { chromium } = await loadPlaywright();
  const imported = [];
  const failures = [];

  for (const url of urls) {
    try {
      const html = await fetchBrightDataRenderedHtml(chromium, sourceConfig.brightDataBrowserWsEndpoint, url);
      const jsonLdRecords = parseJsonLdEvents(html, "bright-data", url);
      const embeddedRecords = parseEmbeddedEventJson(html, "bright-data", url);
      imported.push(...dedupeRecords([...jsonLdRecords, ...embeddedRecords]));
    } catch (error) {
      failures.push({ url, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { provider: "bright-data", imported: dedupeRecords(imported), failures };
}

async function fetchBrightDataRenderedHtml(chromium, endpoint, url) {
  const browser = await chromium.connectOverCDP(endpoint);
  try {
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      return await page.content();
    } finally {
      await page.close().catch(() => {});
    }
  } finally {
    await browser.close().catch(() => {});
  }
}

async function loadPlaywright() {
  try {
    return await import("playwright-core");
  } catch {
    try {
      return await import("playwright");
    } catch {
      throw new Error("Bright Data scraping requires the playwright-core package. Run npm install in outputs/signal-sf-production.");
    }
  }
}

export function parseIcsFeed(text, provider, sourceUrl) {
  return splitIcsEvents(text)
    .map((event) => {
      const summary = decodeIcsText(event.SUMMARY);
      const startsAt = parseIcsDate(event.DTSTART);
      if (!summary || !startsAt) return null;
      const location = decodeIcsText(event.LOCATION);
      return {
        provider,
        providerEventId: event.UID ?? `${provider}-${summary}-${startsAt}`,
        sourceUrl: event.URL ?? sourceUrl,
        title: summary,
        description: decodeIcsText(event.DESCRIPTION),
        category: inferCategory(`${summary} ${event.DESCRIPTION ?? ""}`),
        tags: [provider, ...inferTags(`${summary} ${event.DESCRIPTION ?? ""}`)],
        startAt: startsAt,
        endAt: parseIcsDate(event.DTEND),
        timezone: "America/Los_Angeles",
        venueName: location || `${PROVIDERS[provider]?.label ?? "SF"} venue TBA`,
        neighborhoodSlug: inferNeighborhoodSlug(location),
        priceText: inferPriceText(event.DESCRIPTION),
        popularityScore: 60,
        qualityScore: 70,
      };
    })
    .filter(Boolean);
}

function splitIcsEvents(text) {
  return Array.from(text.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)).map((match) => {
    const event = {};
    const unfolded = match[1].replace(/\r?\n[ \t]/g, "");
    for (const line of unfolded.split(/\r?\n/)) {
      const index = line.indexOf(":");
      if (index === -1) continue;
      const rawKey = line.slice(0, index).split(";")[0];
      event[rawKey] = line.slice(index + 1);
    }
    return event;
  });
}

function parseIcsDate(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/^TZID=[^:]+:/, "");
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?Z?$/);
  if (!match) return cleaned;
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}-07:00`;
}

function decodeIcsText(value = "") {
  return String(value)
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .trim();
}

export function parseRssFeed(text, provider, sourceUrl) {
  return Array.from(text.matchAll(/<item[\s\S]*?<\/item>/g))
    .map((match) => {
      const item = match[0];
      const title = decodeXml(readXmlTag(item, "title"));
      const link = decodeXml(readXmlTag(item, "link")) || sourceUrl;
      const description = stripHtml(decodeXml(readXmlTag(item, "description")));
      const date = readXmlTag(item, "pubDate") || readXmlTag(item, "startDate");
      if (!title || !date) return null;
      return {
        provider,
        providerEventId: link || `${provider}-${title}-${date}`,
        sourceUrl: link,
        title,
        description,
        category: inferCategory(`${title} ${description}`),
        tags: [provider, ...inferTags(`${title} ${description}`)],
        startAt: new Date(date).toISOString(),
        endAt: null,
        timezone: "America/Los_Angeles",
        venueName: "San Francisco",
        neighborhoodSlug: inferNeighborhoodSlug(description),
        priceText: inferPriceText(description),
        popularityScore: 55,
        qualityScore: 65,
      };
    })
    .filter(Boolean);
}

export function parseJsonLdEvents(html, provider, sourceUrl) {
  const records = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      for (const entry of flattenJsonLd(parsed)) {
        if (entry?.["@type"] === "Event") records.push(jsonLdEventToRecord(entry, provider, sourceUrl));
      }
    } catch {
      // Ignore non-event JSON-LD blocks.
    }
  }
  return records.filter(Boolean);
}

export function parseEmbeddedEventJson(html, provider, sourceUrl) {
  const records = [];
  for (const raw of extractScriptBodies(html)) {
    const jsonTexts = [stripScriptAssignment(raw), ...extractAssignedJsonValues(raw)]
      .map((text) => decodeHtmlEntities(text))
      .filter(Boolean);

    for (const text of jsonTexts) {
      const parsed = safeJsonParse(text);
      if (!parsed) continue;
      for (const candidate of findEventLikeObjects(parsed)) {
        const record = eventLikeObjectToRecord(candidate, provider, sourceUrl);
        if (record) records.push(record);
      }
    }
  }
  return dedupeRecords(records);
}

function extractScriptBodies(html) {
  return Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => match[1]?.trim())
    .filter(Boolean);
}

function stripScriptAssignment(text) {
  const trimmed = String(text ?? "").trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  const nextData = trimmed.match(/self\.__next_f\.push\(\s*(\[.*\])\s*\)/s);
  if (nextData) return nextData[1];
  const assignment = trimmed.match(/(?:window\.)?[A-Z0-9_$]+(?:\.[A-Z0-9_$]+)?\s*=\s*({[\s\S]*}|\[[\s\S]*\])\s*;?$/i);
  return assignment?.[1] ?? "";
}

function extractAssignedJsonValues(text) {
  const values = [];
  const assignmentPattern = /window\.[A-Z0-9_$]+(?:\.[A-Z0-9_$]+)?\s*=/gi;
  for (const match of String(text ?? "").matchAll(assignmentPattern)) {
    const open = findNextJsonOpen(text, match.index + match[0].length);
    if (open === -1) continue;
    const json = readBalancedJson(text, open);
    if (json) values.push(json);
  }
  return values;
}

function findNextJsonOpen(text, startIndex) {
  const objectIndex = text.indexOf("{", startIndex);
  const arrayIndex = text.indexOf("[", startIndex);
  if (objectIndex === -1) return arrayIndex;
  if (arrayIndex === -1) return objectIndex;
  return Math.min(objectIndex, arrayIndex);
}

function readBalancedJson(text, startIndex) {
  const stack = [];
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "\"") inString = false;
      continue;
    }

    if (char === "\"") inString = true;
    else if (char === "{" || char === "[") stack.push(char);
    else if (char === "}" || char === "]") {
      const opener = stack.pop();
      if ((char === "}" && opener !== "{") || (char === "]" && opener !== "[")) return "";
      if (stack.length === 0) return text.slice(startIndex, index + 1);
    }
  }

  return "";
}

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function findEventLikeObjects(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);

  if (Array.isArray(value)) return value.flatMap((item) => findEventLikeObjects(item, seen));

  const results = [];
  if (hasEventShape(value)) results.push(value);
  for (const child of Object.values(value)) results.push(...findEventLikeObjects(child, seen));
  return results;
}

function hasEventShape(value) {
  const title = value.name ?? value.title ?? value.eventName ?? value.summary;
  const startsAt = value.startDate ?? value.startTime ?? value.startsAt ?? value.start_at ?? value.start_date ?? value.dateTime ?? value.date;
  const url = value.url ?? value.eventUrl ?? value.canonicalUrl ?? value.href ?? value.tickets_url;
  if (!title || !startsAt) return false;
  if (value["@type"] && !String(value["@type"]).toLowerCase().includes("event")) return false;
  return Boolean(url || value.location || value.venue || value.primary_venue || value.description || value.eventbrite_event_id);
}

function eventLikeObjectToRecord(event, provider, sourceUrl) {
  const title = firstString(readTextValue(event.name), event.title, event.eventName, event.summary);
  const startAt = readEventStart(event);
  if (!title || !startAt) return null;

  const location = Array.isArray(event.location) ? event.location[0] : event.location;
  const venue = event.venue ?? event.primary_venue ?? location;
  const address = readAddress(venue);
  const description = stripHtml(firstString(readTextValue(event.description), event.summary, event.shortDescription, event.full_description) ?? "");
  const rawUrl = firstString(event.url, event.eventUrl, event.canonicalUrl, event.href, event.tickets_url);
  const source = normalizeEventUrl(rawUrl, sourceUrl);
  const image = event.image ?? event.photo ?? event.coverImage;
  const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers;
  const timezone = firstString(event.timezone, event.timeZone) || "America/Los_Angeles";
  const providerEventId = normalizeProviderEventId(provider, firstString(event.id, event._id, event.slug, event.eventbrite_event_id, event.identifier?.value), source);

  if (isEventbriteUrl(source) && !isLikelySanFranciscoEvent({ title, description, venue, address, timezone, source })) {
    return null;
  }

  return {
    provider,
    providerEventId: providerEventId || source || `${provider}-${title}-${startAt}`,
    sourceUrl: source ?? sourceUrl,
    title,
    description,
    category: inferCategory(`${title} ${description}`),
    tags: [provider, ...inferTags(`${title} ${description}`)],
    startAt,
    endAt: readEventEnd(event) || null,
    timezone,
    venueName: firstString(venue?.name, venue?.title, address) || `${PROVIDERS[provider]?.label ?? "SF"} venue TBA`,
    neighborhoodSlug: inferNeighborhoodSlug(`${venue?.name ?? ""} ${address ?? ""} ${description}`),
    imageUrl: Array.isArray(image) ? firstString(image[0]?.url, image[0]) : firstString(image?.url, image?.image_sizes?.large, image),
    priceText: readPriceText(offers, description),
    popularityScore: 60,
    qualityScore: 66,
  };
}

function readAddress(value) {
  if (!value) return "";
  if (typeof value.address === "string") return value.address;
  return [
    value.address?.streetAddress,
    value.address?.address_1,
    value.address?.localized_address_display,
    value.address?.addressLocality,
    value.address?.city,
    value.address?.addressRegion,
    value.address?.region,
  ]
    .filter(Boolean)
    .join(", ");
}

function readPriceText(offers, fallbackText) {
  if (offers?.price === 0 || offers?.price === "0") return "Free";
  if (offers?.price) return `$${offers.price}`;
  if (offers?.lowPrice) return `$${offers.lowPrice}`;
  return inferPriceText(fallbackText);
}

function normalizeEventUrl(value, sourceUrl) {
  if (!value) return null;
  try {
    const url = new URL(value, sourceUrl);
    if (url.hostname === "luma.com") url.hostname = "lu.ma";
    return url.toString();
  } catch {
    return String(value);
  }
}

function readEventStart(event) {
  const explicit = firstString(event.startDate, event.startTime, event.startsAt, event.start_at, event.dateTime, event.date);
  if (explicit) return explicit;
  return combineDateAndTime(event.start_date, event.start_time);
}

function readEventEnd(event) {
  const explicit = firstString(event.endDate, event.endTime, event.endsAt, event.end_at);
  if (explicit) return explicit;
  return combineDateAndTime(event.end_date, event.end_time);
}

function combineDateAndTime(date, time) {
  if (!date) return "";
  if (!time) return `${date}T00:00:00-07:00`;
  return `${date}T${String(time).length === 5 ? `${time}:00` : time}-07:00`;
}

function readTextValue(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.text ?? value.localized ?? value.display_name ?? "";
  return "";
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function dedupeRecords(records) {
  const byKey = new Map();
  for (const record of records) {
    const key = `${record.provider}:${record.providerEventId || record.sourceUrl || record.title}`;
    const existing = byKey.get(key);
    if (!existing || recordCompletenessScore(record) > recordCompletenessScore(existing)) {
      byKey.set(key, record);
    }
  }
  return Array.from(byKey.values());
}

function recordCompletenessScore(record) {
  return [
    record.description,
    record.imageUrl,
    record.venueName && !String(record.venueName).includes("venue TBA") ? record.venueName : "",
    String(record.startAt ?? "").includes("T") ? record.startAt : "",
    String(record.endAt ?? "").includes("T") ? record.endAt : "",
    record.priceText,
  ].filter(Boolean).length;
}

function normalizeProviderEventId(provider, explicitId, sourceUrl) {
  if (provider === "bright-data" && isEventbriteUrl(sourceUrl)) {
    return extractEventbriteId(sourceUrl) || explicitId || sourceUrl;
  }
  return explicitId || sourceUrl || "";
}

function extractEventbriteId(sourceUrl) {
  if (!sourceUrl) return "";
  const value = String(sourceUrl);
  return value.match(/tickets-(\d+)/)?.[1] ?? value.match(/[?&]eid=(\d+)/)?.[1] ?? "";
}

function isEventbriteUrl(sourceUrl) {
  if (!sourceUrl) return false;
  try {
    const hostname = new URL(sourceUrl).hostname;
    return hostname === "www.eventbrite.com" || hostname === "eventbrite.com";
  } catch {
    return false;
  }
}

function isLikelySanFranciscoEvent({ title, description, venue, address, timezone, source }) {
  const text = [
    title,
    description,
    venue?.name,
    venue?.address?.localized_address_display,
    venue?.address?.localized_area_display,
    venue?.address?.city,
    venue?.address?.addressLocality,
    address,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("san francisco") || /\bsf\b/.test(text)) return true;
  if (timezone && timezone !== "America/Los_Angeles") return false;
  if (!source || !isEventbriteUrl(source)) return false;
  return Boolean(venue?.name || address);
}

function flattenJsonLd(value) {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (value?.["@graph"]) return flattenJsonLd(value["@graph"]);
  return [value];
}

function jsonLdEventToRecord(event, provider, sourceUrl) {
  if (!event.name || !event.startDate) return null;
  const location = Array.isArray(event.location) ? event.location[0] : event.location;
  const address = typeof location?.address === "string" ? location.address : [location?.address?.streetAddress, location?.address?.addressLocality].filter(Boolean).join(", ");
  const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers;
  const source = normalizeEventUrl(event.url, sourceUrl);
  const description = stripHtml(event.description ?? "");
  const timezone = firstString(event.timezone, event.timeZone) || "America/Los_Angeles";
  if (isEventbriteUrl(source) && !isLikelySanFranciscoEvent({ title: event.name, description, venue: location, address, timezone, source })) {
    return null;
  }

  return {
    provider,
    providerEventId: normalizeProviderEventId(provider, event.identifier?.value, source) ?? source ?? `${provider}-${event.name}-${event.startDate}`,
    sourceUrl: source ?? sourceUrl,
    title: event.name,
    description,
    category: inferCategory(`${event.name} ${event.description ?? ""}`),
    tags: [provider, ...inferTags(`${event.name} ${event.description ?? ""}`)],
    startAt: event.startDate,
    endAt: event.endDate ?? null,
    timezone,
    venueName: location?.name ?? address ?? `${PROVIDERS[provider]?.label ?? "SF"} venue TBA`,
    neighborhoodSlug: inferNeighborhoodSlug(`${location?.name ?? ""} ${address}`),
    imageUrl: Array.isArray(event.image) ? event.image[0] : event.image,
    priceText: offers?.price ? `$${offers.price}` : "",
    popularityScore: 60,
    qualityScore: 68,
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers ?? {}) } });
  if (!response.ok) throw new Error(`Fetch failed for ${url}: ${response.status}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed for ${url}: ${response.status}`);
  return response.text();
}

function withPacificOffset(value) {
  return String(value).includes("-") && String(value).match(/[+-]\d{2}:\d{2}$/) ? value : `${value}-07:00`;
}

function readXmlTag(text, tag) {
  return text.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1]?.trim() ?? "";
}

function decodeXml(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function inferCategory(text = "") {
  const value = String(text).toLowerCase();
  if (value.includes("founder") || value.includes("startup") || value.includes("ai") || value.includes("tech")) return "tech";
  if (value.includes("music") || value.includes("concert") || value.includes("jazz")) return "music";
  if (value.includes("food") || value.includes("dinner") || value.includes("brunch")) return "food";
  if (value.includes("comedy")) return "comedy";
  if (value.includes("art") || value.includes("gallery")) return "art";
  if (value.includes("film") || value.includes("movie")) return "film";
  if (value.includes("run") || value.includes("hike") || value.includes("outdoor")) return "outdoors";
  if (value.includes("wellness") || value.includes("breathwork") || value.includes("yoga")) return "wellness";
  return "community";
}

function inferTags(text = "") {
  const value = String(text).toLowerCase();
  return ["ai", "founders", "networking", "startup", "music", "food", "art", "wellness", "outdoor"].filter((tag) => value.includes(tag));
}

function inferPriceText(text = "") {
  const value = String(text);
  if (/free/i.test(value)) return "Free";
  return value.match(/\$[0-9]+(?:\.[0-9]{2})?/)?.[0] ?? "";
}

function inferNeighborhoodSlug(text = "") {
  const value = String(text).toLowerCase();
  if (value.includes("mission")) return "mission";
  if (value.includes("soma") || value.includes("south of market")) return "soma";
  if (value.includes("hayes")) return "hayes-valley";
  if (value.includes("marina")) return "marina";
  if (value.includes("sunset")) return "sunset";
  return "soma";
}
