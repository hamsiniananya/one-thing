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

Your job is to create a practical 30-day learning journey for a user who wants
to focus deeply on ONE subject for one month.

IMPORTANT RULES:

1. Create exactly 30 lessons.
2. There must be exactly one lesson for each day from 1 to 30.
3. Group the lessons into logical modules.
4. Start from the user's current level.
5. Progress gradually.
6. Respect the user's available daily study time.
7. Mix learning, practice, review, reflection, and application.
8. Keep every lesson achievable within the user's daily time.
9. Keep descriptions concise.
10. The final days should consolidate the learner's knowledge.
11. Do not include unnecessary advanced material.
12. Use terminology and examples appropriate to the user's context.
13. Do not assume the user is in the United States.
14. Do not include US-specific financial products, tax forms, or laws unless the
user specifically asks for them.
15. Return ONLY the requested JSON object.
16. Do not include reasoning.
17. Do not include markdown.
18. Do not include code fences.
19. Do not include commentary before or after the JSON.

The difficulty of every lesson must be exactly one of:
"beginner", "intermediate", "advanced".

The estimatedMinutes value should reflect the user's available daily time.

The curriculum should feel like a coherent journey rather than a random list
of topics.
          `,
        },
        {
          role: "user",
          content: `
Create a 30-day learning journey.

Subject:
${theme}

Current level:
${level}

Available study time per day:
${dailyTime}

Learner context:
India

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
          `,
        },
      ],

      // Give the model enough room for the complete 30-day curriculum.
      max_tokens: 12000,

      temperature: 0.7,

      // Ask OpenRouter/model for JSON output.
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

    let curriculum;

    try {
      curriculum = curriculumSchema.parse(parsedOutput);
    } catch (error) {
      console.error("ZOD VALIDATION ERROR:", error);
      console.error("PARSED OUTPUT:", parsedOutput);

      return Response.json(
        {
          error: "The AI returned an invalid curriculum structure.",
        },
        { status: 500 }
      );
    }

    // Flatten lessons so we can verify the 30-day requirement.
    const lessons = curriculum.modules.flatMap(
      (module) => module.lessons
    );

    if (lessons.length !== 30) {
      console.error(
        `Invalid lesson count: expected 30, got ${lessons.length}`
      );

      return Response.json(
        {
          error: `The AI generated ${lessons.length} lessons instead of 30.`,
        },
        { status: 500 }
      );
    }

    const days = lessons.map((lesson) => lesson.day);

    const expectedDays = Array.from(
      { length: 30 },
      (_, index) => index + 1
    );

    const hasAllDays =
      days.length === expectedDays.length &&
      expectedDays.every((day) => days.includes(day));

    if (!hasAllDays) {
      console.error("Invalid day sequence:", days);

      return Response.json(
        {
          error: "The AI generated an invalid day sequence.",
        },
        { status: 500 }
      );
    }

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