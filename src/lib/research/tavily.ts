import { z } from "zod";

const tavilyResponseSchema = z.object({
  results: z.array(z.object({
    title: z.string().optional(),
    url: z.string().optional(),
    content: z.string().optional(),
    published_date: z.string().nullable().optional(),
  })).default([]),
});

export type ResearchSource = { title: string; url: string; excerpt: string; publishedAt?: string };

export async function searchTavily(query: string, fetcher: typeof fetch = fetch): Promise<ResearchSource[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return [];

  const response = await fetcher("https://api.tavily.com/search", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      chunks_per_source: 3,
      max_results: 6,
      topic: "general",
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      safe_search: true,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(tavilyError(response.status));

  const payload = tavilyResponseSchema.parse(await response.json());
  return payload.results.flatMap((item) => {
    if (!item.title || !isHttpUrl(item.url)) return [];
    return [{
      title: item.title.slice(0, 300),
      url: item.url!,
      excerpt: (item.content || "").slice(0, 2_000),
      ...(item.published_date ? { publishedAt: item.published_date } : {}),
    }];
  });
}

function tavilyError(status: number) {
  if (status === 401) return "Tavily rejected the configured API key";
  if ([429, 432, 433].includes(status)) return "Tavily usage limit was reached";
  return "Tavily search is temporarily unavailable";
}

function isHttpUrl(value: string | undefined) {
  if (!value) return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}
