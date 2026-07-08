function knownSourceFromHost(url: string | null | undefined) {
  if (!url) return "";
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("lu.ma") || host.includes("luma.com")) return "Luma";
    if (host.includes("partiful.com")) return "Partiful";
    if (host.includes("eventbrite.com")) return "Eventbrite";
    if (host.includes("meetup.com")) return "Meetup";
    if (host.includes("pie.org")) return "Pie";
    if (host.includes("cerebralvalley.ai")) return "Cerebral Valley";
  } catch {
    return "";
  }
  return "";
}

export function sourceLabel(sourceProvider: string | null | undefined, sourceUrl: string | null | undefined) {
  const byUrl = knownSourceFromHost(sourceUrl);
  if (byUrl) return byUrl;

  const provider = String(sourceProvider ?? "").toLowerCase();
  if (!provider) return "Source";
  if (provider === "luma") return "Luma";
  if (provider === "partiful") return "Partiful";
  if (provider === "eventbrite") return "Eventbrite";
  if (provider === "meetup") return "Meetup";
  if (provider === "pie-social") return "Pie";
  if (provider === "cerebral-valley") return "Cerebral Valley";
  if (provider === "sf-feed" || provider === "sf-feeds") return "SF Feed";
  if (provider === "bright-data") return "Web";
  return provider
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
