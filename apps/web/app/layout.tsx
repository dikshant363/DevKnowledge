import "./globals.css";
import React from "react";

export const metadata = {
  title: "DevKnowledge — AI Developer Knowledge Workstation",
  description: "Continuous documentation intelligence and canonical knowledge repository for AI coding agents and engineering teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-[#070a12] dark:text-slate-100 transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}
