import type { EventDetail, UserPreferences } from "./types";

export const defaultPreferences: UserPreferences = {
  interests: ["food", "outdoors", "arts"],
  budget: "under75",
  neighborhoods: ["Mission", "Hayes Valley", "Golden Gate Park", "Embarcadero"],
  preferredDays: ["saturday", "sunday"],
  timeOfDay: ["afternoon", "evening"],
  socialContext: ["friends", "date"]
};

export const events: EventDetail[] = [
  {
    id: "presidio-picnic",
    title: "Presidio Picnic Makers Market",
    summary: "Food trucks, local makers, lawn hangs, and bay views near the Main Post.",
    imageUrl: "https://images.unsplash.com/photo-1543363136-75a60dc7e505?auto=format&fit=crop&w=1200&q=75",
    startsAt: "2026-07-11T12:00:00-07:00",
    endsAt: "2026-07-11T16:00:00-07:00",
    venueName: "Presidio Main Parade Lawn",
    address: "103 Montgomery St, San Francisco, CA",
    neighborhood: "Marina",
    category: "food",
    tags: ["outdoor", "local makers", "casual", "bay views"],
    priceLabel: "Free entry",
    priceMin: 0,
    priceMax: 35,
    score: 94,
    recommendation: {
      label: "Recommended because you like outdoor food events",
      detail: "Matches your food and outdoors interests, works for a Saturday afternoon, and stays flexible for friends.",
      matchedPreferences: ["food", "outdoors", "saturday", "friends"]
    },
    description:
      "A low-commitment afternoon market with rotating food vendors, picnic space, and local goods. Best for users who want a social plan without booking a formal reservation.",
    organizerName: "Presidio Visitor Programs",
    sourceUrl: "https://example.com/events/presidio-picnic",
    accessibilityNotes: "Mostly flat lawn and paved paths nearby.",
    transitNotes: "Muni 30 and Presidio GO serve nearby stops.",
    relatedEventIds: ["ggp-garden-walk", "ferry-building-tasting"]
  },
  {
    id: "mission-mural-walk",
    title: "Mission Murals After-Hours Walk",
    summary: "A guided neighborhood walk ending near Valencia dinner and drinks options.",
    imageUrl: "https://images.unsplash.com/photo-1573148195900-7845dcb9b127?auto=format&fit=crop&w=1200&q=75",
    startsAt: "2026-07-11T17:30:00-07:00",
    endsAt: "2026-07-11T19:00:00-07:00",
    venueName: "Balmy Alley",
    address: "Balmy St, San Francisco, CA",
    neighborhood: "Mission",
    category: "arts",
    tags: ["walking", "local history", "date night", "low cost"],
    priceLabel: "$18",
    priceMin: 18,
    priceMax: 18,
    score: 91,
    recommendation: {
      label: "Recommended because you like artsy neighborhood plans",
      detail: "Strong fit for arts, Mission, and evening plans with a date or friends.",
      matchedPreferences: ["arts", "Mission", "evening", "date"]
    },
    description:
      "A compact guided walk through murals and neighborhood history. It is deliberately short, making it easy to pair with dinner nearby.",
    organizerName: "City Walks SF",
    sourceUrl: "https://example.com/events/mission-mural-walk",
    transitNotes: "A 10 minute walk from 24th St Mission BART.",
    relatedEventIds: ["hayes-jazz-courtyard", "sunset-night-market"]
  },
  {
    id: "ggp-garden-walk",
    title: "Golden Gate Park Garden Walk",
    summary: "A relaxed botanical walk through seasonal gardens with a coffee stop nearby.",
    imageUrl: "https://images.unsplash.com/photo-1598902108854-10e335adac99?auto=format&fit=crop&w=1200&q=75",
    startsAt: "2026-07-12T10:00:00-07:00",
    endsAt: "2026-07-12T11:30:00-07:00",
    venueName: "Conservatory of Flowers",
    address: "100 John F Kennedy Dr, San Francisco, CA",
    neighborhood: "Golden Gate Park",
    category: "outdoors",
    tags: ["morning", "fresh air", "calm", "family friendly"],
    priceLabel: "$12",
    priceMin: 12,
    priceMax: 12,
    score: 88,
    recommendation: {
      label: "Recommended because you prefer outdoor weekend plans",
      detail: "A Sunday morning fit in Golden Gate Park with a gentle pace.",
      matchedPreferences: ["outdoors", "sunday", "morning", "Golden Gate Park"]
    },
    description:
      "A low-pressure morning walk that works before brunch or a museum stop. Good for users who want the day to start outdoors without needing gear.",
    organizerName: "Park Garden Guides",
    sourceUrl: "https://example.com/events/ggp-garden-walk",
    accessibilityNotes: "Some garden paths include mild grades.",
    relatedEventIds: ["presidio-picnic", "richmond-film-night"]
  },
  {
    id: "hayes-jazz-courtyard",
    title: "Hayes Valley Courtyard Jazz",
    summary: "An early evening trio set with nearby wine bars and casual dinner options.",
    imageUrl: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=75",
    startsAt: "2026-07-11T19:30:00-07:00",
    endsAt: "2026-07-11T21:00:00-07:00",
    venueName: "Proxy SF",
    address: "432 Octavia St, San Francisco, CA",
    neighborhood: "Hayes Valley",
    category: "music",
    tags: ["live music", "date night", "walkable", "evening"],
    priceLabel: "$24",
    priceMin: 24,
    priceMax: 24,
    score: 86,
    recommendation: {
      label: "Recommended because you like polished evening plans",
      detail: "Pairs your evening preference with a walkable Hayes Valley setting.",
      matchedPreferences: ["evening", "Hayes Valley", "date"]
    },
    description:
      "A small-format jazz set in the heart of Hayes Valley. It is a strong anchor event for a one-night plan with dinner before or dessert after.",
    organizerName: "Proxy Arts",
    sourceUrl: "https://example.com/events/hayes-jazz-courtyard",
    transitNotes: "Near Van Ness Muni and multiple bus lines.",
    relatedEventIds: ["mission-mural-walk", "sfmoma-late"]
  },
  {
    id: "ferry-building-tasting",
    title: "Ferry Building Small-Batch Tasting",
    summary: "A compact tasting route through cheese, chocolate, olive oil, and seasonal fruit vendors.",
    imageUrl: "https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?auto=format&fit=crop&w=1200&q=75",
    startsAt: "2026-07-10T15:00:00-07:00",
    endsAt: "2026-07-10T17:00:00-07:00",
    venueName: "Ferry Building Marketplace",
    address: "1 Ferry Building, San Francisco, CA",
    neighborhood: "Embarcadero",
    category: "markets",
    tags: ["food", "waterfront", "weekday", "short"],
    priceLabel: "$35",
    priceMin: 35,
    priceMax: 35,
    score: 84,
    recommendation: {
      label: "Recommended because you save food markets",
      detail: "Food-forward, short enough for a weekday afternoon, and close to waterfront walks.",
      matchedPreferences: ["food", "markets", "Embarcadero", "afternoon"]
    },
    description:
      "A curated tasting path through the Ferry Building. The experience is structured but lightweight, making it easy to combine with an Embarcadero walk.",
    organizerName: "Market Hall SF",
    sourceUrl: "https://example.com/events/ferry-building-tasting",
    relatedEventIds: ["presidio-picnic", "sunset-night-market"]
  },
  {
    id: "sfmoma-late",
    title: "SFMOMA Late View",
    summary: "A quieter museum evening with design, photography, and a short curator intro.",
    imageUrl: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&w=1200&q=75",
    startsAt: "2026-07-09T18:00:00-07:00",
    endsAt: "2026-07-09T20:30:00-07:00",
    venueName: "SFMOMA",
    address: "151 3rd St, San Francisco, CA",
    neighborhood: "SoMa",
    category: "arts",
    tags: ["museum", "evening", "indoors", "design"],
    priceLabel: "$30",
    priceMin: 30,
    priceMax: 30,
    score: 82,
    recommendation: {
      label: "Recommended because you like arts without a long commitment",
      detail: "A compact evening museum plan that can stand alone or pair with dinner.",
      matchedPreferences: ["arts", "evening"]
    },
    description:
      "A late museum window for people who want something thoughtful after work. The shorter format keeps it from feeling like a full-day museum commitment.",
    organizerName: "SFMOMA",
    sourceUrl: "https://example.com/events/sfmoma-late",
    relatedEventIds: ["hayes-jazz-courtyard", "mission-mural-walk"]
  },
  {
    id: "sunset-night-market",
    title: "Outer Sunset Night Market",
    summary: "Food stalls, neighborhood shops, and mellow music a few blocks from Ocean Beach.",
    imageUrl: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=75",
    startsAt: "2026-07-10T18:00:00-07:00",
    endsAt: "2026-07-10T21:00:00-07:00",
    venueName: "Irving Street",
    address: "Irving St and 21st Ave, San Francisco, CA",
    neighborhood: "Sunset",
    category: "markets",
    tags: ["food", "local shops", "casual", "evening"],
    priceLabel: "Free entry",
    priceMin: 0,
    priceMax: 40,
    score: 79,
    recommendation: {
      label: "Recommended because you like casual food plans",
      detail: "A flexible evening market with food options across budgets.",
      matchedPreferences: ["food", "markets", "evening", "friends"]
    },
    description:
      "A neighborhood-first night market that works for grazing, browsing, and a beach walk if the weather is clear.",
    organizerName: "Outer Sunset Merchants",
    sourceUrl: "https://example.com/events/sunset-night-market",
    transitNotes: "Near the N Judah line.",
    relatedEventIds: ["ferry-building-tasting", "richmond-film-night"]
  },
  {
    id: "richmond-film-night",
    title: "Richmond District Microcinema",
    summary: "A short local film program with tea service and a filmmaker Q&A.",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=75",
    startsAt: "2026-07-12T19:00:00-07:00",
    endsAt: "2026-07-12T21:15:00-07:00",
    venueName: "4 Star Theater",
    address: "2200 Clement St, San Francisco, CA",
    neighborhood: "Richmond",
    category: "film",
    tags: ["film", "cozy", "local", "evening"],
    priceLabel: "$16",
    priceMin: 16,
    priceMax: 16,
    score: 74,
    recommendation: {
      label: "Recommended as a cozy backup plan",
      detail: "A lower-cost indoor evening option if outdoor plans feel too weather-dependent.",
      matchedPreferences: ["evening", "under25"]
    },
    description:
      "An intimate local film night built for a quieter Sunday. It is especially useful as a backup if fog or wind makes outdoor plans less appealing.",
    organizerName: "4 Star Theater",
    sourceUrl: "https://example.com/events/richmond-film-night",
    relatedEventIds: ["ggp-garden-walk", "sfmoma-late"]
  }
];
