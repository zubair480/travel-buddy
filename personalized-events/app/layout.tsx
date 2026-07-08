import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fogline | SF Events",
  description: "Personalized San Francisco events and one-day plans."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
