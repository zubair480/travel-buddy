function asValidDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(iso: string) {
  const date = asValidDate(iso);
  if (!date) return "Date TBD";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function formatDateLabel(iso: string) {
  const date = asValidDate(iso);
  if (!date) return "Date TBD";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);
}

export function formatTimeRange(startsAt: string, endsAt: string) {
  const start = asValidDate(startsAt);
  const end = asValidDate(endsAt);
  if (!start && !end) return "Time TBD";

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  if (start && end) return `${time.format(start)} - ${time.format(end)}`;
  if (start) return `${time.format(start)} - TBD`;
  return `TBD - ${time.format(end as Date)}`;
}

export function minutesBetween(startIso: string, endIso: string) {
  const start = asValidDate(startIso);
  const end = asValidDate(endIso);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / 60000);
}
