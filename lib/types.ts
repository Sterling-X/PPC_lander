export type SourceRef = { url: string; snippet: string };

export type FirmProfile = {
  brandVoice?: Record<string, unknown>;
  trustSignals: {
    reviews: {
      rating: number | null;
      count: number | null;
      sources: SourceRef[];
    };
    awards: Array<{ claim: string; source: SourceRef }>;
    memberships: Array<{ claim: string; source: SourceRef }>;
  };
  attorneys: Array<{ name: string; credentialLines: string[]; sources: SourceRef[] }>;
  processStatements: Array<{ claim: string; source: SourceRef }>;
  differentiators: Array<{
    id: string;
    claim: string;
    type: "niche" | "speed" | "experience" | "pricing" | "approach" | "availability" | "geography" | "other";
    isGeneric: boolean;
    isVerified: boolean;
    source: SourceRef;
  }>;
  doNotSay: Array<{ rule: string; source: SourceRef }>;
};

export type CrawlConfig = {
  maxPages: number;
  maxDepth: number;
  includePaths: string[];
  excludePaths: string[];
};

export type CrawledPage = {
  url: string;
  title: string;
  extractedText: string;
  fetchedAt: string;
  source: "sitemap" | "crawl";
};

export type Firm = {
  id: string;
  name?: string;
  domain: string;
  createdAt: string;
  crawlConfig: CrawlConfig;
  firmProfile?: FirmProfile;
  firmProfileUpdatedAt?: string;
  uspSelection: {
    chosenPrimaryUspId: string | null;
    chosenSupportingUspIds: string[];
    blockedUspIds: string[];
  };
  crawledPages: CrawledPage[];
  crawlErrors?: string[];
};

export type ProjectInputs = {
  consultationOffer?: string;
  callbackCommitment?: string;
  phone?: string;
  reviewRating?: number | null;
  reviewCount?: number | null;
  yearsExperience?: number | null;
  awards?: string;
  memberships?: string;
  attorneyBios?: string;
};

export type KeywordReport = { text: string; fileName?: string; uploadedAt: string };

export type LandingSection = {
  headline: string;
  subhead?: string;
  bullets: string[];
  body: string;
};

export type LandingPageSectionKey =
  | "hero"
  | "problem"
  | "types"
  | "guide"
  | "plan"
  | "proof"
  | "objections"
  | "close";

export type LandingPagePack = {
  keywordIntelligence: {
    topThemes: string[];
    longTailThemes: string[];
    negatives: string[];
  };
  keywordToPageMap: Array<{
    keywordTheme: string;
    primaryKeywords: string[];
    landingPageSection: LandingPageSectionKey;
    naturalMessageMatchPhrasing: string;
  }>;
  landingPage: {
    titleTag: string;
    metaDescription: string;
    sections: Record<LandingPageSectionKey, LandingSection> & {
      microFaqs: Array<{ q: string; a: string }>;
    };
  };
  frameworkCompliance: Array<{ section: string; requirement: string; actual: string; pass: boolean }>;
};

export type AdsPack = {
  structuralAnalysis: Record<string, unknown>;
  adGroups: Array<{
    name: string;
    rsa: {
      headlines: Array<{ text: string; charCount: number; pin?: "H1" | "H2" | null }>;
      descriptions: Array<{ text: string; charCount: number }>;
      path1: string;
      path2: string;
    };
    extensions: {
      sitelinks: Array<{ title: string; desc1: string; desc2: string; finalUrl: string }>;
      callouts: Array<{ text: string }>;
      structuredSnippets: Array<{ header: string; values: string[] }>;
    };
    serpVariants: Array<{ title: string; description: string }>;
  }>;
  launchChecklist: string[];
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

export type GeneratorInput = {
  state: string;
  practiceArea: string;
  guidelinesBlock: string;
  firmDetails?: {
    firmName?: string;
    cityRegion?: string;
    phone?: string;
    intakeUrl?: string;
    attorneyBios?: string;
    yearsInPractice?: string;
    differentiators?: string;
  };
};

export type Project = {
  id: string;
  firmId: string;
  practiceArea: string;
  state: string;
  geo?: string;
  createdAt: string;
  status: "draft" | "crawl-complete" | "usp-selected" | "keyword-uploaded" | "landing-generated" | "ads-generated";
  keywordReport?: KeywordReport;
  inputs: ProjectInputs;
  artifacts: {
    landingPagePack?: LandingPagePack;
    adsPack?: AdsPack;
    exports?: {
      markdown?: string;
      landingCsvPath?: string;
      adCsvPath?: string;
      updatedAt?: string;
    };
  };
};

export type PracticeAreaTemplate = {
  id: string;
  practiceAreaKey: string;
  requiredSections: string[];
  ordering: string[];
  mustIncludeTopics: string[];
  complianceNotes: string[];
  defaultMicroFaqs: string[];
};

export type DBState = {
  firms: Firm[];
  projects: Project[];
  practiceAreaTemplates: PracticeAreaTemplate[];
};
