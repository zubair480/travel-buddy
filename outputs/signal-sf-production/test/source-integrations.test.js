import test from "node:test";
import assert from "node:assert/strict";
import { listSourceProviders, parseEmbeddedEventJson, parseIcsFeed, parseJsonLdEvents, parseRssFeed } from "../src/services/sourceIntegrations.js";

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

test("parseEmbeddedEventJson extracts Eventbrite server data assignments", () => {
  const records = parseEmbeddedEventJson(
    `<html><script>
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      window.__SERVER_DATA__ = {
        "jsonld": [{
          "@context": "https://schema.org",
          "itemListElement": [{
            "@type": "ListItem",
            "item": {
              "@type": "Event",
              "name": "Pickwick Vintage Show in San Francisco",
              "startDate": "2026-07-12",
              "url": "https://www.eventbrite.com/e/pickwick-vintage-show-in-san-francisco-july-2026-tickets-1991848459361",
              "location": {
                "name": "San Francisco Ferry Building",
                "address": {
                  "addressLocality": "San Francisco",
                  "streetAddress": "1 Ferry Building"
                }
              }
            }
          }]
        }],
        "buckets": [{
          "events": [
            {
              "eventbrite_event_id": "1991848459361",
              "name": "Pickwick Vintage Show in San Francisco",
              "start_date": "2026-07-12",
              "start_time": "10:00",
              "end_date": "2026-07-12",
              "end_time": "16:00",
              "tickets_url": "https://www.eventbrite.com/checkout-external?eid=1991848459361",
              "description": {"text": "Vintage clothing and accessories from local vendors."},
              "primary_venue": {
                "name": "San Francisco Ferry Building",
                "address": {
                  "localized_address_display": "1 Ferry Building, San Francisco, CA 94111"
                }
              },
              "image": {"url": "https://img.evbuc.com/example.jpg"},
              "tags": [{"display_name": "Fashion"}]
            },
            {
              "eventbrite_event_id": "775219842417",
              "name": "Boston Career Fair",
              "start_date": "2026-08-06",
              "start_time": "09:30",
              "tickets_url": "https://www.eventbrite.com/e/boston-career-fair-tickets-775219842417",
              "timezone": "America/New_York",
              "description": {"text": "Connect live with Boston employers."},
              "image": {"url": "https://img.evbuc.com/boston.jpg"}
            }
          ]
        }]
      };
    </script></html>`,
    "bright-data",
    "https://www.eventbrite.com/d/ca--san-francisco/events/",
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].providerEventId, "1991848459361");
  assert.equal(records[0].title, "Pickwick Vintage Show in San Francisco");
  assert.equal(records[0].startAt, "2026-07-12T10:00:00-07:00");
  assert.equal(records[0].endAt, "2026-07-12T16:00:00-07:00");
  assert.equal(records[0].venueName, "San Francisco Ferry Building");
  assert.equal(records[0].imageUrl, "https://img.evbuc.com/example.jpg");
});

test("parseEmbeddedEventJson keeps SF Eventbrite records without explicit city when venue is present", () => {
  const records = parseEmbeddedEventJson(
    `<html><script>
      window.__SERVER_DATA__ = {
        "buckets": [{
          "events": [{
            "eventbrite_event_id": "1264432213789",
            "name": "AI Supply Chain Hackathon 2026: Food Banks + AI",
            "start_date": "2026-07-15",
            "start_time": "09:00",
            "tickets_url": "https://www.eventbrite.com/e/ai-supply-chain-hackathon-2026-food-banks-ai-tickets-1264432213789",
            "timezone": "America/Los_Angeles",
            "description": {"text": "Join our AI Supply Chain Hackathon."},
            "primary_venue": {
              "name": "1417 15th St",
              "address": {
                "address_1": "1417 15th St"
              }
            }
          }]
        }]
      };
    </script></html>`,
    "bright-data",
    "https://www.eventbrite.com/d/ca--san-francisco/events/",
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].providerEventId, "1264432213789");
  assert.equal(records[0].venueName, "1417 15th St");
});

test("source provider metadata includes Scrapling configuration state", () => {
  const providers = listSourceProviders({
    sourceIngestion: {
      enableScraplingScraping: true,
      scraplingSourceUrls: ["https://lu.ma/sf"],
    },
  });

  const scrapling = providers.find((provider) => provider.id === "scrapling");
  assert.equal(scrapling?.configured, true);
  assert.equal(scrapling?.mode, "scrapling_public_pages");
});

test("Scrapling parser path canonicalizes Eventbrite IDs", () => {
  const records = parseEmbeddedEventJson(
    `<html><script>
      window.__SERVER_DATA__ = {
        "events": [{
          "name": "San Francisco Builder Night",
          "start_date": "2026-07-15",
          "start_time": "18:00",
          "tickets_url": "https://www.eventbrite.com/e/san-francisco-builder-night-tickets-123456789",
          "timezone": "America/Los_Angeles",
          "primary_venue": {
            "name": "Mission Hall",
            "address": { "localized_address_display": "Mission St, San Francisco, CA" }
          }
        }]
      };
    </script></html>`,
    "scrapling",
    "https://www.eventbrite.com/d/ca--san-francisco/events/",
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].providerEventId, "123456789");
  assert.equal(records[0].sourceUrl, "https://www.eventbrite.com/e/san-francisco-builder-night-tickets-123456789");
});

test("Eventbrite filtering applies to non-.com domains and agenda snippets", () => {
  const records = parseEmbeddedEventJson(
    `<html><script>
      window.__SERVER_DATA__ = {
        "events": [
          {
            "name": "Pubs, courriels et ventes : convertir avec l’IA",
            "start_date": "2026-07-09",
            "start_time": "13:00",
            "tickets_url": "https://www.eventbrite.ca/e/billets-pubs-courriels-et-ventes-convertir-avec-lia-1990811706405",
            "timezone": "America/Montreal"
          },
          {
            "name": "Wired To Belong",
            "startTime": "16:00",
            "endTime": "17:30",
            "description": "Agenda item without an event date."
          }
        ]
      };
    </script></html>`,
    "scrapling",
    "https://www.eventbrite.com/d/ca--san-francisco/events/",
  );

  assert.equal(records.length, 0);
});
