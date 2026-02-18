import { GeneratorInput } from "@/lib/types";

function clean(value?: string): string {
  return (value ?? "").trim();
}

function fallback(value: string, defaultValue = "Not provided"): string {
  return value.length > 0 ? value : defaultValue;
}

function buildRelatedSemanticThemes(state: string, practiceArea: string): string[] {
  return [
    `${state} ${practiceArea} lawyer`,
    `${practiceArea} attorney in ${state}`,
    `${practiceArea} legal process ${state}`,
    `${practiceArea} consultation ${state}`,
    `${practiceArea} filing requirements ${state}`,
    `family court process ${state}`,
    `${practiceArea} timeline expectations`,
    `${practiceArea} legal fees overview`,
    `${practiceArea} evidence and documentation`,
    `${practiceArea} settlement vs litigation`
  ];
}

export function generateInstructionMarkdown(input: GeneratorInput): string {
  const state = clean(input.state);
  const practiceArea = clean(input.practiceArea);
  const guidelinesBlock = clean(input.guidelinesBlock);

  const firmName = clean(input.firmDetails?.firmName);
  const cityRegion = clean(input.firmDetails?.cityRegion);
  const phone = clean(input.firmDetails?.phone);
  const intakeUrl = clean(input.firmDetails?.intakeUrl);
  const attorneyBios = clean(input.firmDetails?.attorneyBios);
  const yearsInPractice = clean(input.firmDetails?.yearsInPractice);
  const differentiators = clean(input.firmDetails?.differentiators);

  const semanticThemes = buildRelatedSemanticThemes(state, practiceArea);

  return `# Landing Page Instruction Document

## Project Summary
- **Page Purpose:** Create an organic SEO landing page for ${practiceArea} services in ${state} that educates prospective clients and motivates qualified consultations.
- **Primary Conversion Goal:** Encourage the visitor to complete an intake action (call or submit consultation form) with clear next-step instructions.
- **Secondary Conversion Goal:** Build trust through process transparency, compliance-safe language, and clear attorney verification boundaries.

## Audience Persona (Research-Based)
- **Persona Name:** "Overwhelmed Decision-Maker"
- **Demographics:** Adult resident in ${state}, often age 28-52, balancing work/family obligations; seeking legal help for a high-stress family matter.
- **Trigger Events:** Imminent court deadlines, conflict escalation, custody/financial uncertainty, service of legal papers, or major family transition.
- **Emotional Drivers:** Need for stability, child/family protection, financial predictability, and respectful treatment during a stressful process.
- **Objections:** Concern about legal fees, uncertainty about timeline, fear of conflict escalation, and worry about sharing sensitive details.
- **Decision Criteria:** Attorney credibility, process clarity, communication responsiveness, local familiarity, and transparent next steps.
- **Search Intent Mix:** Primarily transactional with informational support queries.
- **Language Patterns:** Uses plain-language phrases like "What happens next," "How long does this take," "Can I afford this," and "What should I do now."
- **Research Status:** Assumption-based persona due to no live audience dataset in this workflow.
- **Validation Methods:** Validate with CRM intake notes, Search Console query terms, call transcripts, and anonymized consultation FAQs.

## State-Specific Compliance Notes
- **Legal Safety Statement:** This document is for marketing-content instructions only and is **not legal advice**.
- **No Outcome Guarantees:** Do not promise results, success rates, or case outcomes.
- **No Unverifiable Claims:** Avoid superlatives and unsupported claims (for example, "best" or "guaranteed") unless explicitly documented in provided firm inputs.
- **No Fabricated Law:** Do not invent statutes, filing rules, deadlines, or court procedures.
- **Attorney Verification Required:** Any jurisdiction-specific legal standards, procedural timelines, filing requirements, or rights summaries must be labeled **Requires Attorney Verification**.
- **Regulatory Review Areas:** Advertising rules, specialty claims, testimonial usage, and disclaimer placement must be reviewed by licensed counsel in ${state}.

## Organic SEO Strategy
- **Primary Keyword Theme:** ${state} ${practiceArea} attorney
- **Related Semantic Themes:**
${semanticThemes.map((theme) => `  - ${theme}`).join("\n")}
- **Title Tag Pattern:** "${practiceArea} Attorney in ${state} | ${fallback(firmName, "[Firm Name]")}"
- **Meta Description Pattern:** "Speak with a ${state} ${practiceArea.toLowerCase()} attorney. Understand next steps, timelines, and consultation options."
- **Internal Linking Strategy:** Link to attorney bio page, contact/intake page, related family-law subpages, and educational FAQ resources.
- **E-E-A-T Signals:** Show attorney credentials, years of practice, jurisdiction served, clear contact data, and transparent process explanation.
- **Suggested Schema Types:** LegalService, LocalBusiness, FAQPage (only for actual on-page FAQ content).

## Structured Page Outline for Claude
- **H1:** ${state} ${practiceArea} Attorney
- **H2/H3 Framework:**
  - H2: Compassionate Legal Guidance for ${practiceArea} Matters in ${state}
  - H2: Why Clients Choose ${fallback(firmName, "Our Firm")}
    - H3: Communication and Client Experience
    - H3: Attorney Background and Practical Experience
  - H2: How the ${practiceArea} Process Typically Works
    - H3: First Consultation and Case Assessment
    - H3: Strategy, Filing, and Case Progress
  - H2: Fees and Billing Expectations
  - H2: Timeline Expectations and Important Variables
  - H2: Frequently Asked Questions
  - H2: Speak With a ${practiceArea} Attorney Today
- **Section Writing Objectives:**
  - Build trust early with calm, practical language.
  - Explain process clearly without legal over-promising.
  - Reduce friction with clear consultation CTA and contact pathways.
- **Localization Guidance:** Reference ${state}${cityRegion ? ` and ${cityRegion}` : ""} naturally in headings and body text where contextually useful; avoid repetitive exact-match keyword stuffing.

## Content Requirements + Do/Don’t Rules
- **Overview:** Explain who the page serves, what problems are addressed, and how consultation begins.
- **Why Choose Us:** Include only verifiable differentiators from firm input and mark any unsupported claim as **Requires Attorney Verification**.
- **Process Section:** Provide a plain-language step flow; explicitly state exact legal requirements vary by facts and jurisdiction.
- **Fees Discussion (Careful Phrasing):** Use ranges/variables only when provided by firm; otherwise explain factors affecting cost and invite consultation.
- **Timeline Discussion (Careful Phrasing):** Describe variability drivers; avoid fixed deadlines unless verified by counsel.
- **FAQs:** Address consultation prep, documentation, communication cadence, and common client concerns.
- **CTA Rules:** Use clear, low-friction CTA text; include phone and intake URL if provided; avoid pressure language.
- **Compliance Do/Don’t:**
  - Do: Add disclaimer language that content is informational and not legal advice.
  - Do: Label state-law specifics as **Requires Attorney Verification** when not attorney-approved.
  - Do: Keep claims factual, attributable, and current.
  - Don’t: Promise outcomes, guarantees, or legal certainty.
  - Don’t: Invent state-specific legal rules, deadlines, or court procedures.
  - Don’t: Use unverifiable prestige language.

## Claude Prompt Template (Ready-to-Paste)
Use the prompt below exactly as the generation brief to Claude.

\`\`\`
You are writing a high-conversion, organic SEO landing page for a family law firm.

STATE: ${state}
PRACTICE AREA: ${practiceArea}

FIRM DETAILS
- Firm name: ${fallback(firmName)}
- City/Region: ${fallback(cityRegion)}
- Phone: ${fallback(phone)}
- Intake URL: ${fallback(intakeUrl)}
- Attorney bios: ${fallback(attorneyBios)}
- Years in practice: ${fallback(yearsInPractice)}
- Differentiators: ${fallback(differentiators)}

PERSONA SUMMARY
- Primary persona: Overwhelmed Decision-Maker (adult resident in ${state}, urgent family legal stress, needs clarity and trusted next step).
- Core concerns: Cost uncertainty, timeline uncertainty, emotional stress, confidentiality, practical outcomes.
- Writing approach: Calm, plain-English, action-oriented, non-alarmist.

SEO GUIDANCE
- Primary keyword theme: ${state} ${practiceArea} attorney
- Semantic themes:
${semanticThemes.map((theme) => `  - ${theme}`).join("\n")}
- Include a title tag and meta description using natural language.
- Use natural localization; no keyword stuffing.
- Include internal link opportunities (bio, intake/contact, related services, FAQs).
- Demonstrate E-E-A-T with verifiable credentials and transparent process explanations.
- Schema awareness: LegalService, LocalBusiness, FAQPage.

REQUIRED OUTLINE
- H1: ${state} ${practiceArea} Attorney
- H2/H3 sections:
  - Compassionate Legal Guidance for ${practiceArea} Matters in ${state}
  - Why Clients Choose ${fallback(firmName, "Our Firm")}
    - Communication and Client Experience
    - Attorney Background and Practical Experience
  - How the ${practiceArea} Process Typically Works
    - First Consultation and Case Assessment
    - Strategy, Filing, and Case Progress
  - Fees and Billing Expectations
  - Timeline Expectations and Important Variables
  - Frequently Asked Questions
  - Speak With a ${practiceArea} Attorney Today

COMPLIANCE RULES (MANDATORY)
- This is informational content only and not legal advice.
- Do not guarantee outcomes or claim certainty.
- Do not fabricate state law, filing rules, or deadlines.
- Mark any jurisdiction-specific legal detail as "Requires Attorney Verification" if not provided by licensed counsel.
- Do not use "best," "expert," or "guaranteed" unless explicitly supported by provided input.

GUIDELINES BLOCK (VERBATIM)
${guidelinesBlock}

ACCEPTANCE CRITERIA
- Target length: 1,200-1,800 words.
- Tone: Professional, empathetic, plain language, confidence without hype.
- Reading level: Grade 7-9.
- Accessibility: Short paragraphs, descriptive headings, scannable lists.
- No hallucinations.
- No invented legal claims.
- Include a clear CTA with provided phone/intake URL when available.
\`\`\`

## Acceptance Checklist
- [ ] Persona alignment is clear and consistent throughout the page.
- [ ] Content explicitly avoids legal advice and outcome guarantees.
- [ ] Any state-specific legal detail is marked **Requires Attorney Verification** unless attorney-approved.
- [ ] Primary keyword theme and semantic themes are incorporated naturally.
- [ ] Title tag and meta description are present and aligned to intent.
- [ ] Internal link opportunities are included.
- [ ] E-E-A-T signals are present (credentials, experience, local relevance, transparent process).
- [ ] Localization feels natural and avoids keyword stuffing.
- [ ] CTA is clear, compliant, and friction-light.
- [ ] Accessibility formatting is applied (clear hierarchy, concise paragraphs, readable lists).
`;
}
