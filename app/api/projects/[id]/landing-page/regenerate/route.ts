import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirm, getProject, setProjectLandingPack } from "@/lib/storage";
import { regenerateLandingSection } from "@/lib/openai";
import { getSelectedUsps } from "@/lib/usp";

const paramsSchema = z.object({ id: z.string().min(1) });
const sectionSchema = z.enum(["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"]);
const bodySchema = z.object({
  section: sectionSchema,
  sectionData: z.record(z.unknown()).optional()
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const project = await getProject(params.id);
  if (!project?.artifacts.landingPagePack || !project.keywordReport) {
    return NextResponse.json({ error: "Landing page not yet generated" }, { status: 409 });
  }

  const firm = await getFirm(project.firmId);
  if (!firm?.firmProfile) {
    return NextResponse.json({ error: "Firm profile missing" }, { status: 409 });
  }
  const selected = getSelectedUsps(firm.firmProfile, firm.uspSelection);
  if (!selected.primary && selected.support.length === 0) {
    return NextResponse.json({ error: "No verified USP selected for this firm." }, { status: 409 });
  }

  try {
    const pack = await regenerateLandingSection(
      project,
      parsed.data.section,
      firm.firmProfile,
      project.keywordReport,
      selected,
      project.artifacts.landingPagePack,
      parsed.data.sectionData
    );

    const updated = await setProjectLandingPack(params.id, pack);
    return NextResponse.json({ project: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Section regeneration failed" }, { status: 422 });
  }
}
