function partsFor(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function dateKeyInZone(value: Date, timeZone: string) {
  const parts = partsFor(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function dateOnlyKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function formatTimeInZone(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", { timeZone, hour: "numeric", minute: "2-digit" }).format(value);
}

export function formatDateInZone(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(value);
}

export function toDateTimeLocalInZone(value: Date, timeZone: string) {
  const parts = partsFor(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
