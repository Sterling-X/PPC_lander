import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProject, updateProject } from "@/lib/storage";
import { projectSchema } from "@/lib/contracts";
import { Project } from "@/lib/types";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const project = await getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ project }, { status: 200 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const body = await request.json().catch(() => null);
  const parsed = projectSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const project = await updateProject(params.id, parsed.data as Partial<Project>);
  return NextResponse.json({ project }, { status: 200 });
}
