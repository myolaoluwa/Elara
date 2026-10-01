import { afterEach, describe, expect, it, vi } from "vitest";
import { searchTavily } from "./tavily";

describe("Tavily research search", () => {
  const originalKey = process.env.TAVILY_API_KEY;

  afterEach(() => {
    process.env.TAVILY_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("returns no sources when Tavily is not configured", async () => {
    delete process.env.TAVILY_API_KEY;
    const fetcher = vi.fn();
    await expect(searchTavily("Acme", fetcher as unknown as typeof fetch)).resolves.toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses bearer authentication and filters unsafe result URLs", async () => {
    process.env.TAVILY_API_KEY = "tvly-test";
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [
      { title: "Reliable source", url: "https://example.com/report", content: "Verified excerpt", published_date: "2026-09-30" },
      { title: "Unsafe", url: "javascript:alert(1)", content: "Ignore" },
    ] }), { status: 200, headers: { "content-type": "application/json" } }));

    const sources = await searchTavily("Acme update", fetcher as unknown as typeof fetch);
    const [, request] = fetcher.mock.calls[0];
    expect(request.headers.authorization).toBe("Bearer tvly-test");
    expect(JSON.parse(request.body)).toMatchObject({ query: "Acme update", search_depth: "advanced", safe_search: true });
    expect(sources).toEqual([{ title: "Reliable source", url: "https://example.com/report", excerpt: "Verified excerpt", publishedAt: "2026-09-30" }]);
  });

  it("does not expose provider response bodies in errors", async () => {
    process.env.TAVILY_API_KEY = "tvly-test";
    const fetcher = vi.fn().mockResolvedValue(new Response("secret provider detail", { status: 401 }));
    await expect(searchTavily("Acme", fetcher as unknown as typeof fetch)).rejects.toThrow("Tavily rejected the configured API key");
  });
});
