import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/storage";
import { projectCreateSchema } from "@/lib/contracts";

export async function GET(): Promise<NextResponse> {
  const projects = await listProjects();
  return NextResponse.json({ projects }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const project = await createProject(parsed.data);
  return NextResponse.json({ project }, { status: 201 });
}
