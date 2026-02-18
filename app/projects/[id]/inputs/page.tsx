"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

type Project = {
  id: string;
  inputs: Record<string, unknown>;
  keywordReport?: { text: string; fileName?: string };
};

export default function ProjectInputsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);

  const [consultationOffer, setConsultationOffer] = useState("");
  const [callbackCommitment, setCallbackCommitment] = useState("");
  const [phone, setPhone] = useState("");
  const [awards, setAwards] = useState("");
  const [memberships, setMemberships] = useState("");
  const [attorneyBios, setAttorneyBios] = useState("");
  const [rating, setRating] = useState("");
  const [count, setCount] = useState("");
  const [years, setYears] = useState("");
  const [keywordCsvText, setKeywordCsvText] = useState("");
  const [keywordFileName, setKeywordFileName] = useState("");
  const [status, setStatus] = useState("");
  const [fileNameFromUpload, setFileNameFromUpload] = useState("");

  async function load(): Promise<void> {
    const response = await fetch(`/api/projects/${id}`);
    const payload = (await response.json()) as { project: Project };
    if (!response.ok) return;
    const project = payload.project;
    setProject(project);

    if (project.inputs) {
      setConsultationOffer((project.inputs as Record<string, string>).consultationOffer ?? "");
      setCallbackCommitment((project.inputs as Record<string, string>).callbackCommitment ?? "");
      setPhone((project.inputs as Record<string, string>).phone ?? "");
      setAwards((project.inputs as Record<string, string>).awards ?? "");
      setMemberships((project.inputs as Record<string, string>).memberships ?? "");
      setAttorneyBios((project.inputs as Record<string, string>).attorneyBios ?? "");
      setRating(String((project.inputs as Record<string, unknown>).reviewRating ?? ""));
      setCount(String((project.inputs as Record<string, unknown>).reviewCount ?? ""));
      setYears(String((project.inputs as Record<string, unknown>).yearsExperience ?? ""));
    }
    if (project.keywordReport) {
      setKeywordCsvText(project.keywordReport.text);
      setKeywordFileName(project.keywordReport.fileName ?? "");
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const response = await fetch(`/api/projects/${id}/inputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consultationOffer,
        callbackCommitment,
        phone,
        awards,
        memberships,
        attorneyBios,
        reviewRating: Number(rating) || null,
        reviewCount: Number(count) || null,
        yearsExperience: Number(years) || null,
        keywordCsvText,
        keywordFileName
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      setStatus((payload as { error?: string }).error ?? "Submit failed");
      return;
    }

    setStatus("Inputs saved.");
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileNameFromUpload(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setKeywordCsvText(text);
      setKeywordFileName(file.name);
    };
    reader.readAsText(file);
  }

  return (
    <div className="grid gap-6">
      <Card className="fade-up">
        <CardHeader>Project Inputs</CardHeader>
        <CardContent>
          <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
            <div>
              <Label htmlFor="consultationOffer">Consultation offer</Label>
              <Input id="consultationOffer" value={consultationOffer} onChange={(event) => setConsultationOffer(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="callbackCommitment">Callback commitment</Label>
              <Input id="callbackCommitment" value={callbackCommitment} onChange={(event) => setCallbackCommitment(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="awards">Awards</Label>
              <Textarea id="awards" value={awards} onChange={(event) => setAwards(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="memberships">Memberships</Label>
              <Textarea id="memberships" value={memberships} onChange={(event) => setMemberships(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="attorneyBios">Attorney bios</Label>
              <Textarea id="attorneyBios" value={attorneyBios} onChange={(event) => setAttorneyBios(event.target.value)} />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label htmlFor="rating">Review rating</Label>
                <Input id="rating" value={rating} onChange={(event) => setRating(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="count">Review count</Label>
                <Input id="count" value={count} onChange={(event) => setCount(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="years">Years experience</Label>
                <Input id="years" value={years} onChange={(event) => setYears(event.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="keywords">Google Ads keyword CSV text</Label>
              <Textarea
                id="keywords"
                rows={8}
                value={keywordCsvText}
                onChange={(event) => setKeywordCsvText(event.target.value)}
                placeholder="Upload/ paste keyword CSV text"
              />
              <Label htmlFor="keywordFile" className="mt-2 inline-block">
                Or upload CSV
              </Label>
              <input id="keywordFile" type="file" accept=".csv,text/csv" className="block text-sm" onChange={(event) => onUpload(event)} />
              {fileNameFromUpload && <div className="text-xs text-slate-500">Loaded: {fileNameFromUpload}</div>}
            </div>

            <Button type="submit">Save project inputs</Button>
          </form>

          {status && <p className="mt-3 text-sm text-slate-700">{status}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
