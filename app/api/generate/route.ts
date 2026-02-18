import { NextRequest, NextResponse } from "next/server";
import { generateInstructionMarkdown } from "@/lib/generator";
import { GeneratorInput } from "@/lib/types";
import { validateGeneratorInput } from "@/lib/validators";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const validation = validateGeneratorInput(payload);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed.", details: validation.errors },
      { status: 400 }
    );
  }

  const markdown = generateInstructionMarkdown(payload as GeneratorInput);

  return NextResponse.json({ markdown }, { status: 200 });
}
