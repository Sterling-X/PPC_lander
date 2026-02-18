"use client";

import { FormEvent, useMemo, useState } from "react";

type FormState = {
  state: string;
  practiceArea: string;
  guidelinesBlock: string;
  firmName: string;
  cityRegion: string;
  phone: string;
  intakeUrl: string;
  attorneyBios: string;
  yearsInPractice: string;
  differentiators: string;
};

const initialForm: FormState = {
  state: "",
  practiceArea: "",
  guidelinesBlock: "",
  firmName: "",
  cityRegion: "",
  phone: "",
  intakeUrl: "",
  attorneyBios: "",
  yearsInPractice: "",
  differentiators: ""
};

function validateClientForm(form: FormState): string[] {
  const errors: string[] = [];

  if (!form.state.trim()) errors.push("U.S. State is required.");
  if (!form.practiceArea.trim())
    errors.push("Family Law Practice Area is required.");
  if (!form.guidelinesBlock.trim()) errors.push("Guidelines Block is required.");

  if (form.intakeUrl.trim()) {
    try {
      new URL(form.intakeUrl.trim());
    } catch {
      errors.push("Intake URL must be a valid URL.");
    }
  }

  return errors;
}

export default function Home(): JSX.Element {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [markdown, setMarkdown] = useState("");

  const canDownload = useMemo(() => markdown.length > 0, [markdown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrors([]);

    const validationErrors = validateClientForm(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: form.state,
          practiceArea: form.practiceArea,
          guidelinesBlock: form.guidelinesBlock,
          firmDetails: {
            firmName: form.firmName,
            cityRegion: form.cityRegion,
            phone: form.phone,
            intakeUrl: form.intakeUrl,
            attorneyBios: form.attorneyBios,
            yearsInPractice: form.yearsInPractice,
            differentiators: form.differentiators
          }
        })
      });

      const data = (await response.json()) as {
        markdown?: string;
        error?: string;
        details?: string[];
      };

      if (!response.ok) {
        setErrors(data.details ?? [data.error ?? "Failed to generate markdown."]);
        return;
      }

      setMarkdown(data.markdown ?? "");
    } catch {
      setErrors(["Unexpected error while generating markdown."]);
    } finally {
      setIsLoading(false);
    }
  }

  function downloadMarkdown(): void {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `landing-page-instructions-${form.state
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")}-${form.practiceArea
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")}.md`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <h1>Landing Page Instruction Generator</h1>
      <p>
        Generates a complete Markdown instruction document for Claude to write a
        compliance-aware, SEO landing page for family law practice areas.
      </p>

      <div className="grid">
        <section className="card">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="state">U.S. State (required)</label>
              <input
                id="state"
                value={form.state}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, state: event.target.value }))
                }
                placeholder="e.g., Wisconsin"
              />
            </div>

            <div className="field">
              <label htmlFor="practiceArea">
                Family Law Practice Area (required)
              </label>
              <input
                id="practiceArea"
                value={form.practiceArea}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, practiceArea: event.target.value }))
                }
                placeholder="e.g., Child Custody"
              />
            </div>

            <div className="field">
              <label htmlFor="guidelines">Guidelines Block (required)</label>
              <textarea
                id="guidelines"
                value={form.guidelinesBlock}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, guidelinesBlock: event.target.value }))
                }
                placeholder="Paste internal writing/compliance guidelines."
              />
            </div>

            <div className="field">
              <label htmlFor="firmName">Firm Name (optional)</label>
              <input
                id="firmName"
                value={form.firmName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, firmName: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="cityRegion">City/Region (optional)</label>
              <input
                id="cityRegion"
                value={form.cityRegion}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cityRegion: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="phone">Phone (optional)</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="intakeUrl">Intake URL (optional)</label>
              <input
                id="intakeUrl"
                value={form.intakeUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, intakeUrl: event.target.value }))
                }
                placeholder="https://example.com/contact"
              />
            </div>

            <div className="field">
              <label htmlFor="attorneyBios">Attorney Bios (optional)</label>
              <textarea
                id="attorneyBios"
                value={form.attorneyBios}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, attorneyBios: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="yearsInPractice">Years in Practice (optional)</label>
              <input
                id="yearsInPractice"
                value={form.yearsInPractice}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    yearsInPractice: event.target.value
                  }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="differentiators">Differentiators (optional)</label>
              <textarea
                id="differentiators"
                value={form.differentiators}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    differentiators: event.target.value
                  }))
                }
              />
            </div>

            {errors.length > 0 && (
              <div className="error" role="alert">
                {errors.map((error) => (
                  <div key={error}>{error}</div>
                ))}
              </div>
            )}

            <div className="actions">
              <button type="submit" disabled={isLoading}>
                {isLoading ? "Generating..." : "Generate Markdown"}
              </button>
              <button
                type="button"
                onClick={downloadMarkdown}
                disabled={!canDownload}
              >
                Download .md
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <label>Generated Markdown</label>
          <div className="output">
            {markdown ||
              "Your generated Landing Page Instruction Document will appear here."}
          </div>
        </section>
      </div>
    </main>
  );
}
