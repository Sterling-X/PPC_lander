import { toCSVRow } from "@/lib/utils";
import { LandingPagePack, AdsPack, LandingPageSectionKey } from "@/lib/types";

export function exportLandingCsv(pack: LandingPagePack): string {
  const lines: string[] = [];

  lines.push(toCSVRow(["Section", "Headline", "Subhead", "Body"]));
  const order = ["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"];
  for (const key of order) {
    const section = pack.landingPage.sections[key as LandingPageSectionKey];
    lines.push(toCSVRow([key, section.headline, section.subhead || "", section.body]));
  }

  lines.push("");
  lines.push("SECTION,Type,Key,Value");
  for (const map of pack.keywordToPageMap) {
    lines.push(
      toCSVRow([
        "KeywordToPageMap",
        map.landingPageSection,
        map.keywordTheme,
        `${map.primaryKeywords.join("|")}::${map.naturalMessageMatchPhrasing}`
      ])
    );
  }

  return lines.join("\n");
}

export function exportLandingCsvWithMap(pack: LandingPagePack): string {
  const lines: string[] = ["KeywordTheme,PrimaryKeywords,LandingPageSection,NaturalMessageMatchPhrasing"];

  for (const map of pack.keywordToPageMap) {
    lines.push(toCSVRow([map.keywordTheme, map.primaryKeywords.join("|"), map.landingPageSection, map.naturalMessageMatchPhrasing]));
  }

  return lines.join("\n");
}

export function exportRsaHeadlinesCsv(pack: AdsPack): string {
  const rows: string[] = [];

  rows.push("AdGroup,Pin,Text,CharCount");
  for (const g of pack.adGroups) {
    for (const headline of g.rsa.headlines) {
      rows.push(toCSVRow([g.name, headline.pin ?? "", headline.text, headline.charCount]));
    }
  }

  return rows.join("\n");
}

export function exportRsaDescriptionsCsv(pack: AdsPack): string {
  const rows: string[] = [];

  rows.push("AdGroup,Text,CharCount");
  for (const g of pack.adGroups) {
    for (const desc of g.rsa.descriptions) {
      rows.push(toCSVRow([g.name, desc.text, desc.charCount]));
    }
  }

  return rows.join("\n");
}

export function exportSitelinksCsv(pack: AdsPack): string {
  const rows: string[] = [];

  rows.push("Campaign,Title,Desc1,Desc2,FinalURL");
  for (const g of pack.adGroups) {
    for (const sl of g.extensions.sitelinks) {
      rows.push(toCSVRow([g.name, sl.title, sl.desc1, sl.desc2, sl.finalUrl]));
    }
  }

  return rows.join("\n");
}

export function exportCalloutsCsv(pack: AdsPack): string {
  const rows: string[] = [];

  rows.push("Campaign,Text");
  for (const g of pack.adGroups) {
    for (const callout of g.extensions.callouts) {
      rows.push(toCSVRow([g.name, callout.text]));
    }
  }

  return rows.join("\n");
}

export function exportStructuredSnippetsCsv(pack: AdsPack): string {
  const rows: string[] = [];

  rows.push("Campaign,Header,Values");
  for (const g of pack.adGroups) {
    for (const snippet of g.extensions.structuredSnippets) {
      rows.push(toCSVRow([g.name, snippet.header, snippet.values.join("|")]));
    }
  }

  return rows.join("\n");
}

export function exportAdsCsv(pack: AdsPack): string {
  const rows: string[] = [];

  rows.push("Section,Group,PinOrType,Text,CharCount");
  rows.push("");

  const headlines = exportRsaHeadlinesCsv(pack).split(/\n/);
  for (const row of headlines) {
    rows.push(row.replace(/^AdGroup,Pin,Text,CharCount$/, "Section,Group,PinOrType,Text,CharCount"));
  }

  rows.push("");
  rows.push("Section,Group,PinOrType,Text,CharCount");

  const descriptions = exportRsaDescriptionsCsv(pack).split(/\n/);
  for (const row of descriptions) {
    rows.push(row.replace(/^AdGroup,Text,CharCount$/, "Section,Group,PinOrType,Text,CharCount"));
  }

  rows.push("");
  rows.push("Section,Campaign,Title,Desc1,Desc2,FinalURL");

  for (const g of pack.adGroups) {
    for (const sl of g.extensions.sitelinks) {
      rows.push(toCSVRow(["Sitelink", g.name, sl.title, sl.desc1, sl.desc2, sl.finalUrl]));
    }
  }

  rows.push("");
  rows.push("Section,Campaign,Text");

  for (const g of pack.adGroups) {
    for (const callout of g.extensions.callouts) {
      rows.push(toCSVRow(["Callout", g.name, callout.text]));
    }
  }

  rows.push("");
  rows.push("Section,Campaign,Header,Values");

  for (const g of pack.adGroups) {
    for (const snippet of g.extensions.structuredSnippets) {
      rows.push(toCSVRow(["StructuredSnippet", g.name, snippet.header, snippet.values.join("|")]));
    }
  }

  return rows.join("\n");
}
