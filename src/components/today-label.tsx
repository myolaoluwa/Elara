"use client";

import { useSyncExternalStore } from "react";

export function TodayLabel() {
  const timestamp = useSyncExternalStore(subscribeToClock, getDateSnapshot, getServerDateSnapshot);
  const label = timestamp ? new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp)) : "Today";

  return <p className="eyebrow">{label}</p>;
}

function getDateSnapshot() { return Math.floor(Date.now() / 30_000) * 30_000; }
function getServerDateSnapshot() { return 0; }

function subscribeToClock(onChange: () => void) {
  const interval = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(interval);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

function getServerGreeting() {
  return "Good morning";
}

export function DashboardGreeting({ name }: { name: string }) {
  const greeting = useSyncExternalStore(subscribeToClock, getGreeting, getServerGreeting);
  return <h1>{greeting}, {name}.</h1>;
}
