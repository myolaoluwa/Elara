"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Hydrate with a stable UTC representation, then show the viewer's local time. */
export function LocalDateTime({ value, dateOnly = false }: { value: string; dateOnly?: boolean }) {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const timezone = mounted ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const formatted = new Intl.DateTimeFormat("en", { dateStyle: "medium", ...(dateOnly ? {} : { timeStyle: "short" as const }), timeZone: timezone }).format(new Date(value));
  return <time dateTime={value} title={`${formatted} · ${timezone}`}>{formatted}</time>;
}
