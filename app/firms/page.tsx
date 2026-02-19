"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Firm = {
  id: string;
  name?: string;
  domain: string;
  createdAt: string;
};

export default function FirmsPage(): JSX.Element {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => domain.trim().length > 3, [domain]);

  async function load(): Promise<void> {
    const response = await fetch("/api/firms");
    const data = (await response.json()) as { firms: Firm[] };
    setFirms(data.firms ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createFirm(): Promise<void> {
    setError("");
    if (!canSubmit) {
      setError("Domain is required.");
      return;
    }

    const response = await fetch("/api/firms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || undefined, domain: domain.trim() })
    });

    const data = (await response.json()) as { firm?: Firm; error?: string };
    if (!response.ok) {
      setError(data.error ?? "Failed to create firm");
      return;
    }

    setName("");
    setDomain("");
    await load();
  }

  async function seedDemo(): Promise<void> {
    const response = await fetch("/api/firms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed" })
    });

    const payload = await response.json();
    if (response.ok) {
      await load();
      return;
    }

    setError((payload as { error?: string }).error ?? "Failed to seed");
  }

  return (
    <div className="grid gap-6">
      <Card className="fade-up">
        <CardHeader>Firms</CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Each firm represents one domain crawl profile and one set of evidence-backed USPs.
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            <Input placeholder="Firm name" value={name} onChange={(event) => setName(event.target.value)} />
            <Input
              placeholder="Firm domain (example.com)"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
            />
            <Button disabled={!canSubmit} onClick={() => void createFirm()}>
              Create Firm
            </Button>
            <Button variant="outline" onClick={() => void seedDemo()}>
              Seed demo firm + project
            </Button>
          </div>
          {error && <div className="mt-2 text-sm text-rose-600">{error}</div>}

          <div className="mt-4 space-y-2">
            {firms.length === 0 && <p className="text-sm text-slate-600">No firms yet.</p>}
            {firms.map((firm) => (
              <div key={firm.id} className="flex flex-col rounded-lg border border-slate-200 p-3">
                <div className="font-semibold">{firm.name || "Unnamed firm"}</div>
                <div className="text-sm text-slate-600">{firm.domain}</div>
                <div className="mt-2 flex gap-2">
                  <Link className="text-sm underline" href={`/firms/${firm.id}/crawl`}>
                    Crawl
                  </Link>
                  <Link className="text-sm underline" href={`/firms/${firm.id}/profile`}>
                    Profile
                  </Link>
                  <Link className="text-sm underline" href={`/firms/${firm.id}/usp`}>
                    USPs
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
