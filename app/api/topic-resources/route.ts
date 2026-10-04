import { z } from "zod";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

const topicRequestSchema = z.object({
  topic: z.string().trim().min(1).max(300),
  theme: z.string().trim().min(1).max(200),
});

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
};

const preferredIndianSources = [
  "sebi.gov.in",
  "nseindia.com",
  "bseindia.com",
  "rbi.org.in",
  "amfiindia.com",
  "moneycontrol.com",
  "economictimes.indiatimes.com",
  "livemint.com",
  "ncert.nic.in",
  "ignou.ac.in",
  "iimb.ac.in",
  "pib.gov.in",
  "india.gov.in",
];

function cleanSearchText(value: string, maxLength: number) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^ {0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
    .replace(/[`*_~>#]/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return Response.json({ error: "Sign in to search learning resources." }, { status: 401 });
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Topic resource search is not configured. Set TAVILY_API_KEY to enable verified article links.",
        code: "RESOURCE_SEARCH_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = topicRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "A valid topic and theme are required." }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: `${parsed.data.topic} ${parsed.data.theme} India Indian educational official sources SEBI NSE BSE RBI AMFI Moneycontrol Economic Times`,
        search_depth: "basic",
        max_results: 4,
        include_answer: false,
        include_raw_content: false,
        country: "india",
        include_domains: preferredIndianSources,
        exclude_domains: ["investor.gov", "vanguard.com", "schwab.com"],
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      console.error("Tavily resource search failed:", response.status, await response.text());
      return Response.json({ error: "Article search is temporarily unavailable." }, { status: 502 });
    }

    const data: { results?: TavilyResult[] } = await response.json();
    const resources = (data.results ?? [])
      .filter((result): result is TavilyResult & { title: string; url: string } =>
        typeof result.title === "string" &&
        typeof result.url === "string" &&
        /^https?:\/\//i.test(result.url),
      )
      .map((result) => {
        const url = new URL(result.url);
        return {
          title: cleanSearchText(result.title, 240),
          url: url.toString(),
          source: url.hostname.replace(/^www\./, ""),
          description: cleanSearchText(result.content ?? "", 500),
          publishedDate: result.published_date ?? null,
        };
      })
      .filter((result) => {
        const hostname = new URL(result.url).hostname.toLowerCase();
        return (
          result.title.length > 0 &&
          preferredIndianSources.some(
            (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
          )
        );
      })
      .slice(0, 4);

    return Response.json({ resources });
  } catch (error) {
    console.error("Topic resource search request failed:", error);
    return Response.json({ error: "Article search is temporarily unavailable." }, { status: 502 });
  }
}
