import { z } from "zod";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

const updateProgressSchema = z.object({
  week: z.literal(1),
  topicIndex: z.number().int().min(0).max(4),
  topic: z.string().trim().min(1).max(300),
  completed: z.boolean(),
});

async function getAuthenticatedSupabase() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return { response: Response.json({ error: "Sign in to save your progress." }, { status: 401 }) };
  return { supabase, user: data.user };
}

export async function GET() {
  const auth = await getAuthenticatedSupabase();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("topic_progress")
    .select("topic_index, topic, completed")
    .eq("user_id", auth.user.id)
    .eq("week", 1)
    .eq("completed", true)
    .order("topic_index");

  if (error) {
    console.error("Could not load topic progress:", error.message);
    return Response.json({ error: "Could not load your progress." }, { status: 500 });
  }

  return Response.json({ completedTopics: data });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = updateProgressSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid topic progress request." }, { status: 400 });
  }

  const { week, topicIndex, topic, completed } = parsed.data;
  const { error } = await auth.supabase.from("topic_progress").upsert(
    {
      user_id: auth.user.id,
      week,
      topic_index: topicIndex,
      topic,
      completed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week,topic_index" },
  );

  if (error) {
    console.error("Could not save topic progress:", error.message);
    return Response.json({ error: "Could not save your progress." }, { status: 500 });
  }

  return Response.json({ success: true });
}
