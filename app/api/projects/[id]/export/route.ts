import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProject } from "@/lib/storage";
import { exportLandingMarkdown } from "@/lib/utils";
import {
  exportLandingCsv,
  exportLandingCsvWithMap,
  exportRsaHeadlinesCsv,
  exportRsaDescriptionsCsv,
  exportSitelinksCsv,
  exportCalloutsCsv,
  exportStructuredSnippetsCsv,
  exportAdsCsv
} from "@/lib/export";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = paramsSchema.parse(await context.params);
  const project = await getProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const landing = project.artifacts.landingPagePack;
  const ads = project.artifacts.adsPack;

  if (!landing || !ads) {
    return NextResponse.json({ error: "Both landing and ads artifacts are required" }, { status: 409 });
  }

  const markdown = exportLandingMarkdown(landing.landingPage.titleTag, landing.landingPage.metaDescription, landing.landingPage.sections);
  const landingCsv = exportLandingCsv(landing, "landing-page");
  const landingKeywordCsv = exportLandingCsvWithMap(landing);
  const adsHeadlinesCsv = exportRsaHeadlinesCsv(ads);
  const adsDescriptionsCsv = exportRsaDescriptionsCsv(ads);
  const adsSitelinksCsv = exportSitelinksCsv(ads);
  const adsCalloutsCsv = exportCalloutsCsv(ads);
  const adsSnippetsCsv = exportStructuredSnippetsCsv(ads);
  const adsCsv = exportAdsCsv(ads);

  return NextResponse.json(
    {
      markdown,
      csv: {
        landing: landingCsv,
        landingKeyword: landingKeywordCsv,
        adsHeadlines: adsHeadlinesCsv,
        adsDescriptions: adsDescriptionsCsv,
        adsSitelinks: adsSitelinksCsv,
        adsCallouts: adsCalloutsCsv,
        adsSnippets: adsSnippetsCsv,
        ads: adsCsv,
        adsBundle: adsCsv
      }
    },
    { status: 200 }
  );
}
