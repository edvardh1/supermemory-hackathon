import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Employable — the last job application you'll ever fill out",
  description:
    "Employable pulls every opening from Ashby, Greenhouse, Lever, and Workday into one feed — then applies on your behalf. Set up your profile once; we handle the rest.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
