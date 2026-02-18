import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirm, getProject, setProjectLandingPack } from "@/lib/storage";
import { generateLandingPageFromInputs } from "@/lib/openai";
import { getSelectedUsps } from "@/lib/usp";
import { landingSchema } from "@/lib/contracts";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const project = await getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!project.keywordReport) {
    return NextResponse.json({ error: "Upload keyword report first." }, { status: 409 });
  }

  const firm = await getFirm(project.firmId);
  if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  if (!firm.firmProfile) return NextResponse.json({ error: "Firm profile missing" }, { status: 409 });
  const selected = getSelectedUsps(firm.firmProfile, firm.uspSelection);
  if (!selected.primary && selected.support.length === 0) {
    return NextResponse.json({ error: "Select a verified primary USP before generation." }, { status: 409 });
  }

  const missingInputs = ["consultationOffer", "callbackCommitment", "phone"].filter((field) => {
    const value = (project.inputs as Record<string, unknown>)[field];
    return typeof value !== "string" || value.trim().length < 1;
  });

  if (missingInputs.length > 0) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        missingFields: missingInputs
      },
      { status: 409 }
    );
  }

  try {
    const result = await generateLandingPageFromInputs(project, firm.firmProfile, selected, project.keywordReport);
    const updated = await setProjectLandingPack(params.id, result.pack);
    return NextResponse.json({ project: updated, violations: result.violations }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Landing generation failed" }, { status: 422 });
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const project = await getProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({ pack: project.artifacts.landingPagePack ?? null }, { status: 200 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const body = await request.json().catch(() => null);
  const parsed = landingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updated = await setProjectLandingPack(params.id, parsed.data);

  return NextResponse.json({ project: updated }, { status: 200 });
}
