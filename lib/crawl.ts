import dns from "node:dns/promises";
import { load } from "cheerio";
import { canonicalUrl, normalizeText, stripHtml } from "@/lib/utils";
import { CrawledPage, Firm } from "@/lib/types";

const ALLOWED_SCHEMES = ["http:", "https:"] as const;
const CRAWL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CrawlSource = "sitemap" | "crawl";

function isIpLike(hostname: string): string | null {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return hostname;
  if (/^\[?([a-f0-9:]+)\]?$/i.test(hostname)) {
    return hostname.replace(/\[/g, "").replace(/\]/g, "");
  }
  return null;
}

function isLoopbackOrPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "0.0.0.0" || ip === "::1") return true;
  if (/^10\./.test(ip) || /^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (/^(fd|fc)/i.test(ip)) return true;
  return false;
}

function normalizeInputDomain(value: string): string {
  const raw = value.trim().toLowerCase().replace(/\/$/, "");
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    return `https://${raw}`;
  }
  return raw;
}

export function sanitizeCrawlUrl(raw: string): string {
  const normalized = new URL(raw);
  normalized.search = "";
  normalized.hash = "";
  return normalized.origin + normalized.pathname.replace(/\/$/, "");
}

function isAllowedFirmHost(hostname: string, allowDomain: string): boolean {
  const allowedBase = normalizeInputDomain(allowDomain).replace(/^https?:\/\//, "").replace(/^www\./, "");
  const candidate = hostname.toLowerCase().replace(/^www\./, "");
  if (candidate === allowedBase) return true;
  return candidate.endsWith(`.${allowedBase}`) && candidate.length > allowedBase.length + 1;
}

export function buildCrawlBlockedSuggestions(error?: string): string[] {
  const tips = [
    "If crawling fails due blocks, add high-signal URLs manually in the Crawl page and re-run.",
    "Recommended add-ons: /about, /attorneys, /team, /reviews, /testimonials, /case-results, /locations, /contact, /practice-areas/<practice-area>",
    "If robots is blocking extraction, confirm Terms/consent and re-run with a lower depth."
  ];
  if (error) {
    return [`Crawl blocked: ${error}`, ...tips];
  }
  return tips;
}

function isAssetUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|pdf|svg|css|js|woff2?|ttf|eot|ico)(\?|#|$)/i.test(url);
}

function rankMatch(path: string, practiceArea: string, includePaths: string[], excludePaths: string[]): boolean {
  const lowerPath = path.toLowerCase();
  if (excludePaths.some((entry) => lowerPath.includes(entry.toLowerCase()))) return false;
  if (includePaths.some((entry) => lowerPath.includes(entry.toLowerCase()))) return true;
  const slug = practiceArea.toLowerCase().replace(/\s+/g, "-");
  return lowerPath.includes(slug);
}

async function getRobotsBlockedPaths(base: string): Promise<string[]> {
  try {
    const response = await fetch(`${base}/robots.txt`, {
      redirect: "follow",
      headers: { "User-Agent": "legal-ppc-bot/1.0" }
    });
    if (!response.ok) return [];
    const text = await response.text();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    const disallows: string[] = [];
    let appliesToAll = false;
    for (const line of lines) {
      if (/^user-agent:/i.test(line)) {
        appliesToAll = line.slice("user-agent:".length).trim() === "*";
        continue;
      }
      if (appliesToAll && /^disallow:/i.test(line)) {
        const value = line.slice("disallow:".length).trim().toLowerCase();
        if (value) disallows.push(value);
      }
    }

    return disallows;
  } catch {
    return [];
  }
}

function isDisallowedByRobots(path: string, disallowPaths: string[]): boolean {
  return disallowPaths.some((item) => {
    if (!item || item === "/") return true;
    return path.startsWith(item);
  });
}

async function discoverSitemap(base: string, maxPages: number): Promise<string[]> {
  const response = await fetch(`${base}/sitemap.xml`, {
    headers: { "User-Agent": "legal-ppc-bot/1.0" },
    redirect: "follow"
  });
  if (!response.ok) return [];

  const body = await response.text();
  const entries = Array.from(body.matchAll(/<loc>(.*?)<\/loc>/gi)).map((entry) => entry[1] ?? "").filter(Boolean);
  return entries
    .map((entry) => sanitizeCrawlUrl(entry))
    .filter(Boolean)
    .slice(0, maxPages);
}

function extractLinks($: ReturnType<typeof load>, pageUrl: string): string[] {
  const urls = new Set<string>();
  const links = $(`a[href]`).toArray();

  for (const linkNode of links) {
    const href = $(linkNode).attr("href");
    if (!href) continue;
    if (href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const absolute = new URL(href, pageUrl);
      if (!ALLOWED_SCHEMES.includes(absolute.protocol as (typeof ALLOWED_SCHEMES)[number])) continue;
      const normalized = sanitizeCrawlUrl(absolute.toString());
      urls.add(normalized);
    } catch {
      continue;
    }
  }

  return Array.from(urls).filter((item) => !isAssetUrl(item));
}

function isAllowedFromFirm(url: string, firm: Firm): boolean {
  try {
    const parsed = new URL(url);
    return isAllowedFirmHost(parsed.hostname, firm.domain);
  } catch {
    return false;
  }
}

function getCachedPage(pages: CrawledPage[], targetUrl: string): CrawledPage | undefined {
  const matched = pages.find((item) => item.url === targetUrl);
  if (!matched) return;
  const age = Date.now() - new Date(matched.fetchedAt).getTime();
  if (age > CRAWL_CACHE_TTL_MS) return;
  return matched;
}

export async function discoverUrls(firm: Firm, practiceArea: string): Promise<{ urls: string[]; source: CrawlSource }> {
  const base = normalizeInputDomain(firm.domain);
  const discovered = new Set<string>();
  const disallowed = await getRobotsBlockedPaths(base);

  const sitemap = await discoverSitemap(base, firm.crawlConfig.maxPages).catch(() => []);
  const filteredSitemap = sitemap.filter((candidate) => {
    try {
      const parsed = new URL(candidate);
      if (isAssetUrl(candidate)) return false;
      return rankMatch(parsed.pathname, practiceArea, firm.crawlConfig.includePaths, firm.crawlConfig.excludePaths);
    } catch {
      return false;
    }
  });

  if (filteredSitemap.length > 0) {
    for (const candidate of filteredSitemap.slice(0, firm.crawlConfig.maxPages)) {
      try {
        if (isDisallowedByRobots(new URL(candidate).pathname, disallowed)) continue;
        if (!isAllowedFromFirm(candidate, firm)) continue;
        discovered.add(candidate);
      } catch {
        continue;
      }
    }
    if (discovered.size > 0) {
      return { urls: Array.from(discovered).slice(0, firm.crawlConfig.maxPages), source: "sitemap" };
    }
  }

  const starters = [
    `${base}`,
    `${base}/about`,
    `${base}/attorneys`,
    `${base}/team`,
    `${base}/reviews`,
    `${base}/testimonials`,
    `${base}/case-results`,
    `${base}/locations`,
    `${base}/contact`,
    `${base}/practice-areas/${practiceArea.toLowerCase().replace(/\s+/g, "-")}`
  ].map((item) => sanitizeCrawlUrl(item));

  const queue: Array<{ url: string; depth: number }> = starters.map((url) => ({ url, depth: 0 }));

  while (queue.length > 0 && discovered.size < firm.crawlConfig.maxPages) {
    const current = queue.shift();
    if (!current) break;

    if (discovered.has(current.url)) continue;
    if (!isAllowedFromFirm(current.url, firm)) continue;

    if (isDisallowedByRobots(new URL(current.url).pathname, disallowed)) continue;

    try {
      await assertSafeUrl(current.url, firm.domain);
    } catch {
      continue;
    }

    discovered.add(current.url);

    if (current.depth >= firm.crawlConfig.maxDepth) continue;

    try {
      const page = await fetch(current.url, {
        headers: { "User-Agent": "legal-ppc-bot/1.0" },
        redirect: "follow"
      });
      if (!page.ok) continue;
      const html = await page.text();
      const $ = load(html);
      const links = extractLinks($, current.url);

      for (const link of links) {
        if (discovered.size >= firm.crawlConfig.maxPages) break;
        if (isDisallowedByRobots(new URL(link).pathname, disallowed)) continue;
        if (!isAllowedFromFirm(link, firm)) continue;
        if (!rankMatch(new URL(link).pathname, practiceArea, firm.crawlConfig.includePaths, firm.crawlConfig.excludePaths)) continue;
        queue.push({ url: link, depth: current.depth + 1 });
      }
    } catch {
      continue;
    }
  }

  return { urls: Array.from(discovered), source: "crawl" };
}

async function assertSafeUrl(target: string, allowDomain: string): Promise<URL> {
  const parsed = new URL(target);
  if (!ALLOWED_SCHEMES.includes(parsed.protocol as (typeof ALLOWED_SCHEMES)[number])) {
    throw new Error(`Blocked protocol ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname)) {
    throw new Error("Blocked local host target");
  }

  if (!isAllowedFirmHost(hostname, allowDomain)) {
    throw new Error("Target outside firm domain");
  }

  const ip = isIpLike(hostname);
  if (ip) {
    if (isLoopbackOrPrivateIp(ip)) {
      throw new Error("Blocked private IP target");
    }
  } else {
    const records = await dns.lookup(hostname, { all: true }).catch(() => [] as Array<{ address: string }>);
    if (records.some((record) => isLoopbackOrPrivateIp(record.address))) {
      throw new Error("Blocked private IP target");
    }
  }

  return parsed;
}

export async function fetchAndExtract(url: string): Promise<{ title: string; extractedText: string }> {
  const response = await fetch(url, {
    headers: { "User-Agent": "legal-ppc-bot/1.0" },
    redirect: "follow"
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} for ${url}`);
  }

  const html = await response.text();
  const $ = load(html);
  $("script,style,noscript,svg,iframe").remove();
  const title = $($("title")[0]).text().trim() || url;
  const main = $("main").first().length
    ? $("main").first()
    : $("article").first().length
      ? $("article").first()
      : $("body").first();

  const extractedText = normalizeText(main.text() || stripHtml(html));
  if (!extractedText) {
    throw new Error("No text extracted");
  }

  return { title, extractedText };
}

type CrawlOptions = {
  manualUrls?: string[];
};

export async function crawlFirmPages(firm: Firm, practiceArea: string, options?: CrawlOptions): Promise<CrawledPage[]> {
  const discovered = await discoverUrls(firm, practiceArea);
  const pages: CrawledPage[] = [];
  const manualList = sanitizeManualUrls(options?.manualUrls);
  const seen = new Map<string, CrawlSource>(
    discovered.urls.map((url) => [url, discovered.source])
  );

  if (manualList.length > 0) {
    const base = normalizeInputDomain(firm.domain);
    const disallowed = await getRobotsBlockedPaths(base);

    for (const raw of manualList) {
      if (seen.size >= firm.crawlConfig.maxPages) break;
      try {
        const parsed = new URL(raw, base);
        const normalized = sanitizeCrawlUrl(parsed.toString());
        if (isAssetUrl(normalized)) continue;
        const safe = await assertSafeUrl(normalized, firm.domain);
        if (!isAllowedFromFirm(safe.toString(), firm)) continue;

        const pathname = safe.pathname;
        if (isDisallowedByRobots(pathname, disallowed)) continue;
        seen.set(canonicalUrl(safe.toString()), "crawl");
      } catch {
        continue;
      }
    }
  }

  const targets = Array.from(seen.entries()).slice(0, firm.crawlConfig.maxPages);

  for (const [raw, source] of targets) {
    try {
      const parsed = await assertSafeUrl(raw, firm.domain);
      const normalized = sanitizeCrawlUrl(parsed.toString());

      const cached = getCachedPage(firm.crawledPages, canonicalUrl(normalized));
      if (cached) {
        pages.push({ ...cached, source });
        continue;
      }

      const extracted = await fetchAndExtract(normalized);
      pages.push({
        url: canonicalUrl(normalized),
        title: extracted.title,
        extractedText: extracted.extractedText,
        fetchedAt: new Date().toISOString(),
        source
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      if (/blocked|local host|private/i.test(message)) {
        throw new Error(message);
      }
      continue;
    }
  }

  return pages.slice(0, firm.crawlConfig.maxPages);
}

function sanitizeManualUrls(raw?: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => {
      if (typeof value !== "string") return "";
      const trimmed = value.trim();
      if (!trimmed) return "";
      return trimmed;
    })
    .filter(Boolean);
}
