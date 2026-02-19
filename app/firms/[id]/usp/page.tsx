"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { rankUsps } from "@/lib/usp";

type FirmProfile = {
  differentiators: Array<{
    id: string;
    claim: string;
    source: { url: string; snippet: string };
    type: string;
    isVerified: boolean;
    isGeneric: boolean;
  }>;
};

type Firm = {
  id: string;
  name?: string;
  firmProfile?: FirmProfile;
  uspSelection: {
    chosenPrimaryUspId: string | null;
    chosenSupportingUspIds: string[];
    blockedUspIds: string[];
  };
};

type RankedUsp = ReturnType<typeof rankUsps>[number];

export default function FirmUspPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [firm, setFirm] = useState<Firm | null>(null);
  const [ranked, setRanked] = useState<RankedUsp[]>([]);
  const [primary, setPrimary] = useState("");
  const [supporting, setSupporting] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [practiceArea, setPracticeArea] = useState("Family Law");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const computeRankedUspCandidates = useCallback((profile?: Firm["firmProfile"]): void => {
    if (!profile?.differentiators) {
      setRanked([]);
      return;
    }

    const rankedCandidates = rankUsps(
      {
        brandVoice: {},
        trustSignals: {
          reviews: { rating: null, count: null, sources: [] },
          awards: [],
          memberships: []
        },
        attorneys: [],
        processStatements: [],
        differentiators: profile.differentiators,
        doNotSay: []
      },
      practiceArea
    ).sort((a, b) => b.score - a.score);

    setRanked(rankedCandidates);
  }, [practiceArea]);

  const load = useCallback(async (): Promise<void> => {
    const response = await fetch(`/api/firms/${id}`);
    const payload = (await response.json()) as { firm?: Firm };
    if (!response.ok || !payload.firm) return;

    const next = payload.firm;
    setFirm(next);
    setPrimary(next.uspSelection?.chosenPrimaryUspId ?? "");
    setSupporting(next.uspSelection?.chosenSupportingUspIds ?? []);
    setBlocked(next.uspSelection?.blockedUspIds ?? []);
    computeRankedUspCandidates(next.firmProfile);
  }, [computeRankedUspCandidates, id]);

  useEffect(() => {
    if (!firm?.firmProfile) {
      setRanked([]);
      return;
    }

    computeRankedUspCandidates(firm.firmProfile);
  }, [computeRankedUspCandidates, firm]);

  useEffect(() => {
    void load();
  }, [load]);

  function isSupporting(id: string): boolean {
    return supporting.includes(id);
  }

  function toggleSupport(candidateId: string): void {
    if (isSupporting(candidateId)) {
      setSupporting((current) => current.filter((item) => item !== candidateId));
      return;
    }
    if (supporting.length >= 3) return;
    setSupporting((current) => [...current, candidateId]);
  }

  function toggleBlocked(candidateId: string): void {
    setBlocked((current) => (current.includes(candidateId) ? current.filter((item) => item !== candidateId) : [...current, candidateId]));
  }

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch(`/api/firms/${id}/usp`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chosenPrimaryUspId: primary || null,
        chosenSupportingUspIds: supporting,
        blockedUspIds: blocked
      })
    });

    const payload = (await response.json()) as { firm?: Firm; error?: string; details?: string[] };
    if (!response.ok) {
      setError(payload.error ?? payload.details?.join(", ") ?? "Failed to save USP selection");
      return;
    }

    setSuccess("Saved USP selection.");
    if (payload.firm) setFirm(payload.firm);
    await load();
  }

  return (
    <div className="grid gap-6">
      <Card className="fade-up">
        <CardHeader>USP selection for {firm?.name || "Firm"}</CardHeader>
        <CardContent>
          {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
          {success && <p className="mb-2 text-sm text-emerald-700">{success}</p>}

          {!firm?.firmProfile && <p className="text-sm text-slate-600">Run crawl and generate a profile first.</p>}

          {firm?.firmProfile && (
            <form onSubmit={(event) => void save(event)} className="space-y-4">
              <Label>Practice area for ranking</Label>
              <Input value={practiceArea} onChange={(event) => setPracticeArea(event.target.value)} />

              {ranked.map((item) => (
                <div key={item.uspId} className="rounded border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{item.claim}</div>
                      <div className="text-xs text-slate-500">
                        score {item.score} • {item.type} • verified {String(item.isVerified)} • {item.isGeneric ? "generic" : "specific"}
                      </div>
                      <div className="text-xs text-slate-500">{item.reasons.join(" • ")}</div>
                      <a href={item.source.url} target="_blank" rel="noreferrer" className="text-xs underline text-slate-500">
                        source
                      </a>
                    </div>

                    <div className="flex gap-4">
                      <Label>
                        <input
                          type="radio"
                          name="primary"
                          disabled={!item.isVerified}
                          checked={primary === item.uspId}
                          onChange={() => setPrimary(item.uspId)}
                        />{" "}
                        Primary
                      </Label>
                      <Label>
                        <input
                          type="checkbox"
                          checked={isSupporting(item.uspId)}
                          onChange={() => toggleSupport(item.uspId)}
                          disabled={primary === item.uspId || !item.isVerified}
                        />
                        Support
                      </Label>
                      <Label>
                        <input
                          type="checkbox"
                          checked={blocked.includes(item.uspId)}
                          onChange={() => toggleBlocked(item.uspId)}
                        />
                        Block
                      </Label>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="submit">Save USP Selection</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
