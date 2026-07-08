import { CITY_SLUG } from "./constants.js";

const saturday = "2026-07-11";
const sunday = "2026-07-12";

export function getSeedNeighborhoods() {
  return [
    { slug: "mission", name: "Mission", centroidLat: 37.7599, centroidLng: -122.4148 },
    { slug: "soma", name: "SoMa", centroidLat: 37.7786, centroidLng: -122.4058 },
    { slug: "hayes-valley", name: "Hayes Valley", centroidLat: 37.7764, centroidLng: -122.4242 },
    { slug: "marina", name: "Marina", centroidLat: 37.8037, centroidLng: -122.4368 },
    { slug: "sunset", name: "Sunset", centroidLat: 37.7534, centroidLng: -122.4941 },
  ].map((item) => ({ ...item, citySlug: CITY_SLUG }));
}

export function getSeedVenues() {
  return [
    { slug: "dolores-stage", name: "Dolores Park Stage", addressLine1: "Dolores Park", postalCode: "94114", latitude: 37.7596, longitude: -122.4269, neighborhoodSlug: "mission" },
    { slug: "soma-hall", name: "SoMa Sound Hall", addressLine1: "101 Howard St", postalCode: "94105", latitude: 37.7895, longitude: -122.3942, neighborhoodSlug: "soma" },
    { slug: "proxy-green", name: "Proxy Green", addressLine1: "432 Octavia St", postalCode: "94102", latitude: 37.7765, longitude: -122.4241, neighborhoodSlug: "hayes-valley" },
    { slug: "marina-deck", name: "Marina Bay Deck", addressLine1: "2200 Marina Blvd", postalCode: "94123", latitude: 37.8052, longitude: -122.4391, neighborhoodSlug: "marina" },
    { slug: "sunset-garden", name: "Sunset Garden House", addressLine1: "1300 9th Ave", postalCode: "94122", latitude: 37.7651, longitude: -122.4665, neighborhoodSlug: "sunset" },
  ];
}

export function getSeedEvents() {
  return [
    ["seed-001","Golden Hour Jazz Picnic","A relaxed early-evening jazz set with rotating Bay Area musicians, snack stalls, and blanket-friendly lawn seating.","music",["live music","outdoor","picnic","local"],`${saturday}T17:30:00-07:00`,`${saturday}T19:00:00-07:00`,"dolores-stage","mission",0,0,"all_ages",84,88,false,true],
    ["seed-002","Mission Night Market Crawl","An energetic food-first night market with pop-up kitchens, dessert vendors, DJs, and handmade goods from neighborhood makers.","food",["street food","night market","outdoor","friends"],`${saturday}T19:15:00-07:00`,`${saturday}T22:00:00-07:00`,"dolores-stage","mission",1200,3500,"all_ages",92,86,false,true],
    ["seed-003","Warehouse Comedy Drop-In","A mix of local comics and surprise touring guests in a converted warehouse space with cocktails and lounge seating.","comedy",["standup","nightlife","date night"],`${saturday}T20:00:00-07:00`,`${saturday}T21:30:00-07:00`,"soma-hall","soma",2200,4000,"18_plus",75,90,true,false],
    ["seed-004","Builders & Breakthroughs Salon","Early-stage founders and product builders share lightning demos, followed by mingling over snacks and NA cocktails.","tech",["founders","product","networking","indoor"],`${saturday}T14:00:00-07:00`,`${saturday}T16:00:00-07:00`,"soma-hall","soma",0,0,"all_ages",71,82,true,false],
    ["seed-005","Open-Air Short Film Night","A neighborhood film program featuring short fiction, documentary, and animation from Bay Area creators.","film",["film","outdoor","community","art"],`${saturday}T20:30:00-07:00`,`${saturday}T22:15:00-07:00`,"proxy-green","hayes-valley",0,0,"all_ages",69,85,false,true],
    ["seed-006","Bay Loop Social Run","A low-pressure Marina waterfront group run with multiple paces and a coffee hang after the route.","outdoors",["running","wellness","morning","group"],`${saturday}T09:00:00-07:00`,`${saturday}T10:30:00-07:00`,"marina-deck","marina",0,0,"all_ages",66,77,false,true],
    ["seed-007","Garden Brunch & Vinyl","Brunch plates, coffee, and vinyl DJs in a leafy courtyard with good space for lingering.","food",["brunch","vinyl","outdoor","date night"],`${saturday}T11:00:00-07:00`,`${saturday}T13:00:00-07:00`,"sunset-garden","sunset",1800,4200,"all_ages",88,84,false,true],
    ["seed-008","Family Mural Workshop","A neighborhood art workshop built around collaborative mural painting, local snacks, and guided prompts.","family",["kids","art","community","daytime"],`${sunday}T11:30:00-07:00`,`${sunday}T13:30:00-07:00`,"proxy-green","hayes-valley",1000,2500,"all_ages",58,79,false,true],
    ["seed-009","After Hours Gallery Walk","A guided evening art walk across two compact gallery spaces with artist intros and casual drinks.","art",["gallery","art","date night","walking"],`${saturday}T18:30:00-07:00`,`${saturday}T20:00:00-07:00`,"proxy-green","hayes-valley",2800,4500,"21_plus",72,83,true,false],
    ["seed-010","Midnight Disco Set","Late-night DJs, visual projections, and a dancefloor-first crowd for people who want a real nightlife option.","nightlife",["dj","dance","late night","friends"],`${saturday}T23:00:00-07:00`,`${sunday}T01:30:00-07:00`,"soma-hall","soma",2500,5000,"21_plus",91,80,true,false],
    ["seed-011","Ocean Breathwork Session","A guided outdoor breathwork class with light stretching and tea, tuned for unwinding without being too formal.","wellness",["breathwork","outdoor","sunset","calm"],`${sunday}T17:00:00-07:00`,`${sunday}T18:15:00-07:00`,"sunset-garden","sunset",1500,2000,"all_ages",54,78,false,true],
    ["seed-012","Neighborhood Makers Market","A small but well-curated community market featuring ceramics, zines, prints, coffee, and ambient music.","community",["makers","shopping","community","local"],`${sunday}T12:00:00-07:00`,`${sunday}T16:00:00-07:00`,"proxy-green","hayes-valley",0,0,"all_ages",64,76,false,true],
  ].map(([
    sourceEventId,
    title,
    description,
    category,
    tags,
    startAt,
    endAt,
    venueSlug,
    neighborhoodSlug,
    priceMinCents,
    priceMaxCents,
    ageRestriction,
    popularityScore,
    qualityScore,
    isIndoor,
    isOutdoor,
  ]) => ({
    sourceProvider: "seed",
    sourceEventId,
    sourceUrl: "#",
    title,
    shortDescription: description.slice(0, 120),
    description,
    category,
    tags,
    startAt,
    endAt,
    timezone: "America/Los_Angeles",
    venueSlug,
    neighborhoodSlug,
    imageUrl: null,
    ageRestriction,
    isIndoor,
    isOutdoor,
    priceMinCents,
    priceMaxCents,
    currencyCode: "USD",
    popularityScore,
    qualityScore,
    status: "published",
    sourceStatus: "fresh",
    normalizedFingerprint: `${title.toLowerCase().replace(/\s+/g, "-")}|${venueSlug}|${startAt.slice(0, 10)}`,
  }));
}
