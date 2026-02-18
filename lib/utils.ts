export function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return raw;
  }
}

export function toCSVRow(fields: Array<string | number | null | undefined | boolean>): string {
  return fields
    .map((field) => {
      if (field === null || field === undefined) return "";
      const v = String(field).replace(/"/g, '""');
      if (/[,"]/.test(v) || v.includes("\n")) return `"${v}"`;
      return v;
    })
    .join(",");
}

export function exportLandingMarkdown(titleTag: string, meta: string, sections: Record<string, any>): string {
  const sectionOrder = ["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"];
  let md = `# ${titleTag}\n\n`;
  md += `## Meta Description\n${meta}\n\n`;

  for (const key of sectionOrder) {
    const section = sections[key];
    md += `## ${key.toUpperCase()}\n`;
    md += `### Headline\n${section.headline}\n\n`;
    if (section.subhead) md += `### Subhead\n${section.subhead}\n\n`;
    if (section.bullets?.length) {
      md += "### Bullets\n";
      for (const bullet of section.bullets) {
        md += `- ${bullet}\n`;
      }
      md += "\n";
    }
    md += `${section.body}\n\n`;
  }

  md += "## Micro FAQs\n";
  for (const faq of sections.microFaqs) {
    md += `### Q: ${faq.q}\n${faq.a}\n\n`;
  }

  return md;
}
