import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "crypto";
import { DBState, Firm, Project, CrawlConfig, FirmProfile, CrawledPage, ProjectInputs, KeywordReport, LandingPagePack, AdsPack, PracticeAreaTemplate } from "@/lib/types";
import { firmSchema, projectSchema } from "@/lib/contracts";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "db.json");

const DEFAULT_CRAWL_CONFIG: CrawlConfig = {
  maxPages: 30,
  maxDepth: 2,
  includePaths: ["/about", "/attorneys", "/team", "/reviews", "/testimonials", "/case-results", "/locations", "/contact", "/practice-areas"],
  excludePaths: ["/privacy", "/terms", "/cookie", "/careers", "/careers/"]
};

const PROJECT_STATUS_ORDER = ["draft", "crawl-complete", "usp-selected", "keyword-uploaded", "landing-generated", "ads-generated"] as const;
type ProjectStatus = (typeof PROJECT_STATUS_ORDER)[number];

const DEFAULT_TEMPLATES: PracticeAreaTemplate[] = [
  {
    id: "child-custody",
    practiceAreaKey: "Child Custody",
    requiredSections: ["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"],
    ordering: ["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"],
    mustIncludeTopics: ["initial assessment", "court process", "parenting plan", "mediation options"],
    complianceNotes: ["No legal outcome guarantees", "No unverified fee promises", "No emergency legal advice"],
    defaultMicroFaqs: [
      "What happens in the first consultation?",
      "How soon is next-step scheduling?",
      "What should I bring to the intake?",
      "What should I expect from communication?"
    ]
  },
  {
    id: "divorce",
    practiceAreaKey: "Divorce",
    requiredSections: ["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"],
    ordering: ["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"],
    mustIncludeTopics: ["case strategy", "asset division", "support process", "temporary orders"],
    complianceNotes: ["No legal advice language", "No outcome certainty claims", "State-specific review required"],
    defaultMicroFaqs: [
      "How soon can we discuss separation timeline?",
      "What happens at intake?",
      "What does consultation include?",
      "Can I keep confidentiality confidentially?"
    ]
  }
];

type DBFile = {
  firms: Firm[];
  projects: Project[];
  practiceAreaTemplates: PracticeAreaTemplate[];
};

function defaultState(): DBFile {
  return {
    firms: [],
    projects: [],
    practiceAreaTemplates: DEFAULT_TEMPLATES
  };
}

async function readOrInit(): Promise<DBFile> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, JSON.stringify(defaultState(), null, 2), "utf8");
  }

  const raw = await fs.readFile(FILE_PATH, "utf8");
  const parsed = JSON.parse(raw) as DBFile;

  return {
    firms: parsed.firms ?? [],
    projects: parsed.projects ?? [],
    practiceAreaTemplates: parsed.practiceAreaTemplates ?? DEFAULT_TEMPLATES
  };
}

async function writeState(state: DBFile): Promise<void> {
  await fs.writeFile(FILE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function bumpProjectStatus(current: string, next: string): string {
  const currentRank = PROJECT_STATUS_ORDER.indexOf(current as ProjectStatus);
  const targetRank = PROJECT_STATUS_ORDER.indexOf(next as ProjectStatus);

  if (currentRank === -1 || targetRank === -1) {
    return next;
  }

  return targetRank > currentRank ? next : current;
}

function upgradeProjectStatus(current: Project["status"], target: Project["status"]): Project["status"] {
  return bumpProjectStatus(current, target) as Project["status"];
}

function normalizeDomain(input: string): string {
  const trimmed = input.trim();
  const hasScheme = trimmed.startsWith("http://") || trimmed.startsWith("https://");
  const full = hasScheme ? trimmed : `https://${trimmed}`;
  const parsed = new URL(full);
  return `${parsed.protocol}//${parsed.host.replace(/\/$/, "").toLowerCase()}`;
}

export async function seedDemoFirmAndProject(): Promise<{ firmId: string; projectId: string }> {
  const db = await readOrInit();
  const existing = db.firms.find((item) => item.domain === "https://www.examplefamilylaw.com");

  const firm: Firm = existing ?? {
    id: randomUUID(),
    name: "Demo Family Law",
    domain: "https://www.examplefamilylaw.com",
    createdAt: new Date().toISOString(),
    crawlConfig: DEFAULT_CRAWL_CONFIG,
    uspSelection: { chosenPrimaryUspId: null, chosenSupportingUspIds: [], blockedUspIds: [] },
    crawledPages: [],
    crawlErrors: [],
    firmProfile: {
      brandVoice: {
        tone: "Caring, plain, confidence-building"
      },
      trustSignals: {
        reviews: { rating: 4.7, count: 82, sources: [{ url: "https://www.examplefamilylaw.com/reviews", snippet: "Example review listing and ratings metadata" }] },
        awards: [{ claim: "Top family-law reviewed practice sample", source: { url: "https://www.examplefamilylaw.com/awards", snippet: "Award and accreditation list on the practice website" } }],
        memberships: [{ claim: "Member of family law associations", source: { url: "https://www.examplefamilylaw.com/about", snippet: "Membership mention in attorney bio section" } }]
      },
      attorneys: [{
        name: "Demo Lead Attorney",
        credentialLines: ["JD", "MBA"],
        sources: [{ url: "https://www.examplefamilylaw.com/attorneys", snippet: "Attorney roster and credentials" }]
      }],
      processStatements: [
        {
          claim: "Practice follows a structured intake and case planning workflow.",
          source: { url: "https://www.examplefamilylaw.com/process", snippet: "Firm process page describing consultation and case management" }
        }
      ],
      differentiators: [
        { id: "usp_1", claim: "24-hour callback for consultation requests", type: "availability", isGeneric: false, isVerified: true, source: { url: "https://www.examplefamilylaw.com/contact", snippet: "Contact page response commitment" } },
        { id: "usp_2", claim: "Experienced family law team with local court familiarity", type: "experience", isGeneric: false, isVerified: true, source: { url: "https://www.examplefamilylaw.com/attorneys", snippet: "Attorney experience descriptions" } },
        { id: "usp_3", claim: "Client-first communication updates", type: "approach", isGeneric: true, isVerified: true, source: { url: "https://www.examplefamilylaw.com/approach", snippet: "Service approach statement" } }
      ],
      doNotSay: [
        { rule: "Avoid guaranteed outcomes or best-in-area phrasing.", source: { url: "https://www.examplefamilylaw.com/policy", snippet: "Advertising policy and ethics" } }
      ]
    },
    firmProfileUpdatedAt: new Date().toISOString()
  };

  if (!existing) {
    db.firms.push(firm);
  }

  const project: Project = db.projects.find(
    (item) => item.firmId === firm.id && item.practiceArea === "Divorce" && item.state === "California"
  ) ?? {
    id: randomUUID(),
    firmId: firm.id,
    practiceArea: "Divorce",
    state: "California",
    geo: "Los Angeles",
    createdAt: new Date().toISOString(),
    status: "keyword-uploaded",
    keywordReport: {
      text: "divorce attorney, divorce lawyer ca, los angeles divorce attorney\nfree consultation, family law attorney\nchild custody", 
      fileName: "sample-keywords.csv",
      uploadedAt: new Date().toISOString()
    },
    inputs: {
      consultationOffer: "Free initial consultation",
      callbackCommitment: "Calls returned same business day where possible",
      phone: "(555) 123-4567"
    },
    artifacts: {}
  };

  const existingProjectIndex = db.projects.findIndex((item) => item.id === project.id);
  if (existingProjectIndex >= 0) {
    db.projects[existingProjectIndex] = project;
  } else {
    db.projects.push(project);
  }

  await writeState(db);
  return { firmId: firm.id, projectId: project.id };
}

export async function listFirms(): Promise<Firm[]> {
  const db = await readOrInit();
  return db.firms;
}

export async function getFirm(id: string): Promise<Firm | undefined> {
  const db = await readOrInit();
  return db.firms.find((firm) => firm.id === id);
}

export async function createFirm(input: { name?: string; domain: string; crawlConfig?: Partial<CrawlConfig> }): Promise<Firm> {
  const db = await readOrInit();
  const firm: Firm = {
    id: randomUUID(),
    name: input.name?.trim() || undefined,
    domain: normalizeDomain(input.domain),
    createdAt: new Date().toISOString(),
    crawlConfig: { ...DEFAULT_CRAWL_CONFIG, ...(input.crawlConfig ?? {}) },
    uspSelection: {
      chosenPrimaryUspId: null,
      chosenSupportingUspIds: [],
      blockedUspIds: []
    },
    crawledPages: []
  };

  db.firms.push(firm);
  await writeState(db);
  return firm;
}

export async function updateFirm(id: string, patch: Partial<Firm>): Promise<Firm> {
  const db = await readOrInit();
  const idx = db.firms.findIndex((firm) => firm.id === id);
  if (idx === -1) throw new Error("Firm not found");

  const existing = db.firms[idx];
  const updated: Firm = {
    ...existing,
    ...patch,
    id: existing.id,
    uspSelection: patch.uspSelection ?? existing.uspSelection,
    crawledPages: patch.crawledPages ?? existing.crawledPages
  };

  db.firms[idx] = firmSchema.parse(updated) as Firm;
  await writeState(db);
  return db.firms[idx];
}

export async function setFirmProfile(firmId: string, payload: { firmProfile: FirmProfile; crawledPages: CrawledPage[]; crawlErrors?: string[] }): Promise<Firm> {
  const db = await readOrInit();
  const idx = db.firms.findIndex((firm) => firm.id === firmId);
  if (idx === -1) throw new Error("Firm not found");

  db.firms[idx] = {
    ...db.firms[idx],
    firmProfile: payload.firmProfile,
    crawledPages: payload.crawledPages,
    firmProfileUpdatedAt: new Date().toISOString(),
    crawlErrors: payload.crawlErrors
  };

  firmSchema.parse(db.firms[idx]);
  await writeState(db);
  return db.firms[idx];
}

export async function setFirmUspSelection(
  firmId: string,
  selection: {
    chosenPrimaryUspId: string | null;
    chosenSupportingUspIds: string[];
    blockedUspIds: string[];
  }
): Promise<Firm> {
  return updateFirm(firmId, { uspSelection: selection });
}

export async function listProjects(): Promise<Project[]> {
  const db = await readOrInit();
  return db.projects;
}

export async function createProject(input: { firmId: string; practiceArea: string; state: string; geo?: string }): Promise<Project> {
  const db = await readOrInit();
  const project: Project = {
    id: randomUUID(),
    firmId: input.firmId,
    practiceArea: input.practiceArea,
    state: input.state,
    geo: input.geo,
    createdAt: new Date().toISOString(),
    status: "draft",
    inputs: {},
    artifacts: {}
  };
  db.projects.push(project);
  await writeState(db);
  return project;
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await readOrInit();
  return db.projects.find((project) => project.id === id);
}

export async function setProjectStatus(id: string, status: Project["status"]): Promise<Project> {
  const db = await readOrInit();
  const idx = db.projects.findIndex((project) => project.id === id);
  if (idx === -1) throw new Error("Project not found");

  const current = db.projects[idx].status;
  const upgraded = upgradeProjectStatus(current, status);

  if (upgraded === current) return db.projects[idx];

  db.projects[idx].status = upgraded;
  db.projects[idx] = projectSchema.parse(db.projects[idx]) as Project;
  await writeState(db);
  return db.projects[idx];
}

export async function promoteFirmProjectsToStatus(firmId: string, status: Project["status"]): Promise<void> {
  const db = await readOrInit();
  let changed = false;

  for (const project of db.projects) {
    if (project.firmId !== firmId) continue;
    const upgraded = upgradeProjectStatus(project.status, status);
    if (project.status === upgraded) continue;
    project.status = upgraded;
    changed = true;
  }

  if (changed) {
    await writeState(db);
  }
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const db = await readOrInit();
  const idx = db.projects.findIndex((project) => project.id === id);
  if (idx === -1) throw new Error("Project not found");

  const existing = db.projects[idx];
  const merged: Project = {
    ...existing,
    ...patch,
    id: existing.id,
    artifacts: {
      ...existing.artifacts,
      ...patch.artifacts
    },
    inputs: {
      ...existing.inputs,
      ...patch.inputs
    }
  };

  db.projects[idx] = projectSchema.parse(merged) as Project;
  await writeState(db);
  return db.projects[idx];
}

export async function setProjectInputs(id: string, inputs: ProjectInputs, keywordReport?: KeywordReport): Promise<Project> {
  const project = await getProject(id);
  const targetStatus = keywordReport ? "keyword-uploaded" : project?.status ?? "draft";
  const status = project ? (upgradeProjectStatus(project.status, targetStatus) as Project["status"]) : "draft";

  return updateProject(id, {
    inputs,
    keywordReport,
    status
  });
}

export async function setProjectLandingPack(id: string, pack: LandingPagePack): Promise<Project> {
  const project = await getProject(id);
  const nextStatus = project ? (upgradeProjectStatus(project.status, "landing-generated") as Project["status"]) : "landing-generated";

  return updateProject(id, {
    artifacts: {
      ...(await getProject(id))?.artifacts,
      landingPagePack: pack
    },
    status: nextStatus
  });
}

export async function setProjectAdsPack(id: string, pack: AdsPack): Promise<Project> {
  const project = await getProject(id);
  const nextStatus = project ? (upgradeProjectStatus(project.status, "ads-generated") as Project["status"]) : "ads-generated";

  return updateProject(id, {
    artifacts: {
      ...(await getProject(id))?.artifacts,
      adsPack: pack
    },
    status: nextStatus
  });
}

export async function listTemplates(): Promise<PracticeAreaTemplate[]> {
  const db = await readOrInit();
  return db.practiceAreaTemplates;
}

export async function getDbState(): Promise<DBState> {
  const db = await readOrInit();
  return {
    firms: db.firms,
    projects: db.projects,
    practiceAreaTemplates: db.practiceAreaTemplates
  };
}
