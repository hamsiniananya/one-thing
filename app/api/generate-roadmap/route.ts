import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  timeout: 60_000,
  maxRetries: 0,
});

const roadmapSchema = z.object({
  theme: z.string(),
  goal: z.string(),
  weeks: z
    .array(
      z.object({
        week: z.number(),
        title: z.string(),
        description: z.string(),
        subtopics: z.array(z.string()),
      })
    )
    .length(4),
});

const roadmapJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["theme", "goal", "weeks"],
  properties: {
    theme: { type: "string" },
    goal: { type: "string" },
    weeks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["week", "title", "description", "subtopics"],
        properties: {
          week: { type: "number" },
          title: { type: "string" },
          description: { type: "string" },
          subtopics: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

function parseJsonResponse(text: string): unknown {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const objectStart = normalized.indexOf("{");
  if (objectStart < 0) {
    throw new SyntaxError("No JSON object found in model response.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = objectStart; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(normalized.slice(objectStart, index + 1));
      }
    }
  }

  throw new SyntaxError("The JSON object in the model response is incomplete.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { theme, level, dailyTime } = body;

    if (!theme || !level || !dailyTime) {
      return Response.json(
        {
          error: "Theme, level, and daily time are required.",
        },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "openrouter/free",

      messages: [
        {
          role: "system",
          content: `
You are the curriculum architect for an app called "One Thing".

Create a 4-week learning roadmap for a person who wants to focus on ONE subject for one month.

IMPORTANT:
- Create exactly 4 weeks.
- Each week must have one clear learning theme.
- Each week should contain 4 to 6 concise subtopics.
- The roadmap must progress logically from the user's current level.
- Do not generate individual daily lessons.
- Do not generate lesson content.
- Do not generate quizzes.
- Do not generate exercises.
- Do not generate detailed explanations.
- Keep subtopics short.
- Respect the user's available daily study time.
- The final week should consolidate and apply what was learned.
- Avoid unnecessary advanced material.
- Use examples appropriate to the learner's context.
- Do not assume the learner is in the United States.
- For financial topics, do not include US-specific tax forms, laws, or financial products unless explicitly requested.

Return ONLY valid JSON.
Do not include markdown.
Do not include code fences.
Do not include reasoning.
Do not include commentary before or after the JSON.

Return exactly this structure:

{
  "theme": "string",
  "goal": "string",
  "weeks": [
    {
      "week": 1,
      "title": "string",
      "description": "string",
      "subtopics": ["string"]
    },
    {
      "week": 2,
      "title": "string",
      "description": "string",
      "subtopics": ["string"]
    },
    {
      "week": 3,
      "title": "string",
      "description": "string",
      "subtopics": ["string"]
    },
    {
      "week": 4,
      "title": "string",
      "description": "string",
      "subtopics": ["string"]
    }
  ]
}
          `,
        },
        {
          role: "user",
          content: `
Create the 4-week roadmap.

Subject:
${theme}

Current level:
${level}

Available study time per day:
${dailyTime}

Learner context:
India
          `,
        },
      ],

      max_tokens: 12000,
      temperature: 0.7,

      response_format: {
        type: "json_schema",
        json_schema: {
          name: "one_thing_roadmap",
          strict: true,
          schema: roadmapJsonSchema,
        },
      },
    });

    const rawOutput = response.choices?.[0]?.message?.content;
    const finishReason = response.choices?.[0]?.finish_reason ?? "unknown";

    if (!rawOutput) {
      console.error("Roadmap model returned no content:", {
        model: response.model,
        finishReason,
        usage: response.usage,
        refusal: response.choices?.[0]?.message?.refusal,
      });

      return Response.json(
        {
          error:
            response.choices?.[0]?.message?.refusal ??
            "The AI returned an empty response. Please try again.",
        },
        { status: 502 }
      );
    }

    console.info("Roadmap model response metadata:", {
      model: response.model,
      finishReason,
      usage: response.usage,
      outputLength: rawOutput.length,
    });

    let parsedOutput: unknown;

    try {
      parsedOutput = parseJsonResponse(rawOutput);
    } catch (error) {
      console.error("Roadmap JSON parsing failed:", {
        model: response.model,
        finishReason,
        usage: response.usage,
        outputLength: rawOutput.length,
        outputPreview: rawOutput.slice(0, 1200),
        error,
      });

      return Response.json(
        {
          error:
            finishReason === "length"
              ? "The AI response was cut off before the roadmap was complete. Please try again."
              : "The AI response was not valid roadmap JSON. Please try again.",
        },
        { status: 502 }
      );
    }

    const roadmapResult = roadmapSchema.safeParse(parsedOutput);
    if (!roadmapResult.success) {
      console.error("Roadmap Zod validation failed:", {
        model: response.model,
        finishReason,
        issues: roadmapResult.error.issues,
        parsedOutput,
      });

      return Response.json(
        {
          error: "The AI returned an invalid roadmap structure.",
        },
        { status: 502 }
      );
    }
    const roadmap = roadmapResult.data;

    const expectedWeeks = [1, 2, 3, 4];

    const weeksAreValid = roadmap.weeks.every(
      (week, index) => week.week === expectedWeeks[index]
    );

    if (!weeksAreValid) {
      console.error(
        "Invalid week sequence:",
        roadmap.weeks.map((week) => week.week)
      );

      return Response.json(
        {
          error: "The AI generated an invalid week sequence.",
        },
        { status: 500 }
      );
    }

    // Preserve exactly what the user entered.
    roadmap.theme = theme;

    return Response.json(roadmap);
  } catch (error) {
    console.error("ROADMAP GENERATION ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error occurred.";

    return Response.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}