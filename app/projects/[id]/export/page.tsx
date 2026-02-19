"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

type ExportPayload = {
  markdown: string;
  csv: {
    landing: string;
    landingKeyword: string;
    adsHeadlines: string;
    adsDescriptions: string;
    adsSitelinks: string;
    adsCallouts: string;
    adsSnippets: string;
    ads: string;
    adsBundle?: string;
  };
};

export default function ExportPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [payload, setPayload] = useState<ExportPayload | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const response = await fetch(`/api/projects/${id}/export`);
    const data = (await response.json()) as ExportPayload | { error: string };
    if (response.ok) {
      setPayload(data as ExportPayload);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function download(name: string, content: string): void {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6">
      <Card className="fade-up">
        <CardHeader>Export</CardHeader>
        <CardContent>
          {!payload && <p className="text-sm text-slate-600">Generate landing page and ads first.</p>}
          {payload && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={() => download("landing-page.md", payload.markdown)}>Download Markdown</Button>
                <Button variant="outline" onClick={() => download("landing-sections.csv", payload.csv.landing)}>
                  Download Landing CSVs
                </Button>
                <Button variant="outline" onClick={() => download("landing-keyword-map.csv", payload.csv.landingKeyword)}>
                  Download Keyword Map CSV
                </Button>
                <Button variant="outline" onClick={() => download("google-ads-rsa-headlines.csv", payload.csv.adsHeadlines)}>
                  Download RSA Headlines
                </Button>
                <Button variant="outline" onClick={() => download("google-ads-rsa-descriptions.csv", payload.csv.adsDescriptions)}>
                  Download RSA Descriptions
                </Button>
                <Button variant="outline" onClick={() => download("google-ads-sitelinks.csv", payload.csv.adsSitelinks)}>
                  Download Sitelinks
                </Button>
                <Button variant="outline" onClick={() => download("google-ads-callouts.csv", payload.csv.adsCallouts)}>
                  Download Callouts
                </Button>
                <Button variant="outline" onClick={() => download("google-ads-structured-snippets.csv", payload.csv.adsSnippets)}>
                  Download Structured Snippets
                </Button>
                <Button variant="outline" onClick={() => download("google-ads-bundle.csv", payload.csv.adsBundle ?? payload.csv.ads)}>
                  Download Ads CSVs
                </Button>
              </div>
              <pre className="mt-2 max-h-[450px] overflow-auto rounded-md border border-slate-200 bg-white p-2 text-xs">{payload.markdown.slice(0, 1600)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
