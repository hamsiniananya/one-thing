import { z } from "zod";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

const notesRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("requested"),
    week: z.literal(1),
    topic: z.string().trim().min(1).max(300),
    email: z.string().trim().email().max(320),
  }),
  z.object({
    action: z.literal("deferred"),
    week: z.literal(1),
  }),
]);

async function authenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { response: Response.json({ error: "Sign in to save this request." }, { status: 401 }) };
  }

  return { supabase, user: authData.user };
}

export async function GET(request: Request) {
  const auth = await authenticatedClient();
  if ("response" in auth) return auth.response;

  const week = new URL(request.url).searchParams.get("week");
  if (week !== "1") {
    return Response.json({ error: "Invalid week." }, { status: 400 });
  }

  const { data: prompt, error: promptError } = await auth.supabase
    .from("topic_notes_week_prompts")
    .select("status")
    .eq("user_id", auth.user.id)
    .eq("week", 1)
    .maybeSingle();

  if (promptError) {
    console.error("Could not load week notes prompt state:", promptError.message);
    return Response.json({ error: "Could not load notes request status." }, { status: 500 });
  }

  if (prompt) return Response.json({ status: prompt.status });

  const { data: previousRequest, error: requestError } = await auth.supabase
    .from("topic_notes_requests")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("week", 1)
    .limit(1)
    .maybeSingle();

  if (requestError) {
    console.error("Could not check existing week notes requests:", requestError.message);
    return Response.json({ error: "Could not load notes request status." }, { status: 500 });
  }

  return Response.json({ status: previousRequest ? "requested" : null });
}

export async function POST(request: Request) {
  const auth = await authenticatedClient();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = notesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid week notes request." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { action, week } = parsed.data;

  if (action === "requested") {
    const { topic, email } = parsed.data;
    const { error: requestError } = await auth.supabase.from("topic_notes_requests").insert({
      user_id: auth.user.id,
      week,
      topic,
      email,
    });

    if (requestError) {
      console.error("Could not save topic notes request:", requestError.message);
      return Response.json({ error: "Could not save your request." }, { status: 500 });
    }
  }

  const { error: stateError } = await auth.supabase
    .from("topic_notes_week_prompts")
    .upsert(
      {
        user_id: auth.user.id,
        week,
        status: action,
        updated_at: now,
      },
      { onConflict: "user_id,week" },
    );

  if (stateError) {
    console.error("Could not save week notes prompt state:", stateError.message);
    return Response.json({ error: "Could not save your week notes choice." }, { status: 500 });
  }

  return Response.json({ success: true }, { status: action === "requested" ? 201 : 200 });
}
