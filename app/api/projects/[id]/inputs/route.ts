import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProject, setProjectInputs } from "@/lib/storage";
import { projectInputsUpdateSchema } from "@/lib/contracts";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const body = await request.json().catch(() => null);

  const parsed = projectInputsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const project = await getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const inputs = {
    consultationOffer: parsed.data.consultationOffer,
    callbackCommitment: parsed.data.callbackCommitment,
    phone: parsed.data.phone,
    reviewRating: parsed.data.reviewRating ?? project.inputs.reviewRating,
    reviewCount: parsed.data.reviewCount ?? project.inputs.reviewCount,
    yearsExperience: parsed.data.yearsExperience ?? project.inputs.yearsExperience,
    awards: parsed.data.awards,
    memberships: parsed.data.memberships,
    attorneyBios: parsed.data.attorneyBios
  };

  const keywordReport = parsed.data.keywordCsvText
    ? {
        text: parsed.data.keywordCsvText,
        fileName: parsed.data.keywordFileName ?? "keyword-report.csv",
        uploadedAt: new Date().toISOString()
      }
    : project.keywordReport;

  const updated = await setProjectInputs(params.id, inputs, keywordReport);
  return NextResponse.json({ project: updated }, { status: 200 });
}
