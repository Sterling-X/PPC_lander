import { FirmProfile } from "@/lib/types";

type RankedUsp = {
  uspId: string;
  claim: string;
  type: string;
  isGeneric: boolean;
  isVerified: boolean;
  score: number;
  source: { url: string; snippet: string };
  reasons: string[];
};

export function rankUsps(profile: FirmProfile, practiceArea: string): RankedUsp[] {
  const area = practiceArea.toLowerCase();
  const tokens = area.split(/[\s/_-]+/).filter(Boolean);

  return profile.differentiators.map((d) => {
    let score = 0;
    const reasons: string[] = [];
    const claim = d.claim.toLowerCase();

    if (/[0-9]+/.test(claim)) {
      score += 22;
      reasons.push("specific numeric claim");
    }

    if (/\b(jd|esq|attorney|lawyer|certified|years|experience|court|trial|litigation|custody|divorce|support|adoption)\b/.test(claim)) {
      score += 12;
      reasons.push("credential or practice specificity");
    }

    if (tokens.some((token) => token.length > 2 && claim.includes(token))) {
      score += 18;
      reasons.push("practice-area language match");
    }

    if (d.type !== "other") {
      score += 10;
      reasons.push(`typed as ${d.type}`);
    }

    if (d.type === "niche") {
      score += 8;
      reasons.push("niche category");
    }

    if (d.isVerified) {
      score += 24;
      reasons.push("verified citation");
    }

    if (d.isGeneric) {
      score -= 20;
      reasons.push("generic phrasing");
    }

    if (!d.isGeneric && /\b(unique|first|only|leading|best|guarantee)\b/.test(claim) === false) {
      score += 4;
      reasons.push("non-generic wording");
    }

    return {
      uspId: d.id,
      claim: d.claim,
      type: d.type,
      isGeneric: d.isGeneric,
      isVerified: d.isVerified,
      source: d.source,
      score,
      reasons
    };
  }).sort((a, b) => b.score - a.score);
}

export function validateUspSelection(
  selected: {
    chosenPrimaryUspId: string | null;
    chosenSupportingUspIds: string[];
    blockedUspIds: string[];
  },
  profile: FirmProfile
): { ok: boolean; errors: string[] } {
  const ids = new Set(profile.differentiators.map((d) => d.id));
  const errors: string[] = [];
  const map = new Map(profile.differentiators.map((item) => [item.id, item]));

  if (!selected.chosenPrimaryUspId) {
    errors.push("Primary USP required.");
  }
  if (selected.chosenPrimaryUspId && !ids.has(selected.chosenPrimaryUspId)) {
    errors.push("Primary USP does not exist in extracted candidates.");
  }
  if (selected.chosenPrimaryUspId) {
    const primary = map.get(selected.chosenPrimaryUspId);
    if (primary && !primary.isVerified) {
      errors.push("Primary USP must be verified and source-backed.");
    }
    if (primary && primary.isGeneric) {
      errors.push("Primary USP should not be generic by default for final claims.");
    }

    if (primary && (!primary.source?.url || !primary.source?.snippet)) {
      errors.push("Primary USP must include source citation URL and snippet.");
    }
  }

  const dups = new Set(selected.chosenSupportingUspIds);
  if (dups.size !== selected.chosenSupportingUspIds.length) {
    errors.push("Supporting USP list contains duplicates.");
  }

  if (selected.chosenSupportingUspIds.length > 3) {
    errors.push("Supporting USPs max is 3.");
  }

  for (const id of selected.chosenSupportingUspIds) {
    if (!ids.has(id)) {
      errors.push("Supporting USP list has invalid id.");
      continue;
    }
    if (id === selected.chosenPrimaryUspId) errors.push("Primary USP cannot appear in supporting list.");
    const support = map.get(id);
    if (support && !support.isVerified) errors.push("Supporting USP list can only include verified claims.");

    if (support && (!support.source?.url || !support.source?.snippet)) {
      errors.push("Supporting USP must include source citation URL and snippet.");
    }
  }

  for (const id of selected.blockedUspIds) {
    if (!ids.has(id)) {
      errors.push("Blocked USP list has invalid id.");
      continue;
    }
    if (selected.chosenPrimaryUspId === id) {
      errors.push("Primary USP cannot be blocked.");
    }
    if (selected.chosenSupportingUspIds.includes(id)) {
      errors.push("Blocked USP cannot be in supporting list.");
    }
  }

  return { ok: errors.length === 0, errors: Array.from(new Set(errors)) };
}

export function getSelectedUsps(profile: FirmProfile, selection: { chosenPrimaryUspId: string | null; chosenSupportingUspIds: string[] }): {
  primary?: FirmProfile["differentiators"][number];
  support: FirmProfile["differentiators"][number][];
} {
  const lookup = new Map(profile.differentiators.map((d) => [d.id, d]));
  const primary = selection.chosenPrimaryUspId ? lookup.get(selection.chosenPrimaryUspId) : undefined;
  const support = selection.chosenSupportingUspIds
    .map((id) => lookup.get(id))
    .filter(
      (candidate): candidate is FirmProfile["differentiators"][number] =>
        Boolean(candidate) && candidate.isVerified && Boolean(candidate.source?.url) && Boolean(candidate.source?.snippet)
    );

  const verifiedPrimary =
    primary && primary.isVerified && Boolean(primary.source?.url) && Boolean(primary.source?.snippet) ? primary : undefined;
  const filteredSupport = support;

  return { primary: verifiedPrimary, support: filteredSupport };
}
