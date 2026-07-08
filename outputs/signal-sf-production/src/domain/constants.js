export const CITY_SLUG = "san-francisco";

export const EVENT_CATEGORIES = [
  "music",
  "food",
  "comedy",
  "art",
  "tech",
  "outdoors",
  "nightlife",
  "family",
  "community",
  "sports",
  "film",
  "wellness",
];

export const DAY_PARTS = ["morning", "afternoon", "evening", "late_night"];

export const TRAVEL_BUFFER_MINUTES_BY_NEIGHBORHOOD_PAIR = {
  default: 20,
  same_neighborhood: 10,
  "mission|mission": 10,
  "soma|soma": 10,
  "mission|soma": 15,
  "soma|mission": 15,
  "hayes-valley|mission": 15,
  "mission|hayes-valley": 15,
  "hayes-valley|soma": 12,
  "soma|hayes-valley": 12,
  "marina|mission": 25,
  "mission|marina": 25,
  "sunset|mission": 30,
  "mission|sunset": 30,
  "sunset|soma": 30,
  "soma|sunset": 30,
};
