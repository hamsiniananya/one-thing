import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

function safeReturnPath(path: string | null) {
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnPath = safeReturnPath(requestUrl.searchParams.get("next"));
  const destination = new URL(returnPath, requestUrl.origin);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(destination);
    }

    console.error("Supabase OAuth callback failed:", error.message);
    destination.searchParams.set("auth_error", "oauth_callback_failed");
  } else {
    destination.searchParams.set("auth_error", "oauth_code_missing");
  }

  return NextResponse.redirect(destination);
}
