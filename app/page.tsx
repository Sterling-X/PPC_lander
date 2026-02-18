import Link from "next/link";

export default function Home(): JSX.Element {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <h2 className="text-xl font-bold">Welcome to the family-law PPC content studio</h2>
      <p className="mt-2 text-sm text-slate-600">
        Start by creating a firm, running a crawl, selecting verified USPs, then building projects and generating compliant content.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/firms" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Manage Firms
        </Link>
        <Link href="/projects" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">
          Manage Projects
        </Link>
      </div>
    </section>
  );
}
