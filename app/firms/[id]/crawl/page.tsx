"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Firm = {
  id: string;
  domain: string;
  crawlConfig: {
    maxPages: number;
    maxDepth: number;
    includePaths: string[];
    excludePaths: string[];
  };
  crawledPages: Array<{ url: string; title: string; fetchedAt: string }>;
  crawlErrors?: string[];
};

export default function FirmCrawlPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [firm, setFirm] = useState<Firm | null>(null);
  const [practiceArea, setPracticeArea] = useState("Family Law");
  const [manualUrls, setManualUrls] = useState("");
  const [maxPages, setMaxPages] = useState(30);
  const [maxDepth, setMaxDepth] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const load = useCallback(async (): Promise<void> => {
    const response = await fetch(`/api/firms/${id}`);
    const payload = (await response.json()) as { firm: Firm };
    if (!response.ok) return;
    setFirm(payload.firm);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const response = await fetch(`/api/firms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crawlConfig: {
          ...(firm?.crawlConfig ?? {}),
          maxPages,
          maxDepth
        }
      })
    });

    if (response.ok) {
      await load();
    }
  }

  async function runCrawl(): Promise<void> {
    setIsLoading(true);
    setErrors([]);

    const manualUrlList = manualUrls
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const response = await fetch(`/api/firms/${id}/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practiceArea, manualUrls: manualUrlList })
    });

    const payload = (await response.json()) as { error?: string; crawlErrors?: string[]; firm?: Firm };
    if (!response.ok) {
      setErrors(payload.crawlErrors ?? [payload.error ?? "Crawl failed"]);
      setIsLoading(false);
      return;
    }

    await load();
    setIsLoading(false);
    router.push(`/firms/${id}/profile`);
  }

  return (
    <div className="grid gap-6">
      <Card className="fade-up">
        <CardHeader>Crawl {firm?.domain}</CardHeader>
        <CardContent>
          <form onSubmit={(event) => void saveConfig(event)} className="grid gap-3 md:grid-cols-3">
            <div>
              <Label htmlFor="practice">Practice area</Label>
              <Input id="practice" value={practiceArea} onChange={(event) => setPracticeArea(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="pages">Max pages</Label>
              <Input
                id="pages"
                type="number"
                value={maxPages}
                onChange={(event) => setMaxPages(Number(event.target.value) || 30)}
              />
            </div>
            <div>
              <Label htmlFor="depth">Max depth</Label>
              <Input
                id="depth"
                type="number"
                value={maxDepth}
                onChange={(event) => setMaxDepth(Number(event.target.value) || 2)}
              />
            </div>

            <div className="md:col-span-3">
              <Button type="submit">Save crawl config</Button>
            </div>

            <div className="md:col-span-3">
              <Label htmlFor="manualUrls">Manual URLs (one per line)</Label>
              <Textarea
                id="manualUrls"
                rows={4}
                value={manualUrls}
                onChange={(event) => setManualUrls(event.target.value)}
                placeholder="https://example.com/about\nhttps://example.com/reviews"
              />
              <p className="mt-1 text-xs text-slate-500">
                If crawl is blocked, add specific high-signal URLs here and re-run.
              </p>
            </div>
          </form>

          <div className="mt-4">
            <Button onClick={() => void runCrawl()} disabled={isLoading}>
              {isLoading ? "Running crawl..." : "Run crawl"}
            </Button>
          </div>

          {errors.length > 0 && (
            <div className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700">
              {errors.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <h3 className="text-sm font-semibold">Fetched pages</h3>
            <div className="mt-2 space-y-2">
              {firm?.crawledPages?.map((page) => (
                <div key={page.url} className="rounded-md border border-slate-200 p-2 text-sm">
                  <div className="font-medium">{page.title}</div>
                  <a href={page.url} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">
                    {page.url}
                  </a>
                  <div className="text-xs text-slate-400">{new Date(page.fetchedAt).toLocaleString()}</div>
                </div>
              ))}
              {(!firm || firm.crawledPages.length === 0) && <p className="text-sm text-slate-500">No pages fetched yet.</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
