"use client";

export function TodayLabel() {
  const label = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return <p className="eyebrow">{label}</p>;
}
