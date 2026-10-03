import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
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

    console.log("Generating roadmap for:", {
      theme,
      level,
      dailyTime,
    });

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

      max_tokens: 4000,
      temperature: 0.7,

      response_format: {
        type: "json_object",
      },
    });

    console.log("RAW AI RESPONSE:", response);

    const rawOutput = response.choices?.[0]?.message?.content;

    if (!rawOutput) {
      console.error("AI returned no content:", response);

      return Response.json(
        {
          error: "The AI returned an empty response. Please try again.",
        },
        { status: 500 }
      );
    }

    console.log("AI TEXT:", rawOutput);

    let parsedOutput;

    try {
      parsedOutput = JSON.parse(rawOutput);
    } catch (error) {
      console.error("JSON PARSE ERROR:", error);
      console.error("RAW OUTPUT:", rawOutput);

      return Response.json(
        {
          error: "The AI returned invalid JSON. Please try again.",
        },
        { status: 500 }
      );
    }

    let roadmap;

    try {
      roadmap = roadmapSchema.parse(parsedOutput);
    } catch (error) {
      console.error("ZOD VALIDATION ERROR:", error);
      console.error("PARSED OUTPUT:", parsedOutput);

      return Response.json(
        {
          error: "The AI returned an invalid roadmap structure.",
        },
        { status: 500 }
      );
    }

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

    console.log("FINAL ROADMAP:", roadmap);

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