import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/auth-provider";
import { createSupabaseServerClient } from "../lib/supabase/server";

export const metadata: Metadata = {
  title: "One Thing — one curiosity at a time",
  description: "A weird little computer that turns one curiosity into a month of learning.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Could not load the Supabase user session:", error.message);
  }

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <AuthProvider initialUser={data.user}>{children}</AuthProvider>
      </body>
    </html>
  );
}
