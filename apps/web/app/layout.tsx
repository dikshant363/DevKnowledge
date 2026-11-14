import "./globals.css";
import React from "react";

export const metadata = {
  title: "DevKnowledge — AI Developer Knowledge Infrastructure",
  description: "Continuous documentation intelligence for AI coding agents and engineering teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
