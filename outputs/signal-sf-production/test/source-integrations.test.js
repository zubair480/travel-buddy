import test from "node:test";
import assert from "node:assert/strict";
import { parseEmbeddedEventJson, parseIcsFeed, parseJsonLdEvents, parseRssFeed } from "../src/services/sourceIntegrations.js";

test("parseIcsFeed converts calendar events to ingestion records", () => {
  const records = parseIcsFeed(
    `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:luma-1
SUMMARY:SF AI Founder Salon
DESCRIPTION:Meet founders and operators in SoMa. Free.
DTSTART:20260715T180000
DTEND:20260715T200000
LOCATION:SoMa Studio
URL:https://lu.ma/example
END:VEVENT
END:VCALENDAR`,
    "luma",
    "https://lu.ma/calendar.ics",
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].provider, "luma");
  assert.equal(records[0].providerEventId, "luma-1");
  assert.equal(records[0].category, "tech");
  assert.equal(records[0].neighborhoodSlug, "soma");
  assert.equal(records[0].priceText, "Free");
});

test("parseRssFeed converts RSS items to ingestion records", () => {
  const records = parseRssFeed(
    `<rss><channel><item>
      <title><![CDATA[Mission Jazz Night]]></title>
      <link>https://example.com/events/jazz</link>
      <description><![CDATA[Live music in the Mission. Tickets $15.]]></description>
      <pubDate>Wed, 15 Jul 2026 19:00:00 GMT</pubDate>
    </item></channel></rss>`,
    "sf-feed",
    "https://example.com/rss",
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].category, "music");
  assert.equal(records[0].neighborhoodSlug, "mission");
  assert.equal(records[0].priceText, "$15");
});

test("parseJsonLdEvents extracts schema.org Event records", () => {
  const records = parseJsonLdEvents(
    `<html><script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "Cerebral Valley Demo Night",
        "startDate": "2026-07-16T18:00:00-07:00",
        "endDate": "2026-07-16T20:00:00-07:00",
        "url": "https://example.com/demo-night",
        "description": "AI startup demos and networking.",
        "location": {
          "name": "Hayes Valley AI House",
          "address": {
            "streetAddress": "123 Hayes St",
            "addressLocality": "San Francisco"
          }
        },
        "offers": { "price": "20" }
      }
    </script></html>`,
    "cerebral-valley",
    "https://example.com",
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].provider, "cerebral-valley");
  assert.equal(records[0].category, "tech");
  assert.equal(records[0].neighborhoodSlug, "hayes-valley");
  assert.equal(records[0].priceText, "$20");
});

test("parseEmbeddedEventJson extracts event-shaped records from rendered page data", () => {
  const records = parseEmbeddedEventJson(
    `<html><script>
      window.__APP_DATA__ = {
        "props": {
          "events": [
            {
              "id": "partiful-1",
              "title": "Founders Rooftop Mixer",
              "startsAt": "2026-07-18T18:30:00-07:00",
              "endsAt": "2026-07-18T21:00:00-07:00",
              "url": "/events/founders-rooftop",
              "description": "Startup operators and AI founders in SoMa.",
              "venue": { "name": "SoMa Loft", "address": "2nd Street, San Francisco, CA" },
              "offers": { "price": 0 }
            }
          ]
        }
      };
    </script></html>`,
    "bright-data",
    "https://partiful.com",
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].providerEventId, "partiful-1");
  assert.equal(records[0].sourceUrl, "https://partiful.com/events/founders-rooftop");
  assert.equal(records[0].category, "tech");
  assert.equal(records[0].neighborhoodSlug, "soma");
  assert.equal(records[0].priceText, "Free");
});

test("parsers canonicalize luma.com event URLs to lu.ma", () => {
  const jsonLdRecords = parseJsonLdEvents(
    `<html><script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "SF AI Night",
        "startDate": "2026-07-18T18:00:00-07:00",
        "url": "https://luma.com/ai-night"
      }
    </script></html>`,
    "bright-data",
    "https://luma.com/sf",
  );

  assert.equal(jsonLdRecords[0].providerEventId, "https://lu.ma/ai-night");
  assert.equal(jsonLdRecords[0].sourceUrl, "https://lu.ma/ai-night");
});
