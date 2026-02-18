import { GeneratorInput, ValidationResult } from "@/lib/types";

function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateGeneratorInput(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  const data = payload as GeneratorInput;

  if (!hasValue(data.state)) {
    errors.push("U.S. State is required.");
  }

  if (!hasValue(data.practiceArea)) {
    errors.push("Family Law Practice Area is required.");
  }

  if (!hasValue(data.guidelinesBlock)) {
    errors.push("Guidelines Block is required.");
  }

  if (hasValue(data.firmDetails?.intakeUrl)) {
    try {
      new URL(data.firmDetails!.intakeUrl!);
    } catch {
      errors.push("Intake URL must be a valid URL.");
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}
