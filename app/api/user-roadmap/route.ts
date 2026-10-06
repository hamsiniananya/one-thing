import { z } from "zod";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

const roadmapSchema = z.object({
  theme: z.string().trim().min(1).max(200),
  goal: z.string().trim().min(1).max(1000),
  weeks: z
    .array(
      z.object({
        week: z.number().int().min(1).max(4),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(500),
        subtopics: z.array(z.string().trim().min(1).max(300)).max(20),
      }),
    )
    .length(4),
});

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      response: Response.json({ error: "Sign in to access your roadmap." }, { status: 401 }),
    };
  }

  return { supabase, user: data.user };
}

export async function GET() {
  const auth = await getAuthenticatedClient();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("user_roadmaps")
    .select("roadmap")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    console.error("Could not load the user's roadmap:", error.message);
    return Response.json({ error: "Could not load your saved roadmap." }, { status: 500 });
  }

  if (!data) return Response.json({ roadmap: null });

  const parsed = roadmapSchema.safeParse(data.roadmap);
  if (!parsed.success) {
    console.error("Stored roadmap has an invalid shape:", parsed.error.flatten());
    return Response.json({ error: "Your saved roadmap is invalid." }, { status: 500 });
  }

  return Response.json({ roadmap: parsed.data });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedClient();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = roadmapSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid roadmap structure." }, { status: 400 });
  }

  const { error } = await auth.supabase.from("user_roadmaps").upsert(
    {
      user_id: auth.user.id,
      roadmap: parsed.data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Could not save the user's roadmap:", error.message);
    return Response.json({ error: "Could not save your roadmap." }, { status: 500 });
  }

  return Response.json({ success: true });
}
