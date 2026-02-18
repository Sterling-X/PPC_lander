export type OptionalFirmDetails = {
  firmName?: string;
  cityRegion?: string;
  phone?: string;
  intakeUrl?: string;
  attorneyBios?: string;
  yearsInPractice?: string;
  differentiators?: string;
};

export type GeneratorInput = {
  state: string;
  practiceArea: string;
  guidelinesBlock: string;
  firmDetails?: OptionalFirmDetails;
};

export type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      errors: string[];
    };
