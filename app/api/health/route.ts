import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "ok",
      service: "landing-page-instruction-generator",
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}
