import OpenAI from "openai";
import { z } from "zod";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

const requestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("summary"),
    theme: z.string().trim().min(1).max(200),
    weekTitle: z.string().trim().min(1).max(200),
    weekDescription: z.string().trim().max(500),
    topic: z.string().trim().min(1).max(300),
    resources: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(240),
          source: z.string().trim().min(1).max(200),
          url: z.string().url().max(2048),
          snippet: z.string().trim().max(500),
        }),
      )
      .min(1)
      .max(4),
  }),
  z.object({
    mode: z.literal("question"),
    topic: z.string().trim().min(1).max(300),
    question: z.string().trim().min(1).max(1000),
  }),
]);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return Response.json({ error: "Sign in to use One Thing topic help." }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI help is not configured. Set OPENROUTER_API_KEY." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid topic assistant request." }, { status: 400 });
  }

  const input = parsed.data;
  const systemPrompt =
    input.mode === "summary"
      ? 'Write a concise explanation of the selected topic using ONLY the retrieved resource titles and snippets provided by the user. The topic is part of the stated subject and week context. Return valid JSON matching {"bullets":["...","..."]} with exactly 2 to 4 clear, informative, beginner-friendly bullets. Each bullet should explain an actual concept in the topic, not discuss safety, the user, or the request. Do not invent facts, sources, or links. Add a source citation at the end of each bullet using [1], [2], etc. matching the supplied resource list. If the retrieved snippets do not contain enough information to explain the topic, return {"error":"The retrieved resources do not contain enough information for a reliable summary."}. Do not create a lesson, course, quiz, or long lecture.'
      : "Answer the learner's specific question about the provided topic. Be accurate, direct, beginner-friendly, and concise (at most 4 short sentences). Do not generate a lecture, lesson, quiz, or unrelated material.";

  const context =
    input.mode === "summary"
      ? `Subject: ${input.theme}\nWeek: ${input.weekTitle}\nWeek context: ${input.weekDescription}\nSelected topic: ${input.topic}\n\nRetrieved resources (use only these; numbers are citation IDs):\n${input.resources
          .map(
            (resource, index) =>
              `[${index + 1}] ${resource.source} — ${resource.title}\nURL: ${resource.url}\nSnippet: ${resource.snippet}`,
          )
          .join("\n\n")}`
      : `Topic: ${input.topic}\nLearner question: ${input.question}`;

  try {
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });
    const response = await openai.chat.completions.create({
      model: "openrouter/free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context },
      ],
      ...(input.mode === "summary"
        ? { response_format: { type: "json_object" as const } }
        : {}),
      max_tokens: input.mode === "summary" ? 360 : 280,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      console.error("Topic assistant returned an empty response:", response);
      return Response.json({ error: "AI help returned no answer. Please try again." }, { status: 502 });
    }

    if (input.mode === "summary") {
      let decoded: unknown;
      try {
        decoded = JSON.parse(content);
      } catch {
        console.error("Topic summary returned invalid JSON:", content);
        return Response.json({ error: "Could not create a source-based summary. Please try again." }, { status: 502 });
      }

      const summarySchema = z.object({
        bullets: z.array(z.string().trim().min(1).max(500)).min(2).max(4),
      });
      const summary = summarySchema.safeParse(decoded);
      if (!summary.success) {
        const errorSchema = z.object({ error: z.string().trim().min(1) });
        const summaryError = errorSchema.safeParse(decoded);
        if (summaryError.success) {
          return Response.json(
            { error: summaryError.data.error },
            { status: 422 },
          );
        }
        console.error("Topic summary did not match the expected format:", decoded);
        return Response.json({ error: "Could not create a source-based summary. Please try again." }, { status: 502 });
      }

      const invalidCitation = summary.data.bullets.some((bullet) => {
        const citations = [...bullet.matchAll(/\[(\d+)\]/g)].map((match) =>
          Number(match[1]),
        );
        return (
          citations.length === 0 ||
          citations.some(
            (citation) => citation < 1 || citation > input.resources.length,
          )
        );
      });
      if (invalidCitation) {
        console.error("Topic summary included invalid or missing source citations.");
        return Response.json({ error: "Could not create a properly sourced summary. Please try again." }, { status: 502 });
      }

      return Response.json({ bullets: summary.data.bullets });
    }

    return Response.json({ answer: content });
  } catch (error) {
    console.error("Topic assistant request failed:", error);
    return Response.json({ error: "AI help is temporarily unavailable." }, { status: 502 });
  }
}
