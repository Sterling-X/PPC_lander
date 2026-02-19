"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, Td, Th, Tr } from "@/components/ui/table";

type AdsPack = {
  structuralAnalysis: Record<string, unknown>;
  adGroups: Array<{
    name: string;
    rsa: {
      headlines: Array<{ text: string; charCount: number; pin?: string | null }>;
      descriptions: Array<{ text: string; charCount: number }>;
      path1: string;
      path2: string;
    };
    extensions: {
      sitelinks: Array<{ title: string; desc1: string; desc2: string; finalUrl: string }>;
      callouts: Array<{ text: string }>;
      structuredSnippets: Array<{ header: string; values: string[] }>;
    };
    serpVariants: Array<{ title: string; description: string }>;
  }>;
  launchChecklist: string[];
};

export default function AdsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [pack, setPack] = useState<AdsPack | null>(null);
  const [violations, setViolations] = useState<string[]>([]);

  const load = useCallback(async (): Promise<void> => {
    const response = await fetch(`/api/projects/${id}/ads`);
    const payload = (await response.json()) as { pack?: AdsPack };
    if (payload.pack) setPack(payload.pack);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate(autoFix = false): Promise<void> {
    const response = await fetch(`/api/projects/${id}/ads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoFix })
    });
    const payload = (await response.json()) as { project?: { artifacts?: { adsPack?: AdsPack } }; violations?: string[]; error?: string };

    if (response.ok) {
      if (payload.violations) {
        setViolations(payload.violations);
      }
      if (payload.project?.artifacts?.adsPack) {
        setPack(payload.project.artifacts.adsPack);
      }
      if (!payload.violations || payload.violations.length === 0) {
        setViolations([]);
      }
      return;
    }

    setViolations([payload.error ?? "Failed to generate ads"]);
  }

  return (
    <div className="grid gap-6">
      <Card className="fade-up">
        <CardHeader>Google Ads</CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={() => void generate(false)}>Generate ads</Button>
            <Button variant="outline" onClick={() => void generate(true)}>
              Generate + auto-fix
            </Button>
          </div>

          {violations.length > 0 && (
            <div className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold">Violations</p>
              {violations.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          )}

          {!pack && <p className="mt-2 text-sm text-slate-600">No ads generated yet.</p>}
          {pack &&
            pack.adGroups.map((group) => (
              <div key={group.name} className="mt-4 rounded-md border border-slate-200 p-3">
                <h3 className="font-semibold">{group.name}</h3>
                <div className="mt-2 text-sm">
                  <p className={group.rsa.path1.length > 15 || group.rsa.path2.length > 15 ? "text-amber-700" : "text-slate-600"}>
                    Path: /{group.rsa.path1}/{group.rsa.path2}
                  </p>
                </div>
                <h4 className="mt-2 font-medium">Headlines</h4>
                <DataTable className="mt-1">
                  <thead>
                    <Tr>
                      <Th>Text</Th>
                      <Th>Pin</Th>
                      <Th>Characters</Th>
                    </Tr>
                  </thead>
                  <tbody>
                    {group.rsa.headlines.map((headline, index) => (
                      <Tr key={`${headline.text}-${index}`}>
                        <Td>{headline.text}</Td>
                        <Td>{headline.pin ?? ""}</Td>
                        <Td className={headline.charCount > 30 ? "text-amber-700" : ""}>{headline.charCount}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>
                <h4 className="mt-2 font-medium">Descriptions</h4>
                <DataTable className="mt-1">
                  <thead>
                    <Tr>
                      <Th>Text</Th>
                      <Th>Characters</Th>
                    </Tr>
                  </thead>
                  <tbody>
                    {group.rsa.descriptions.map((desc, index) => (
                      <Tr key={`${desc.text}-${index}`}>
                        <Td>{desc.text}</Td>
                        <Td className={desc.charCount > 90 ? "text-amber-700" : ""}>{desc.charCount}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>

                <h4 className="mt-2 font-medium">Sitelinks</h4>
                <DataTable className="mt-1">
                  <thead>
                    <Tr>
                      <Th>Title</Th>
                      <Th>Description 1</Th>
                      <Th>Description 2</Th>
                      <Th>Final URL</Th>
                    </Tr>
                  </thead>
                  <tbody>
                    {group.extensions.sitelinks.map((s, index) => (
                      <Tr key={`${s.title}-${index}`}>
                        <Td className={s.title.length > 25 ? "text-amber-700" : ""}>{s.title}</Td>
                        <Td className={s.desc1.length > 35 ? "text-amber-700" : ""}>{s.desc1}</Td>
                        <Td className={s.desc2.length > 35 ? "text-amber-700" : ""}>{s.desc2}</Td>
                        <Td>{s.finalUrl}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>

                <h4 className="mt-2 font-medium">Callouts</h4>
                <DataTable className="mt-1">
                  <thead>
                    <Tr>
                      <Th>Text</Th>
                    </Tr>
                  </thead>
                  <tbody>
                    {group.extensions.callouts.map((callout, index) => (
                      <Tr key={`${callout.text}-${index}`}>
                        <Td className={callout.text.length > 25 ? "text-amber-700" : ""}>{callout.text}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>

                <h4 className="mt-2 font-medium">Structured Snippets</h4>
                <DataTable className="mt-1">
                  <thead>
                    <Tr>
                      <Th>Header</Th>
                      <Th>Values</Th>
                    </Tr>
                  </thead>
                  <tbody>
                    {group.extensions.structuredSnippets.map((snippet, index) => (
                      <Tr key={`${snippet.header}-${index}`}>
                        <Td>{snippet.header}</Td>
                        <Td>{snippet.values.join(" | ")}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>

                <h4 className="mt-2 font-medium">SERP Variants</h4>
                <DataTable className="mt-1">
                  <thead>
                    <Tr>
                      <Th>Title</Th>
                      <Th>Description</Th>
                    </Tr>
                  </thead>
                  <tbody>
                    {group.serpVariants.map((variant, index) => (
                      <Tr key={`${variant.title}-${index}`}>
                        <Td>{variant.title}</Td>
                        <Td>{variant.description}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            ))}

          {pack && (
            <div className="mt-4">
              <h3 className="font-semibold">Launch checklist</h3>
              <ul className="list-disc pl-5 text-sm">
                {pack.launchChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
