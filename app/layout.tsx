import Link from "next/link";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Law PPC Content Studio",
  description: "Generate verified landing pages and Google Ads assets for family law firms at scale."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 lg:px-8">
          <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <nav className="flex flex-wrap items-center gap-4 text-sm">
              <Link href="/firms" className="font-semibold">
                Firms
              </Link>
              <Link href="/projects">Projects</Link>
              <Link href="/firms">Create firm</Link>
            </nav>
            <h1 className="mt-4 text-2xl font-bold">Family Law PPC Content Studio</h1>
            <p className="text-sm text-slate-600">
              Crawl firm sites, extract verified differentiators, generate landing pages and Google Ads.
            </p>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
