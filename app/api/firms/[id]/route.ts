import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirm, updateFirm } from "@/lib/storage";
import { crawlConfigSchema } from "@/lib/contracts";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ crawlConfig: crawlConfigSchema.optional() });

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const firm = await getFirm(params.id);
  if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  return NextResponse.json({ firm }, { status: 200 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const firm = await updateFirm(params.id, parsed.data);
    return NextResponse.json({ firm }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unable to update firm" }, { status: 404 });
  }
}
