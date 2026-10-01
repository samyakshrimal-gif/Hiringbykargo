import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { aiEnabled } from "@/lib/ai";
import { storageMode } from "@/lib/store";

export const metadata: Metadata = {
  title: "Kargo Shortlist",
  description: "Calibrated hiring shortlist for Kargo's product roles",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const status = {
    ai: aiEnabled(),
    storage: storageMode(),
    email: Boolean(process.env.RESEND_API_KEY),
    testRecipient: Boolean(process.env.EMAIL_TEST_RECIPIENT),
  };
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Sidebar status={status} />
          <main className="ledger min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
