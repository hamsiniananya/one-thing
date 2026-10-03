import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One Thing — one curiosity at a time",
  description: "A weird little computer that turns one curiosity into a month of learning.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
