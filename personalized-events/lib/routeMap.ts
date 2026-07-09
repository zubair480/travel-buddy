// Keyless map embeds. Google's legacy `maps.google.com/maps?...&output=embed`
// endpoint now 301-redirects to a page served with `X-Frame-Options: SAMEORIGIN`,
// so browsers refuse to frame it and the map renders blank. OpenStreetMap's
// export/embed endpoint sends no framing restriction and needs no API key, so we
// build the embedded map from coordinates instead.

export type GeoPoint = { lat: number; lng: number };

export function toGeoPoint(input: { latitude?: number | null; longitude?: number | null }): GeoPoint | null {
  const lat = input.latitude;
  const lng = input.longitude;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

/**
 * Builds an OpenStreetMap embed URL whose viewport covers every point, with a
 * marker on the first stop. Returns null when there are no usable coordinates,
 * so callers can hide the map frame instead of showing a broken one.
 */
export function osmEmbedUrl(points: GeoPoint[]): string | null {
  const pts = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  if (pts.length === 0) return null;

  const lats = pts.map((point) => point.lat);
  const lngs = pts.map((point) => point.lng);
  // Pad the bounding box so a single point (or two very close ones) still shows
  // a sensible amount of surrounding map rather than zooming to street level.
  const pad = 0.012;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  const marker = pts[0];

  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  return (
    `https://www.openstreetmap.org/export/embed.html?` +
    `bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${marker.lat},${marker.lng}`)}`
  );
}
