"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type ClaimSource = { url: string; snippet: string };

type FirmProfile = {
  brandVoice?: Record<string, unknown>;
  trustSignals: {
    reviews: { rating: number | null; count: number | null; sources: ClaimSource[] };
    awards: Array<{ claim: string; source: ClaimSource }>;
    memberships: Array<{ claim: string; source: ClaimSource }>;
  };
  attorneys: Array<{ name: string; credentialLines: string[]; sources: ClaimSource[] }>;
  processStatements: Array<{ claim: string; source: ClaimSource }>;
  differentiators: Array<{ id: string; claim: string; type: string; isGeneric: boolean; isVerified: boolean; source: ClaimSource }>;
  doNotSay: Array<{ rule: string; source: ClaimSource }>;
};

type Firm = {
  id: string;
  name?: string;
  domain: string;
  firmProfile?: FirmProfile;
  firmProfileUpdatedAt?: string;
};

export default function FirmProfilePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [firm, setFirm] = useState<Firm | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const response = await fetch(`/api/firms/${id}`);
    const payload = (await response.json()) as { firm: Firm };
    if (response.ok) setFirm(payload.firm);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="grid gap-6">
      <Card className="fade-up">
        <CardHeader>Firm Profile: {firm?.name || "Pending"}</CardHeader>
        <CardContent>
          {!firm?.firmProfile && <p className="text-sm text-slate-600">Run crawl first to extract a profile.</p>}

          {!firm?.firmProfile ? null : (
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold">Trust Signals</h3>
                <p>Reviews: {firm.firmProfile.trustSignals.reviews.rating ?? "n/a"} ({firm.firmProfile.trustSignals.reviews.count ?? 0})</p>
                <div>
                  {firm.firmProfile.trustSignals.awards.map((item, index) => (
                    <div key={`award-${index}`} className="rounded border border-slate-200 p-2 text-slate-700">
                      <div>{item.claim}</div>
                      <a className="text-xs text-slate-500 underline" href={item.source.url} target="_blank" rel="noreferrer">
                        {item.source.url}
                      </a>
                      <div className="text-xs text-slate-500">{item.source.snippet}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Differentiators</h3>
                <div className="space-y-2">
                  {firm.firmProfile.differentiators.map((item) => (
                    <div key={item.id} className="rounded border border-slate-200 p-2">
                      <div className="font-medium">{item.claim}</div>
                      <p className="text-xs text-slate-500">
                        type: {item.type} • verified: {String(item.isVerified)} • generic: {String(item.isGeneric)}
                      </p>
                      <a className="text-xs text-slate-500 underline" href={item.source.url} target="_blank" rel="noreferrer">
                        {item.source.url}
                      </a>
                      <div className="text-xs text-slate-500">{item.source.snippet}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Do not say</h3>
                <ul className="list-disc pl-4">
                  {firm.firmProfile.doNotSay.map((item, index) => (
                    <li key={index}>
                      {item.rule}
                      <a className="ml-2 text-xs text-slate-500 underline" href={item.source.url} target="_blank" rel="noreferrer">
                        source
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
