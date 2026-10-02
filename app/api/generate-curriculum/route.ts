import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const curriculumSchema = z.object({
  theme: z.string(),
  goal: z.string(),
  modules: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      lessons: z.array(
        z.object({
          day: z.number(),
          title: z.string(),
          description: z.string(),
          estimatedMinutes: z.number(),
          difficulty: z.enum([
            "beginner",
            "intermediate",
            "advanced",
          ]),
        })
      ),
    })
  ),
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

    console.log("Generating curriculum for:", {
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

The user chooses ONE subject to master during a 30-day month.

Create a practical, progressive 30-day learning journey.

Rules:
- Start from the user's current level.
- Progress gradually from fundamentals to more advanced concepts.
- Respect the user's available daily study time.
- Divide the curriculum into logical modules.
- The total curriculum must contain exactly 30 lessons.
- Each lesson belongs to one day from 1 to 30.
- Keep lesson descriptions concise and useful.
- Do not make the lessons unnecessarily difficult.
- Include a mixture of learning, practice, review, and application.
- The final days should help the learner consolidate what they learned.

IMPORTANT:
Return ONLY valid JSON.
Do not use markdown.
Do not write explanations before or after the JSON.

Return exactly this structure:

{
  "theme": "string",
  "goal": "string",
  "modules": [
    {
      "title": "string",
      "description": "string",
      "lessons": [
        {
          "day": 1,
          "title": "string",
          "description": "string",
          "estimatedMinutes": 30,
          "difficulty": "beginner"
        }
      ]
    }
  ]
}

Difficulty must be exactly one of:
"beginner", "intermediate", "advanced"
          `,
        },
        {
          role: "user",
          content: `
Subject: ${theme}

Current level: ${level}

Available study time per day: ${dailyTime}

Build my 30-day learning journey.
          `,
        },
      ],

      max_tokens: 3500,

      temperature: 0.7,
    });

    console.log("RAW AI RESPONSE:", response);

    const rawOutput = response.choices?.[0]?.message?.content;

    if (!rawOutput) {
      console.error("AI returned no content:", response);

      return Response.json(
        {
          error:
            "The AI returned an empty response. Please try again.",
        },
        { status: 500 }
      );
    }

    console.log("AI TEXT:", rawOutput);

    // Sometimes models wrap JSON in ```json ... ```
    const cleanedOutput = rawOutput
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsedOutput;

    try {
      parsedOutput = JSON.parse(cleanedOutput);
    } catch (error) {
      console.error("JSON PARSE ERROR:", error);
      console.error("RAW OUTPUT:", rawOutput);

      return Response.json(
        {
          error: "The AI returned an invalid curriculum format.",
        },
        { status: 500 }
      );
    }

    const curriculum = curriculumSchema.parse(parsedOutput);

    // Always preserve exactly what the user entered.
    curriculum.theme = theme;

    console.log("FINAL CURRICULUM:", curriculum);

    return Response.json(curriculum);
  } catch (error) {
    console.error("CURRICULUM GENERATION ERROR:", error);

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