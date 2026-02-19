import { z } from "zod";
import { CrawledPage, FirmProfile, KeywordReport, LandingPagePack, Project, AdsPack, SourceRef } from "@/lib/types";
import { firmProfileSchema, landingSchema, adsSchema } from "@/lib/contracts";

const REQUIRED_LANDING_FIELDS = ["consultationOffer", "callbackCommitment", "phone"] as const;

const GLOBAL_SYSTEM = `GLOBAL RULES
- No placeholders. If required firm inputs are missing, return an error object listing missing fields.
- No legal advice. Use general informational language.
- No guarantees or "best/#1" claims.
- Use only verified USP claims from FirmProfile.uspSelection. Never invent differentiators.
- Keep output production-ready.`;

const LANDING_RULES = `LANDING PAGE RULES
- You are a PPC landing page strategist, not SEO content.
- Mandatory page flow in this exact order: Hero -> Problem -> Types -> Guide -> Plan -> Proof -> Objections -> Close.
- Include title tag and meta description and full copy section by section.
- Include keywordIntelligence and keywordToPageMap in the exact schema.
- Return frameworkCompliance table with pass/fail per section.
- Do not add long "How it works" educational sections. Put practical flow inside micro-FAQs.
- Return max 4 micro-FAQs.
- Do not recommend keywords or campaigns for other practice areas.`;

const FIRM_PROFILE_RULES = `FIRM PROFILE RULES
- Return strict JSON matching the FirmProfile schema.
- Include trustSignals, attorneys, processStatements, differentiators, and doNotSay keys even if empty.
- Every claim must include a source with url and snippet. Snippet must be a short verbatim excerpt from provided pages.
- If you cannot cite a claim from the provided pages, omit it.
- For reviews rating/count, include sources if rating/count is present.
- For attorneys, include credentialLines array (empty allowed) and sources array (with url + snippet).`;

const ADS_RULES = `ADS RULES
- You are a Google Ads copy specialist.
- Hard limits: Headline 30, Description 90, Path 1 15, Path 2 15, Sitelink title 25, sitelink description 35, Callout 25.
- Pinning: H1 must be exactly one pinned headline and it must be the keyword-match line. H2 must be exactly one pinned headline and it must be proof or a verified differentiator. All other headlines must be unpinned.
- Return structured JSON that maps cleanly into tables and include a launch checklist at the end.
- Prefer using verified USP claims for H2 and proof lines.`;

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

type SelectedUsps = {
  primary?: FirmProfile["differentiators"][number];
  support: Array<FirmProfile["differentiators"][number]>;
};

type LandingInputSection = {
  headline?: string;
  body?: string;
  subhead?: string;
  bullets?: string[];
};

const DIFFERENTIATOR_TYPES = new Set([
  "niche",
  "speed",
  "experience",
  "pricing",
  "approach",
  "availability",
  "geography",
  "other"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeUrl(value: unknown): string | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  try {
    return new URL(raw).toString();
  } catch {
    return null;
  }
}

function normalizeSourceRef(value: unknown): SourceRef | null {
  if (!isRecord(value)) return null;
  const url = normalizeUrl(value.url);
  const snippet = asTrimmedString(value.snippet);
  if (!url || !snippet) return null;
  return { url, snippet };
}

function normalizeSourceRefs(value: unknown): SourceRef[] {
  if (!Array.isArray(value)) return [];
  const normalized: SourceRef[] = [];
  for (const entry of value) {
    const source = normalizeSourceRef(entry);
    if (source) normalized.push(source);
  }
  return normalized;
}

function normalizeClaimList(value: unknown): Array<{ claim: string; source: SourceRef }> {
  if (!Array.isArray(value)) return [];
  const normalized: Array<{ claim: string; source: SourceRef }> = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const claim = asTrimmedString(entry.claim);
    const source = normalizeSourceRef(entry.source);
    if (!claim || !source) continue;
    normalized.push({ claim, source });
  }
  return normalized;
}

function normalizeRuleList(value: unknown): Array<{ rule: string; source: SourceRef }> {
  if (!Array.isArray(value)) return [];
  const normalized: Array<{ rule: string; source: SourceRef }> = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const rule = asTrimmedString(entry.rule);
    const source = normalizeSourceRef(entry.source);
    if (!rule || !source) continue;
    normalized.push({ rule, source });
  }
  return normalized;
}

function normalizeAttorneys(value: unknown): FirmProfile["attorneys"] {
  if (!Array.isArray(value)) return [];
  const normalized: FirmProfile["attorneys"] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const name = asTrimmedString(entry.name);
    const sources = normalizeSourceRefs(entry.sources);
    if (!name || sources.length === 0) continue;
    const credentialLines = Array.isArray(entry.credentialLines)
      ? entry.credentialLines.map(asTrimmedString).filter((item): item is string => Boolean(item))
      : [];
    normalized.push({ name, credentialLines, sources });
  }
  return normalized;
}

function normalizeDifferentiators(value: unknown): FirmProfile["differentiators"] {
  if (!Array.isArray(value)) return [];
  const normalized: FirmProfile["differentiators"] = [];
  let fallbackId = 1;
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const claim = asTrimmedString(entry.claim);
    const source = normalizeSourceRef(entry.source);
    if (!claim || !source) continue;
    const id = asTrimmedString(entry.id) ?? `usp_${fallbackId++}`;
    const rawType = asTrimmedString(entry.type);
    const type = rawType && DIFFERENTIATOR_TYPES.has(rawType) ? (rawType as FirmProfile["differentiators"][number]["type"]) : "other";
    const isGeneric = typeof entry.isGeneric === "boolean" ? entry.isGeneric : false;
    const isVerified = typeof entry.isVerified === "boolean" ? entry.isVerified : true;
    normalized.push({ id, claim, type, isGeneric, isVerified, source });
  }
  return normalized;
}

function normalizeTrustSignals(value: unknown): FirmProfile["trustSignals"] {
  const root = isRecord(value) ? value : {};
  const reviewsRaw = isRecord(root.reviews) ? root.reviews : {};

  return {
    reviews: {
      rating: asNumberOrNull(reviewsRaw.rating),
      count: asNumberOrNull(reviewsRaw.count),
      sources: normalizeSourceRefs(reviewsRaw.sources)
    },
    awards: normalizeClaimList(root.awards),
    memberships: normalizeClaimList(root.memberships)
  };
}

function normalizeFirmProfile(input: unknown): FirmProfile {
  const root = isRecord(input) ? input : {};
  const normalized: FirmProfile = {
    brandVoice: isRecord(root.brandVoice) ? root.brandVoice : {},
    trustSignals: normalizeTrustSignals(root.trustSignals),
    attorneys: normalizeAttorneys(root.attorneys),
    processStatements: normalizeClaimList(root.processStatements),
    differentiators: normalizeDifferentiators(root.differentiators),
    doNotSay: normalizeRuleList(root.doNotSay)
  };

  return firmProfileSchema.parse(normalized);
}

function looksBinary(text: string): boolean {
  const sample = text.slice(0, 200);
  if (/PNG|IHDR|JFIF|EXIF|%PDF/i.test(sample)) return true;
  return false;
}

function scoreProfilePage(url: string): number {
  const lower = url.toLowerCase();
  if (lower.includes("/attorney") || lower.includes("/attorneys")) return 6;
  if (lower.includes("/about")) return 5;
  if (lower.includes("/review") || lower.includes("/testimonial")) return 5;
  if (lower.includes("/case-result")) return 4;
  if (lower.includes("/location")) return 4;
  if (lower.includes("/contact")) return 4;
  if (lower.includes("/practice")) return 3;
  return 1;
}

function trimExtractedText(text: string, maxChars = 4500): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return cleaned;
  return cleaned.slice(0, maxChars);
}

function preparePagesForProfile(pages: CrawledPage[]): CrawledPage[] {
  return pages
    .filter((page) => page.extractedText && !looksBinary(page.extractedText))
    .map((page) => ({
      ...page,
      extractedText: trimExtractedText(page.extractedText)
    }))
    .map((page) => ({ page, score: scoreProfilePage(page.url) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.page);
}

function snippetAround(text: string, index: number, radius = 120): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).trim();
}

function buildFallbackProfile(pages: CrawledPage[]): FirmProfile {
  const trustSignals: FirmProfile["trustSignals"] = {
    reviews: { rating: null, count: null, sources: [] },
    awards: [],
    memberships: []
  };
  const attorneys: FirmProfile["attorneys"] = [];
  const differentiators: FirmProfile["differentiators"] = [];
  const processStatements: FirmProfile["processStatements"] = [];
  const doNotSay: FirmProfile["doNotSay"] = [];

  for (const page of pages) {
    const text = page.extractedText;
    const lower = text.toLowerCase();

    if (!trustSignals.reviews.rating) {
      const ratingMatch = text.match(/\b([3-5]\.\d)\s*stars?\b/i);
      if (ratingMatch?.[1]) {
        trustSignals.reviews.rating = Number(ratingMatch[1]);
        trustSignals.reviews.sources.push({ url: page.url, snippet: snippetAround(text, ratingMatch.index ?? 0) });
      }
    }

    if (!trustSignals.reviews.count) {
      const countMatch =
        text.match(/\b(\d{2,4})\s*\+?\s*Five-Star Reviews\b/i) ||
        text.match(/\bbased on\s+(\d{2,4})\s+Ratings\b/i) ||
        text.match(/\b(\d{2,4})\s+Ratings\b/i) ||
        text.match(/\b(\d{2,4})\s+reviews?\b/i);
      if (countMatch?.[1]) {
        trustSignals.reviews.count = Number(countMatch[1]);
        trustSignals.reviews.sources.push({ url: page.url, snippet: snippetAround(text, countMatch.index ?? 0) });
      }
    }

    if (attorneys.length === 0 && lower.includes("attorneys")) {
      const startIdx = lower.indexOf("attorneys");
      const slice = text.slice(startIdx, startIdx + 400);
      const cut = slice.split(/Locations|Resources|Practice Areas/i)[0] ?? slice;
      const rawNames = cut
        .replace(/attorneys/i, "")
        .replace(/\s+/g, " ")
        .split(/Esq\.|Attorney|\n/gi)
        .map((item) => item.replace(/[,–-]+/g, " ").trim())
        .filter((item) => item.split(" ").length >= 2);

      for (const name of rawNames.slice(0, 8)) {
        attorneys.push({
          name,
          credentialLines: [],
          sources: [{ url: page.url, snippet: snippetAround(text, text.indexOf(name)) }]
        });
      }
    }

    if (differentiators.length === 0 && /five-star reviews/i.test(text)) {
      const match = text.match(/\b(\d{2,4}\+?)\s*Five-Star Reviews\b/i);
      if (match?.[0]) {
        differentiators.push({
          id: "usp_reviews",
          claim: match[0],
          type: "other",
          isGeneric: false,
          isVerified: true,
          source: { url: page.url, snippet: snippetAround(text, match.index ?? 0) }
        });
      }
    }

    if (differentiators.length < 2 && /multiple|locations|offices/i.test(text)) {
      const match = text.match(/(Kendall|Miami|Coral Gables|Fort Lauderdale|Pembroke Pines|Miami Lakes).{0,120}/i);
      if (match?.[0]) {
        differentiators.push({
          id: `usp_geo_${differentiators.length + 1}`,
          claim: "Multiple South Florida office locations",
          type: "geography",
          isGeneric: false,
          isVerified: true,
          source: { url: page.url, snippet: snippetAround(text, match.index ?? 0) }
        });
      }
    }

    if (processStatements.length === 0 && /free case evaluation|consultation/i.test(lower)) {
      const match = text.match(/free case evaluation|free consultation/i);
      if (match?.[0]) {
        processStatements.push({
          claim: match[0],
          source: { url: page.url, snippet: snippetAround(text, match.index ?? 0) }
        });
      }
    }

    if (attorneys.length && differentiators.length >= 2 && trustSignals.reviews.sources.length) {
      break;
    }
  }

  const profile: FirmProfile = {
    brandVoice: {},
    trustSignals,
    attorneys,
    processStatements,
    differentiators,
    doNotSay
  };

  return firmProfileSchema.parse(profile);
}

function sanitizeProfileForGeneration(profile: FirmProfile, selected: SelectedUsps): FirmProfile {
  const selectedIds = new Set<string>();
  if (selected.primary?.id) selectedIds.add(selected.primary.id);
  for (const usp of selected.support) {
    if (usp?.id) selectedIds.add(usp.id);
  }

  const safeDifferentiators = profile.differentiators.filter(
    (item) => selectedIds.has(item.id) && item.isVerified && Boolean(item.source?.url) && Boolean(item.source?.snippet)
  );

  return {
    ...profile,
    differentiators: safeDifferentiators
  };
}

function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```json([\s\S]*?)```/i);
  const source = codeBlock?.[1] ? codeBlock[1] : trimmed;
  const firstJson = source.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!firstJson) {
    throw new Error("No JSON payload found in model output");
  }
  return JSON.parse(firstJson[0]);
}

function getModeSuffix(mode: "FIRM_PROFILE_EXTRACT" | "LANDING_PAGE" | "ADS"): string {
  if (mode === "FIRM_PROFILE_EXTRACT") {
    return `\n\n${FIRM_PROFILE_RULES}`;
  }
  if (mode === "ADS") {
    return `\n\n${ADS_RULES}`;
  }
  return `\n\n${LANDING_RULES}`;
}

function getModePrompt(mode: "FIRM_PROFILE_EXTRACT" | "LANDING_PAGE" | "ADS"): string {
  return `${GLOBAL_SYSTEM}${getModeSuffix(mode)}`;
}

function formatValidationError(mode: "FIRM_PROFILE_EXTRACT" | "LANDING_PAGE" | "ADS", error: unknown): string {
  if (error instanceof z.ZodError) {
    return `Schema validation failed: ${error.errors.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" | ")}`;
  }

  return error instanceof Error ? error.message : `Unknown ${mode} validation failure`;
}

async function validateWithRetry<T>(mode: "FIRM_PROFILE_EXTRACT" | "LANDING_PAGE" | "ADS", prompt: string, schema: z.ZodType<T>): Promise<T> {
  const systemPrompt = getModePrompt(mode);

  const parseAndValidate = async (text: string): Promise<T> => {
    const parsed = parseJsonFromText(text) as unknown;
    return schema.parse(parsed) as T;
  };

  const repairPrompt = (badText: string, reason: string) =>
    `MODE=${mode}\nReturn ONLY JSON that validates the required schema. ${reason}\nPrevious output:\n${badText}`;

  const firstPass = await callOpenAi(systemPrompt, prompt);
  try {
    return parseAndValidate(firstPass);
  } catch (error) {
    const repaired = await callOpenAi(systemPrompt, repairPrompt(firstPass, formatValidationError(mode, error)));
    return parseAndValidate(repaired);
  }
}

async function callOpenAi(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: MODEL,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.25
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as {
    output?: Array<{ content?: Array<{ text?: string }> }>;
    output_text?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = payload.output?.[0]?.content?.[0]?.text || payload.output_text || payload.choices?.[0]?.message?.content;
  if (!text) throw new Error("No text content from model");
  return text;
}

function getMissingLandingInputs(input: Project["inputs"]): string[] {
  return REQUIRED_LANDING_FIELDS.filter((field) => {
    const value = input[field];
    return typeof value !== "string" || value.trim().length < 1;
  });
}

function toSectionOrderRecord(pack: LandingPagePack["landingPage"]["sections"]): boolean {
  const requiredOrder = ["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"];
  return requiredOrder.every((key) => key in pack && Boolean(pack[key as keyof typeof pack]));
}

function normalizeLandingCounts(pack: LandingPagePack): LandingPagePack {
  const copy = structuredClone(pack);
  return copy;
}

function normalizeAdsCounts(pack: AdsPack): AdsPack {
  const copy = structuredClone(pack);

  for (const group of copy.adGroups) {
    for (const headline of group.rsa.headlines) {
      headline.charCount = headline.text.trim().length;
    }
    for (const description of group.rsa.descriptions) {
      description.charCount = description.text.trim().length;
    }
  }

  return copy;
}

function assertLandingSchema(input: LandingPagePack): void {
  if (!toSectionOrderRecord(input.landingPage?.sections)) {
    throw new Error("Landing page sections are not in required shape/order");
  }

  const sectionMap = Object.keys(input.landingPage.sections);
  const sectionOrder = ["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"];
  const trackedOrder = sectionMap.filter((key) => key !== "microFaqs");

  for (let i = 0; i < sectionOrder.length; i += 1) {
    if (trackedOrder[i] !== sectionOrder[i]) {
      throw new Error(`Landing page sections out of order: expected ${sectionOrder[i]} at index ${i}`);
    }
  }

  const required = ["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"];
  const missing = required.filter((item) => !sectionMap.includes(item));
  if (missing.length > 0) {
    throw new Error(`Missing landing sections: ${missing.join(", ")}`);
  }

  if (input.landingPage.sections.microFaqs?.length > 4) {
    throw new Error("Landing page exceeds max micro-FAQ count (4)");
  }
}

function enforceAdsLimits(pack: AdsPack): void {
  const requiredCounts: string[] = [];

  for (const group of pack.adGroups) {
    const h1 = group.rsa.headlines.filter((headline) => headline.pin === "H1");
    if (h1.length !== 1) requiredCounts.push(`Group ${group.name}: exactly one H1 pin`);
    if (group.rsa.path1.length > 15) requiredCounts.push(`Group ${group.name}: path1 exceeds 15`);
    if (group.rsa.path2.length > 15) requiredCounts.push(`Group ${group.name}: path2 exceeds 15`);
    if (group.rsa.path1.length === 0 && group.rsa.path2.length === 0) {
      requiredCounts.push(`Group ${group.name}: path fields should contain URL fragment`);
    }

    if (group.rsa.headlines.some((item) => item.text.length > 30)) {
      requiredCounts.push(`Group ${group.name}: headline exceeds 30`);
    }

    const h2 = group.rsa.headlines.filter((item) => item.pin === "H2");
    if (h2.length !== 1) {
      requiredCounts.push(`Group ${group.name}: exactly one H2 pin is required`);
    }

    if (group.rsa.descriptions.some((item) => item.text.length > 90)) {
      requiredCounts.push(`Group ${group.name}: description exceeds 90`);
    }
    for (const headline of group.rsa.headlines) {
      headline.charCount = headline.text.length;
      if (headline.pin === "H2" && headline.text.length > 30) {
        requiredCounts.push(`Group ${group.name}: pinned H2 headline too long`);
      }
    }
    for (const callout of group.extensions.callouts) {
      if (callout.text.length > 25) requiredCounts.push(`Group ${group.name}: callout too long`);
    }
    for (const sitelink of group.extensions.sitelinks) {
      if (sitelink.title.length > 25 || sitelink.desc1.length > 35 || sitelink.desc2.length > 35) {
        requiredCounts.push(`Group ${group.name}: sitelink field exceeds limit`);
      }
    }
  }

  if (requiredCounts.length) {
    throw new Error(requiredCounts.join(" | "));
  }
}

function formatUspsForPrompt(profile: FirmProfile, selected: SelectedUsps): string {
  const all = [
    selected.primary
      ? {
          id: selected.primary.id,
          claim: selected.primary.claim,
          type: selected.primary.type,
          source: selected.primary.source,
          role: "primary"
        }
      : null,
    ...selected.support.map((item) => ({ id: item.id, claim: item.claim, type: item.type, source: item.source, role: "support" }))
  ].filter(Boolean);

  if (!all.length) {
    return "No verified USPs were selected.";
  }

  return all
    .map(
      (item) =>
        `${item.role} | ${item.id} | ${item.type} | ${item.claim} | source=${item.source.url} | snippet="${item.source.snippet}"`
    )
    .join("\n");
}

export async function profileFromCrawledPages(firmDomain: string, pages: CrawledPage[]): Promise<FirmProfile> {
  const preparedPages = preparePagesForProfile(pages);
  const prompt = [
    "MODE=FIRM_PROFILE_EXTRACT",
    `Firm domain: ${firmDomain}`,
    "Input: crawledPages[]",
    `Pages JSON: ${JSON.stringify(preparedPages)}`,
    "Return strict FirmProfile JSON matching schema. Use empty arrays/objects when data is missing."
  ].join("\n\n");

  const systemPrompt = getModePrompt("FIRM_PROFILE_EXTRACT");
  const repairPrompt = (badText: string, reason: string) =>
    `MODE=FIRM_PROFILE_EXTRACT\nReturn ONLY JSON that matches the FirmProfile schema. ${reason}\nPrevious output:\n${badText}`;

  const firstPass = await callOpenAi(systemPrompt, prompt);
  const finalize = (payload: unknown): FirmProfile => {
    const normalized = normalizeFirmProfile(payload);
    const hasSignals =
      normalized.trustSignals.reviews.sources.length > 0 ||
      normalized.trustSignals.awards.length > 0 ||
      normalized.trustSignals.memberships.length > 0 ||
      normalized.attorneys.length > 0 ||
      normalized.processStatements.length > 0 ||
      normalized.differentiators.length > 0;
    if (!hasSignals) {
      return buildFallbackProfile(preparedPages);
    }
    return normalized;
  };

  try {
    return finalize(parseJsonFromText(firstPass));
  } catch (error) {
    const repaired = await callOpenAi(
      systemPrompt,
      repairPrompt(firstPass, error instanceof Error ? error.message : "Invalid JSON output.")
    );
    return finalize(parseJsonFromText(repaired));
  }
}

export async function generateLandingPageFromInputs(
  project: Project,
  firmProfile: FirmProfile,
  selectedUsps: SelectedUsps,
  keywordCsv: KeywordReport
): Promise<{ pack: LandingPagePack; violations: string[] }> {
  const missingInputs = getMissingLandingInputs(project.inputs);
  if (missingInputs.length > 0) {
    throw new Error(`Missing required fields: ${missingInputs.join(", ")}`);
  }

  if (!selectedUsps.primary && selectedUsps.support.length === 0) {
    throw new Error("No verified selected USP available for final copy.");
  }

  const prompt = [
    "MODE=LANDING_PAGE",
    `Project: ${JSON.stringify({
      firmId: project.firmId,
      practiceArea: project.practiceArea,
      state: project.state,
      geo: project.geo,
      inputs: project.inputs
    })}`,
    `Keyword CSV text (${keywordCsv.fileName ?? "upload.csv"}): ${keywordCsv.text}`,
    `Selected verified USPs:\n${formatUspsForPrompt(firmProfile, selectedUsps)}`,
    `Source firm profile: ${JSON.stringify(sanitizeProfileForGeneration(firmProfile, selectedUsps))}`,
    "Return strict JSON matching schema only."
  ].join("\n\n");

  const pack = await validateWithRetry("LANDING_PAGE", prompt, landingSchema);
  assertLandingSchema(pack);
  if (pack.landingPage.sections.microFaqs.length > 4) {
    pack.landingPage.sections.microFaqs = pack.landingPage.sections.microFaqs.slice(0, 4);
  }

  const violations = pack.frameworkCompliance.filter((row) => !row.pass).map((row) => `${row.section}: ${row.actual}`);
  return { pack: normalizeLandingCounts(pack), violations };
}

export async function regenerateLandingSection(
  project: Project,
  sectionName: string,
  firmProfile: FirmProfile,
  keywordCsv: KeywordReport,
  selectedUsps: SelectedUsps,
  existingLanding: LandingPagePack,
  sectionOverrides?: LandingInputSection
): Promise<LandingPagePack> {
  const currentSection = existingLanding.landingPage.sections[sectionName as keyof typeof existingLanding.landingPage.sections];
  const payloadSection = { ...currentSection, ...sectionOverrides };

  const prompt = [
    "MODE=LANDING_PAGE",
    `Regenerate only this section: ${sectionName}.`,
    `Practice area: ${project.practiceArea}`,
    `State: ${project.state} ${project.geo ? `(geo: ${project.geo})` : ""}`,
    `Selected verified USPs:\n${formatUspsForPrompt(firmProfile, selectedUsps)}`,
    `Existing section context: ${JSON.stringify(payloadSection)}`,
    `Current landing sections: ${JSON.stringify(existingLanding.landingPage.sections)}`,
    `Keyword CSV: ${keywordCsv.text}`,
    `Return strict JSON matching schema only.`
  ].join("\n\n");

  const pack = await validateWithRetry("LANDING_PAGE", prompt, landingSchema);
  assertLandingSchema(pack);
  if (pack.landingPage.sections.microFaqs.length > 4) {
    pack.landingPage.sections.microFaqs = pack.landingPage.sections.microFaqs.slice(0, 4);
  }
  return pack;
}

export async function generateAdsFromLanding(
  project: Project,
  firmProfile: FirmProfile,
  pack: LandingPagePack,
  keywordCsv: KeywordReport,
  selectedUsps: SelectedUsps
): Promise<{ pack: AdsPack; violations: string[] }> {
  if (!selectedUsps.primary && selectedUsps.support.length === 0) {
    throw new Error("No verified selected USP available for ads.");
  }

  const prompt = [
    "MODE=ADS",
    `Project: ${JSON.stringify({
      firmId: project.firmId,
      practiceArea: project.practiceArea,
      state: project.state,
      geo: project.geo
    })}`,
    `Approved landing page sections: ${JSON.stringify(pack.landingPage.sections)}`,
    `Keyword CSV text: ${keywordCsv.text}`,
    `Verified selected USP context:\n${formatUspsForPrompt(firmProfile, selectedUsps)}`,
    `Source firm profile: ${JSON.stringify(sanitizeProfileForGeneration(firmProfile, selectedUsps))}`,
    "Return strict ADS JSON matching schema only."
  ].join("\n\n");

  const ads = await validateWithRetry("ADS", prompt, adsSchema);
  const normalized = normalizeAdsCounts(ads);
  enforceAdsLimits(normalized);

  const violations = normalized.adGroups
    .map((group) => {
      const row: string[] = [];
      if (group.rsa.path1.length > 15) row.push("path1 too long");
      if (group.rsa.path2.length > 15) row.push("path2 too long");
      if (group.rsa.headlines.some((headline) => headline.text.length > 30)) row.push("headline too long");
      if (group.rsa.descriptions.some((description) => description.text.length > 90)) row.push("description too long");
      if (group.rsa.headlines.filter((headline) => headline.pin === "H1").length !== 1) row.push("H1 pin must be exactly one");
      return row.length ? `${group.name}: ${row.join(", ")}` : "";
    })
    .filter(Boolean);

  return { pack: normalized, violations };
}

export function autoFixAdViolations(pack: AdsPack): AdsPack {
  const copy = structuredClone(pack);

  for (const group of copy.adGroups) {
    group.rsa.path1 = group.rsa.path1.slice(0, 15);
    group.rsa.path2 = group.rsa.path2.slice(0, 15);
    group.rsa.headlines = group.rsa.headlines.map((headline) => ({
      ...headline,
      text: headline.text.slice(0, 30),
      charCount: Math.min(headline.text.length, 30)
    }));
    group.rsa.descriptions = group.rsa.descriptions.map((description) => ({
      ...description,
      text: description.text.slice(0, 90),
      charCount: Math.min(description.text.length, 90)
    }));

    for (const s of group.extensions.sitelinks) {
      s.title = s.title.slice(0, 25);
      s.desc1 = s.desc1.slice(0, 35);
      s.desc2 = s.desc2.slice(0, 35);
    }

    for (const c of group.extensions.callouts) {
      c.text = c.text.slice(0, 25);
    }

    group.rsa.headlines.forEach((headline, index) => {
      headline.pin = index === 0 ? "H1" : null;
    });

    const proofCandidate = group.rsa.headlines.find(
      (item, index) => index !== 0 && /proof|award|review|result|recognition|experience|years/i.test(item.text)
    );
    const fallbackCandidate = group.rsa.headlines.find((_, index) => index !== 0);
    const h2Target = proofCandidate ?? fallbackCandidate;

    if (h2Target) {
      h2Target.pin = "H2";
    }

    let seenH2 = false;
    for (const headline of group.rsa.headlines) {
      if (headline.pin !== "H2") continue;
      if (!seenH2) {
        seenH2 = true;
        continue;
      }
      headline.pin = null;
    }
  }

  return normalizeAdsCounts(copy);
}
