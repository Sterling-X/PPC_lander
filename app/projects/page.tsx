"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Firm = { id: string; name?: string; domain: string };
type Project = { id: string; firmId: string; practiceArea: string; state: string; geo?: string };

type ProjectStatus =
  | "draft"
  | "crawl-complete"
  | "usp-selected"
  | "keyword-uploaded"
  | "landing-generated"
  | "ads-generated";

type ProjectWithStatus = Project & { status: ProjectStatus };

export default function ProjectsPage(): JSX.Element {
  const [projects, setProjects] = useState<ProjectWithStatus[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);

  const [firmId, setFirmId] = useState("");
  const [practiceArea, setPracticeArea] = useState("");
  const [state, setState] = useState("");
  const [geo, setGeo] = useState("");
  const [error, setError] = useState("");

  async function loadFirms(): Promise<void> {
    const response = await fetch("/api/firms");
    const data = (await response.json()) as { firms: Firm[] };
    setFirms(data.firms ?? []);
  }

  async function loadProjects(): Promise<void> {
    const response = await fetch("/api/projects");
    const data = (await response.json()) as { projects: ProjectWithStatus[] };
    setProjects(data.projects ?? []);
  }

  useEffect(() => {
    void Promise.all([loadProjects(), loadFirms()]);
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");

    if (!firmId || !practiceArea || !state) {
      setError("Firm, practice area, and state are required.");
      return;
    }

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firmId, practiceArea, state, geo: geo.trim() || undefined })
    });

    const data = (await response.json()) as { project?: ProjectWithStatus; error?: string };
    if (!response.ok) {
      setError(data.error ?? "Unable to create project");
      return;
    }

    await loadProjects();
  }

  return (
    <div className="grid gap-6">
      <Card className="fade-up">
        <CardHeader>Projects</CardHeader>
        <CardContent>
          <form onSubmit={(event) => void createProject(event)} className="grid gap-3 md:grid-cols-4">
            <Label>Firm</Label>
            <select value={firmId} onChange={(event) => setFirmId(event.target.value)} className="h-10 rounded-md border border-slate-300 px-3">
              <option value="">Select firm</option>
              {firms.map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name || firm.domain}
                </option>
              ))}
            </select>
            <Input placeholder="Practice Area" value={practiceArea} onChange={(event) => setPracticeArea(event.target.value)} />
            <Input placeholder="State" value={state} onChange={(event) => setState(event.target.value)} />
            <Input placeholder="Geo (optional)" value={geo} onChange={(event) => setGeo(event.target.value)} />
            <div>
              <Button type="submit">Create Project</Button>
            </div>
          </form>

          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

          <div className="mt-4 space-y-2">
            {projects.map((project) => (
              <div key={project.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-semibold">
                  {project.practiceArea} — {project.state} {project.geo ?? ""}
                </p>
                <p className="text-sm text-slate-600">status: {project.status}</p>
                <div className="mt-2 flex gap-2 text-sm">
                  <Link href={`/projects/${project.id}/inputs`} className="underline">
                    Inputs
                  </Link>
                  <Link href={`/projects/${project.id}/landing-page`} className="underline">
                    Landing
                  </Link>
                  <Link href={`/projects/${project.id}/ads`} className="underline">
                    Ads
                  </Link>
                  <Link href={`/projects/${project.id}/export`} className="underline">
                    Export
                  </Link>
                </div>
              </div>
            ))}
            {projects.length === 0 && <p className="text-sm text-slate-600">No projects yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
