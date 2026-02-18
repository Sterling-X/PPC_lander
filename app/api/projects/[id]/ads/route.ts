import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProject, getFirm, setProjectAdsPack } from "@/lib/storage";
import { generateAdsFromLanding, autoFixAdViolations } from "@/lib/openai";
import { getSelectedUsps } from "@/lib/usp";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const project = await getProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const existing = project.artifacts.landingPagePack;
  if (!existing || !project.keywordReport) {
    return NextResponse.json({ error: "Landing page first required" }, { status: 409 });
  }

  const firm = await getFirm(project.firmId);
  if (!firm?.firmProfile) return NextResponse.json({ error: "Firm profile required" }, { status: 409 });
  const selected = getSelectedUsps(firm.firmProfile, firm.uspSelection);
  if (!selected.primary && selected.support.length === 0) {
    return NextResponse.json({ error: "Select a verified USP before generating ads." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const autoFix = body.autoFix === true;

  try {
    const result = await generateAdsFromLanding(project, firm.firmProfile, existing, project.keywordReport, selected);
    if (!autoFix && result.violations.length > 0) {
      return NextResponse.json({ project, violations: result.violations }, { status: 200 });
    }

    const pack = autoFix ? autoFixAdViolations(result.pack) : result.pack;
    const updated = await setProjectAdsPack(params.id, pack);

    if (autoFix) {
      return NextResponse.json({ project: updated, violations: [] }, { status: 200 });
    }

    return NextResponse.json({ project: updated, violations: [] }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ads generation failed" }, { status: 422 });
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const project = await getProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({ pack: project.artifacts.adsPack ?? null }, { status: 200 });
}
