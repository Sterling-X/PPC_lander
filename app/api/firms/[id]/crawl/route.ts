import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirm, updateFirm, setFirmProfile, promoteFirmProjectsToStatus } from "@/lib/storage";
import { buildCrawlBlockedSuggestions, crawlFirmPages } from "@/lib/crawl";
import { profileFromCrawledPages } from "@/lib/openai";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const body = await request.json().catch(() => ({}));
  const practiceArea = typeof body.practiceArea === "string" && body.practiceArea.trim().length > 0 ? body.practiceArea.trim() : "Family Law";
  const manualUrls = Array.isArray(body.manualUrls) ? body.manualUrls : [];
  const normalizedManual = manualUrls
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);

  const firm = await getFirm(params.id);
  if (!firm) {
    return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  }

  try {
    const pages = await crawlFirmPages(firm, practiceArea, { manualUrls: normalizedManual });
    let profile = firm.firmProfile;

    try {
      profile = await profileFromCrawledPages(firm.domain, pages);
      if (!profile) {
        throw new Error("Empty profile from extractor");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to build profile from crawl.";
      const crawlErrors = buildCrawlBlockedSuggestions(message);
      await updateFirm(params.id, {
        crawledPages: pages,
        crawlErrors,
        firmProfile: firm.firmProfile
      });

      return NextResponse.json(
        {
          error: message,
          crawlErrors,
          firm: {
            ...firm,
            crawledPages: pages,
            crawlErrors
          }
        },
        { status: 422 }
      );
    }

    const crawlErrors = pages.length ? [] : buildCrawlBlockedSuggestions("No pages discovered.");
    const updated = await setFirmProfile(params.id, { firmProfile: profile, crawledPages: pages, crawlErrors });
    await promoteFirmProjectsToStatus(params.id, "crawl-complete");

    return NextResponse.json({ firm: updated }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown crawl error";
    const crawlErrors = buildCrawlBlockedSuggestions(message);
    await updateFirm(params.id, { crawlErrors });
    return NextResponse.json({ error: message, crawlErrors }, { status: 422 });
  }
}
