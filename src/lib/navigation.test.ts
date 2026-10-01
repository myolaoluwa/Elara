import { describe, expect, it } from "vitest";
import { modules, navigationGroups } from "./navigation";

describe("workspace navigation", () => {
  it("includes each destination once, with search available in the topbar", () => {
    const destinations = navigationGroups.flatMap((group) => [...group.slugs]);
    expect(new Set(destinations).size).toBe(destinations.length);
    expect([...destinations, "search"].sort()).toEqual(modules.map((destination) => destination.slug).sort());
  });

  it("uses purpose-specific icons instead of decorative AI symbols", () => {
    for (const destination of modules) expect(destination.icon.displayName).not.toMatch(/Sparkles|Wand|Bot/);
  });
});
