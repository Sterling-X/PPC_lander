import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirm, setFirmUspSelection, promoteFirmProjectsToStatus } from "@/lib/storage";
import { firmUspSelectionSchema } from "@/lib/contracts";
import { validateUspSelection } from "@/lib/usp";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const body = await request.json().catch(() => null);

  const parsed = firmUspSelectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const firm = await getFirm(params.id);
  if (!firm) {
    return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  }

  if (!firm.firmProfile) {
    return NextResponse.json({ error: "Firm profile required before USP selection" }, { status: 409 });
  }

  const validation = validateUspSelection(parsed.data, firm.firmProfile);
  if (!validation.ok) {
    return NextResponse.json({ error: "Invalid USP selection", details: validation.errors }, { status: 400 });
  }

  const updated = await setFirmUspSelection(params.id, parsed.data);
  await promoteFirmProjectsToStatus(params.id, "usp-selected");
  return NextResponse.json({ firm: updated }, { status: 200 });
}
