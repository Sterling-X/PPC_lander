"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const sectionOrder = ["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"] as const;

type LandingPack = {
  keywordToPageMap: Array<{ keywordTheme: string; primaryKeywords: string[]; landingPageSection: string; naturalMessageMatchPhrasing: string }>;
  frameworkCompliance: Array<{ section: string; requirement: string; actual: string; pass: boolean }>;
  landingPage: {
    titleTag: string;
    metaDescription: string;
    sections: {
      hero: { headline: string; subhead?: string; bullets: string[]; body: string };
      problem: { headline: string; subhead?: string; bullets: string[]; body: string };
      types: { headline: string; subhead?: string; bullets: string[]; body: string };
      guide: { headline: string; subhead?: string; bullets: string[]; body: string };
      plan: { headline: string; subhead?: string; bullets: string[]; body: string };
      proof: { headline: string; subhead?: string; bullets: string[]; body: string };
      objections: { headline: string; subhead?: string; bullets: string[]; body: string };
      close: { headline: string; subhead?: string; bullets: string[]; body: string };
      microFaqs: Array<{ q: string; a: string }>;
    };
  };
};

type Project = {
  artifacts: { landingPagePack?: LandingPack };
};

type SectionForm = {
  headline: string;
  subhead: string;
  bullets: string;
  body: string;
};

type EditMode = "idle" | "busy" | "saving";

const toLines = (value: string[]): string => value.join("\n");
const fromLines = (value: string): string[] => value.split("\n").map((item) => item.trim()).filter(Boolean);

function toSectionInput(section: { headline: string; subhead?: string; bullets: string[]; body: string }): SectionForm {
  return { headline: section.headline, subhead: section.subhead ?? "", bullets: toLines(section.bullets), body: section.body };
}

function withSectionInput(section: SectionForm): { headline: string; subhead?: string; bullets: string[]; body: string } {
  return {
    headline: section.headline,
    subhead: section.subhead,
    bullets: fromLines(section.bullets),
    body: section.body
  };
}

export default function ProjectLandingPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [pack, setPack] = useState<LandingPack | null>(null);
  const [sections, setSections] = useState<Record<string, SectionForm>>({});
  const [faqs, setFaqs] = useState<Array<{ q: string; a: string }>>([]);
  const [mode, setMode] = useState<EditMode>("idle");
  const [statusText, setStatusText] = useState("");

  const load = useCallback(async (): Promise<void> => {
    const response = await fetch(`/api/projects/${id}`);
    const payload = (await response.json()) as { project: Project };
    if (!response.ok) return;

    const loaded = payload.project;
    setProject(loaded);
    const nextPack = loaded.artifacts.landingPagePack;
    if (!nextPack) return;

    setPack(nextPack);
    const sectionForm: Record<string, SectionForm> = {};
    for (const section of sectionOrder) {
      sectionForm[section] = toSectionInput(nextPack.landingPage.sections[section]);
    }
    setSections(sectionForm);
    setFaqs([...nextPack.landingPage.sections.microFaqs].slice(0, 4));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function syncSection(section: string, field: keyof SectionForm, value: string): void {
    setSections((current) => ({
      ...current,
      [section]: { ...(current[section] ?? { headline: "", subhead: "", bullets: "", body: "" }), [field]: value }
    }));
  }

  function syncFaq(index: number, field: "q" | "a", value: string): void {
    const next = [...faqs];
    if (!next[index]) return;
    next[index] = { ...next[index], [field]: value };
    setFaqs(next);
  }

  function currentPackWithEdits(): LandingPack | null {
    if (!pack) return null;
    const next = structuredClone(pack);
    for (const section of sectionOrder) {
      const form = sections[section];
      if (!form) continue;
      next.landingPage.sections[section] = withSectionInput(form);
    }
    next.landingPage.sections.microFaqs = faqs.slice(0, 4);
    return next;
  }

  async function generate(): Promise<void> {
    setMode("busy");
    const response = await fetch(`/api/projects/${id}/landing-page`, { method: "POST" });
    const payload = await response.json();
    setMode("idle");
    if (!response.ok) {
      const missing = (payload as { missingFields?: string[] }).missingFields;
      if (missing?.length) {
        setStatusText(`Missing required fields: ${missing.join(", ")}`);
      } else {
        setStatusText((payload as { error?: string }).error ?? "Could not generate landing page.");
      }
      return;
    }
    await load();
    setStatusText(payload.violations?.join("; ") ?? "Landing page generated.");
  }

  async function save(): Promise<void> {
    const edited = currentPackWithEdits();
    if (!edited) return;
    setMode("saving");
    const response = await fetch(`/api/projects/${id}/landing-page`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edited)
    });
    const payload = await response.json();
    setMode("idle");
    if (!response.ok) {
      setStatusText(payload.error ?? "Failed to save landing page.");
      return;
    }
    await load();
    setStatusText("Landing page changes saved.");
  }

  async function regenerateSection(section: string): Promise<void> {
    const edited = currentPackWithEdits();
    if (!edited) return;
    setMode("busy");
    const response = await fetch(`/api/projects/${id}/landing-page/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, sectionData: edited.landingPage.sections[section] })
    });
    const payload = await response.json();
    setMode("idle");
    if (!response.ok) {
      setStatusText(payload.error ?? "Section regeneration failed.");
      return;
    }
    await load();
    setStatusText(`Section "${section}" regenerated.`);
  }

  if (!project || !pack) {
    return (
      <Card className="fade-up">
        <CardHeader>Landing Page</CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">No landing page generated yet.</p>
          <Button onClick={() => void generate()} disabled={mode === "busy"} className="mt-2">
            {mode === "busy" ? "Generating..." : "Generate Landing Page"}
          </Button>
          {statusText && <p className="mt-2 text-sm text-slate-700">{statusText}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="fade-up">
        <CardHeader>Landing Page</CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Title tag</Label>
            <Textarea value={pack.landingPage.titleTag} readOnly rows={2} />
            <Label>Meta description</Label>
            <Textarea value={pack.landingPage.metaDescription} readOnly rows={2} />
          </div>

          <div className="mt-2">
            <Button onClick={() => void save()} disabled={mode === "saving"}>
              {mode === "saving" ? "Saving..." : "Save edits"}
            </Button>
          </div>

          {sectionOrder.map((sectionName) => {
            const form = sections[sectionName];
            if (!form) return null;
            return (
              <div key={sectionName} className="mt-4 rounded-md border border-slate-200 p-3">
                <h3 className="mb-2 font-semibold">{sectionName}</h3>
                <Label>Headline</Label>
                <Textarea value={form.headline} onChange={(event) => syncSection(sectionName, "headline", event.target.value)} rows={2} />
                <Label>Subhead</Label>
                <Textarea value={form.subhead} onChange={(event) => syncSection(sectionName, "subhead", event.target.value)} rows={2} />
                <Label>Bullets</Label>
                <Textarea value={form.bullets} onChange={(event) => syncSection(sectionName, "bullets", event.target.value)} rows={4} />
                <Label>Body</Label>
                <Textarea value={form.body} onChange={(event) => syncSection(sectionName, "body", event.target.value)} rows={5} />
                <Button type="button" className="mt-2" onClick={() => void regenerateSection(sectionName)}>
                  Regenerate this section
                </Button>
              </div>
            );
          })}

          <div className="mt-4">
            <h3 className="font-semibold">Micro FAQs</h3>
            <p className="text-xs text-slate-500">At most 4 FAQs.</p>
            {faqs.map((faq, index) => (
              <div key={`${faq.q}-${index}`} className="mt-2">
                <Label>Q {index + 1}</Label>
                <Textarea value={faq.q} onChange={(event) => syncFaq(index, "q", event.target.value)} rows={2} />
                <Label>A {index + 1}</Label>
                <Textarea value={faq.a} onChange={(event) => syncFaq(index, "a", event.target.value)} rows={2} />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h3 className="font-semibold">Framework compliance</h3>
            {pack.frameworkCompliance.map((row) => (
              <div key={`${row.section}-${row.requirement}`} className="text-sm">
                <span className="mr-2">{row.pass ? <Badge>pass</Badge> : <Badge tone="error">fail</Badge>}</span>
                <span className="font-medium">{row.section}</span>: {row.actual}
              </div>
            ))}
          </div>

          {statusText && <p className="mt-2 text-sm text-slate-700">{statusText}</p>}

          <div className="mt-2">
            <Button variant="outline" onClick={() => void generate()} disabled={mode === "busy"}>
              {mode === "busy" ? "Working..." : "Regenerate full landing page"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
