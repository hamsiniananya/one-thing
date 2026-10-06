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

type TopicResource = {
  title: string;
  url: string;
  source: string;
  description: string;
  publishedDate: string | null;
  relevance: number;
};

const stopWords = new Set([
  "about", "after", "also", "and", "are", "for", "from", "how", "into",
  "learn", "learning", "more", "over", "that", "the", "their", "this",
  "through", "what", "when", "where", "with", "your",
]);

const blockedPagePattern =
  /\b(captcha|access denied|verify you are human|are you a robot|checking your browser|attention required|request blocked|temporarily unavailable|403 forbidden|robot check)\b/i;

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

function tokens(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]{3,}/g)
    ?.filter((token) => !stopWords.has(token))
    .map((token) => (token.endsWith("ies") ? `${token.slice(0, -3)}y` : token.replace(/s$/, ""))) ?? [];
}

function scoreRelevance(topic: string, title: string, description: string) {
  const topicTokens = [...new Set(tokens(topic))];
  if (topicTokens.length === 0) return 0;

  const titleTokens = new Set(tokens(title));
  const descriptionTokens = new Set(tokens(description));
  const matchedTitle = topicTokens.filter((token) => titleTokens.has(token)).length;
  const matchedAny = topicTokens.filter(
    (token) => titleTokens.has(token) || descriptionTokens.has(token),
  ).length;

  return matchedTitle * 2 + matchedAny;
}

function isRelevant(topic: string, title: string, description: string) {
  const topicTokens = [...new Set(tokens(topic))];
  if (topicTokens.length === 0) return false;
  const titleTokens = new Set(tokens(title));
  const descriptionTokens = new Set(tokens(description));
  const titleMatches = topicTokens.filter((token) => titleTokens.has(token)).length;
  const anyMatches = topicTokens.filter(
    (token) => titleTokens.has(token) || descriptionTokens.has(token),
  ).length;

  return (
    title.length >= 4 &&
    description.length >= 30 &&
    !blockedPagePattern.test(`${title} ${description}`) &&
    (titleMatches / topicTokens.length >= 0.5 ||
      anyMatches / topicTokens.length >= 0.75)
  );
}

function parseResource(result: TavilyResult, topic: string): TopicResource | null {
  if (typeof result.title !== "string" || typeof result.url !== "string") return null;

  let url: URL;
  try {
    url = new URL(result.url);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hostname === "localhost" ||
    !url.hostname.includes(".")
  ) {
    return null;
  }

  const title = cleanSearchText(result.title, 240);
  const description = cleanSearchText(result.content ?? "", 500);
  if (!isRelevant(topic, title, description)) return null;

  url.hash = "";
  return {
    title,
    url: url.toString(),
    source: url.hostname.replace(/^www\./, ""),
    description,
    publishedDate: result.published_date ?? null,
    relevance: scoreRelevance(topic, title, description),
  };
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

  const { topic, theme } = parsed.data;
  const indiaContext = /\b(india|indian|sebi|nse|bse|rbi|amfi)\b/i.test(`${theme} ${topic}`);
  const query = [topic, theme, indiaContext ? "India" : "", "guide article explanation"]
    .filter(Boolean)
    .join(" ");

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 10,
        include_answer: false,
        include_raw_content: false,
        ...(indiaContext ? { country: "india" } : {}),
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      console.error("Tavily resource search failed:", response.status, await response.text());
      return Response.json({ error: "Article search is temporarily unavailable." }, { status: 502 });
    }

    const data: { results?: TavilyResult[] } = await response.json();
    const seen = new Set<string>();
    const resources = (data.results ?? [])
      .map((result) => parseResource(result, topic))
      .filter((result): result is TopicResource => result !== null)
      .sort((left, right) => right.relevance - left.relevance)
      .filter((result) => {
        if (seen.has(result.url)) return false;
        seen.add(result.url);
        return true;
      })
      .slice(0, 4)
      .map((resource) => ({
        title: resource.title,
        url: resource.url,
        source: resource.source,
        description: resource.description,
        publishedDate: resource.publishedDate,
      }));

    return Response.json({ resources });
  } catch (error) {
    console.error("Topic resource search request failed:", error);
    return Response.json({ error: "Article search is temporarily unavailable." }, { status: 502 });
  }
}
