import { z } from "zod";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

const notesRequestSchema = z.object({
  week: z.literal(1),
  topic: z.string().trim().min(1).max(300),
  email: z.string().trim().email().max(320),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return Response.json({ error: "Sign in to save this request." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = notesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const { error } = await supabase.from("topic_notes_requests").insert({
    user_id: authData.user.id,
    ...parsed.data,
  });

  if (error) {
    console.error("Could not save topic notes request:", error.message);
    return Response.json({ error: "Could not save your request." }, { status: 500 });
  }

  return Response.json({ success: true }, { status: 201 });
}
