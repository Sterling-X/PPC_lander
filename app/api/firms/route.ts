import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createFirm, listFirms, seedDemoFirmAndProject } from "@/lib/storage";
import { firmInputSchema } from "@/lib/contracts";

const seedQuerySchema = z.object({
  action: z.literal("seed").optional()
});

export async function GET(): Promise<NextResponse> {
  const firms = await listFirms();
  return NextResponse.json({ firms }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);

  if (body && body?.action === "seed") {
    const result = await seedDemoFirmAndProject();
    return NextResponse.json(result, { status: 201 });
  }

  const parsed = firmInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const firm = await createFirm({
      name: parsed.data.name,
      domain: parsed.data.domain
    });
    return NextResponse.json({ firm }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create firm" }, { status: 500 });
  }
}
