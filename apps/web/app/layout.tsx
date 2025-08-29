import "./globals.css";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export const metadata = {
  title: "RepoGuide – Onboarding",
  description: "Ask about the codebase, run preflight checks, index docs, and generate onboarding plans.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 antialiased">
        {children}
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
