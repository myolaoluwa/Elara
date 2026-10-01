"use client";

import { useSyncExternalStore } from "react";

export function TodayLabel() {
  const label = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return <p className="eyebrow">{label}</p>;
}

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
