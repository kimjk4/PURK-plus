"use client";

import React, { useMemo, useState } from "react";
import { AlertCircle, Calculator, Info } from "lucide-react";

/**
 * PURK + SCN1 (PURK+) Risk Calculator
 *
 * Drop this file into a Next.js (App Router) project as app/page.tsx
 * or into a React app and render <RiskCalculator />.
 *
 * Styling: TailwindCSS (no config needed for Canvas preview). If using Next.js,
 * be sure Tailwind is set up per the standard guide.
 *
 * Data sources (encoded into logic):
 * - PURK variables at initial presentation:
 *   - Baseline creatinine > 150 µmol/L (1.7 mg/dL) → +2
 *   - Failure to thrive → +2
 *   - High-grade VUR on VCUG → +1
 *   - Renal dysplasia on ultrasound → +1
 *   - PURK risk groups: 0–1 Low, 2–3 Intermediate, ≥4 High
 * - SCN1 risk groups at 1 year of age:
 *   - < 0.4 mg/dL (<35 µmol/L) → Low
 *   - 0.4–0.99 mg/dL (35–88 µmol/L) → Intermediate
 *   - ≥ 1.0 mg/dL (≥88 µmol/L) → High
 * - PURK+ 3×3 matrix (SCN1 weighted):
 *   SCN1↓ / PURK→ | Low | Intermediate | High
 *   Low            | Low |    Low       | Intermediate
 *   Intermediate   | Int |   Int        | High
 *   High           | High|   High       | High
 *
 * Unit handling:
 * - Creatinine entries accept mg/dL or µmol/L with automatic conversion.
 */

// --- Utilities ---
const UMOL_PER_MGDL = 88.4; // creatinine unit conversion

function mgdlToUmol(mgdl: number): number {
  return mgdl * UMOL_PER_MGDL;
}

function umolToMgdl(umol: number): number {
  return umol / UMOL_PER_MGDL;
}

type Unit = "mg/dL" | "µmol/L";

function normalizeCreatinine(value: number, unit: Unit): { mgdl: number; umol: number } {
  if (!Number.isFinite(value)) return { mgdl: NaN as any, umol: NaN as any };
  return unit === "mg/dL"
    ? { mgdl: value, umol: mgdlToUmol(value) }
    : { mgdl: umolToMgdl(value), umol: value };
}

// --- Scoring Logic ---
function purkPoints({
  creatinine72h_mgdl,
  failureToThrive,
  highGradeVUR,
  renalDysplasia,
}: {
  creatinine72h_mgdl: number | null;
  failureToThrive: boolean;
  highGradeVUR: boolean;
  renalDysplasia: boolean;
}) {
  let score = 0;
  if (creatinine72h_mgdl != null) {
    const umol = mgdlToUmol(creatinine72h_mgdl);
    if (umol > 150) score += 2; // >150 µmol/L
  }
  if (failureToThrive) score += 2;
  if (highGradeVUR) score += 1;
  if (renalDysplasia) score += 1;
  return score;
}

function purkRiskGroup(score: number): "Low" | "Intermediate" | "High" {
  if (score >= 4) return "High";
  if (score >= 2) return "Intermediate";
  return "Low";
}

function scn1RiskGroup(scn1_mgdl: number | null): "Low" | "Intermediate" | "High" | null {
  if (scn1_mgdl == null || !Number.isFinite(scn1_mgdl)) return null;
  if (scn1_mgdl >= 1.0) return "High";
  if (scn1_mgdl >= 0.4) return "Intermediate";
  if (scn1_mgdl >= 0) return "Low";
  return null;
}

function purkPlusRisk(purk: "Low" | "Intermediate" | "High", scn1: "Low" | "Intermediate" | "High" | null):
  | "Low"
  | "Intermediate"
  | "High"
  | null {
  if (!scn1) return null; // only defined once SCN1 available at ~1 year
  const table: Record<string, Record<string, "Low" | "Intermediate" | "High">> = {
    Low: { Low: "Low", Intermediate: "Intermediate", High: "High" },
    Intermediate: { Low: "Low", Intermediate: "Intermediate", High: "High" },
    High: { Low: "Intermediate", Intermediate: "High", High: "High" },
  };
  return table[purk][scn1];
}

// --- UI components ---
function Section({ title, children, subtitle }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl shadow p-6 bg-white border border-gray-100">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Calculator className="w-5 h-5" /> {title}
      </h2>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function LabeledToggle({ label, checked, onChange, help }:
  { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer">
      <input
        type="checkbox"
        className="mt-1 w-5 h-5 rounded"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <div className="font-medium">{label}</div>
        {help && <div className="text-xs text-gray-500">{help}</div>}
      </div>
    </label>
  );
}

function NumberWithUnit({
  label,
  value,
  unit,
  onValue,
  onUnit,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  unit: Unit;
  onValue: (n: number | undefined) => void;
  onUnit: (u: Unit) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid grid-cols-5 items-end gap-3">
      <div className="col-span-3">
        <label className="text-sm font-medium">{label}</label>
        <input
          type="number"
          step="any"
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={value ?? ""}
          onChange={(e) => onValue(e.target.value === "" ? undefined : Number(e.target.value))}
          placeholder={placeholder}
        />
      </div>
      <div className="col-span-2">
        <label className="text-sm font-medium">Unit</label>
        <select
          className="mt-1 w-full rounded-xl border px-3 py-2 bg-white"
          value={unit}
          onChange={(e) => onUnit(e.target.value as Unit)}
        >
          <option>mg/dL</option>
          <option>µmol/L</option>
        </select>
      </div>
    </div>
  );
}

function Badge({ children, tone = "slate" }:
  { children: React.ReactNode; tone?: "green" | "yellow" | "red" | "slate" }) {
  const toneMap: Record<string, string> = {
    green: "bg-green-50 text-green-700 ring-green-200",
    yellow: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm ring-1 ${toneMap[tone]}`}>
      {children}
    </span>
  );
}

function RiskBadge({ level }:
  { level: "Low" | "Intermediate" | "High" | null }) {
  if (!level) return <Badge>—</Badge>;
  const tone = level === "Low" ? "green" : level === "Intermediate" ? "yellow" : "red";
  return <Badge tone={tone}>{level}</Badge>;
}

// --- Main component ---
export default function RiskCalculator() {
  // PURK inputs
  const [cr72h, setCr72h] = useState<number | undefined>();
  const [cr72hUnit, setCr72hUnit] = useState<Unit>("mg/dL");
  const [ftt, setFtt] = useState(false);
  const [vur, setVur] = useState(false);
  const [dysplasia, setDysplasia] = useState(false);

  // SCN1 input (1-year nadir)
  const [scn1, setScn1] = useState<number | undefined>();
  const [scn1Unit, setScn1Unit] = useState<Unit>("mg/dL");

  const cr72hNorm = useMemo(() => (cr72h == null ? null : normalizeCreatinine(cr72h, cr72hUnit)), [cr72h, cr72hUnit]);
  const scn1Norm = useMemo(() => (scn1 == null ? null : normalizeCreatinine(scn1, scn1Unit)), [scn1, scn1Unit]);

  const purkScore = useMemo(() =>
    purkPoints({
      creatinine72h_mgdl: cr72hNorm?.mgdl ?? null,
      failureToThrive: ftt,
      highGradeVUR: vur,
      renalDysplasia: dysplasia,
    }),
  [cr72hNorm, ftt, vur, dysplasia]);

  const purkGroup = useMemo(() => purkRiskGroup(purkScore), [purkScore]);
  const scn1Group = useMemo(() => scn1RiskGroup(scn1Norm?.mgdl ?? null), [scn1Norm]);
  const purkPlus = useMemo(() => purkPlusRisk(purkGroup, scn1Group), [purkGroup, scn1Group]);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PURK + SCN1 (PURK+) Risk Calculator</h1>
        <div className="text-sm text-gray-500">For clinical decision support (not a substitute for clinical judgment)</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PURK section */}
        <Section
          title="Initial presentation: Calculate PURK"
          subtitle="Enter variables available at initial presentation (creatinine >72h after birth)."
        >
          <div className="space-y-4">
            <NumberWithUnit
              label=">72h serum creatinine"
              value={cr72h}
              unit={cr72hUnit}
              onValue={setCr72h}
              onUnit={setCr72hUnit}
              placeholder="e.g., 1.2"
            />
            <LabeledToggle label="Failure to thrive" checked={ftt} onChange={setFtt} />
            <LabeledToggle label="High-grade VUR on VCUG" checked={vur} onChange={setVur} />
            <LabeledToggle label="Renal dysplasia on ultrasound" checked={dysplasia} onChange={setDysplasia} />

            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-gray-500">PURK score</div>
                <div className="text-3xl font-bold">{purkScore}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-gray-500">PURK risk group</div>
                <div className="mt-1"><RiskBadge level={purkGroup} /></div>
              </div>
            </div>
          </div>
        </Section>

        {/* SCN1 section */}
        <Section
          title="At ~1 year: Enter SCN1"
          subtitle="Enter the serum creatinine nadir within the first year of life."
        >
          <div className="space-y-4">
            <NumberWithUnit
              label="SCN1 (nadir creatinine in first year)"
              value={scn1}
              unit={scn1Unit}
              onValue={setScn1}
              onUnit={setScn1Unit}
              placeholder="e.g., 0.35"
            />

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-gray-500">SCN1 risk group</div>
              <div className="mt-1"><RiskBadge level={scn1Group} /></div>
            </div>

            <div className="text-xs text-gray-500 flex gap-2 items-start">
              <Info className="w-4 h-4 mt-0.5" />
              <span>
                SCN1 groups: Low &lt;0.4 mg/dL (&lt;35 µmol/L), Intermediate 0.4–0.99 mg/dL (35–88 µmol/L), High ≥1.0 mg/dL (≥88 µmol/L).
              </span>
            </div>
          </div>
        </Section>
      </div>

      {/* Combined result */}
      <Section title="Combined PURK+ risk (matrix)">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-sm text-gray-500">PURK group</div>
            <div className="mt-1"><RiskBadge level={purkGroup} /></div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-sm text-gray-500">SCN1 group</div>
            <div className="mt-1"><RiskBadge level={scn1Group} /></div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-sm text-gray-500">PURK+ group</div>
            <div className="mt-1"><RiskBadge level={purkPlus} /></div>
          </div>
        </div>

        {!scn1Group && (
          <div className="mt-4 flex items-start gap-2 text-sm text-gray-700">
            <AlertCircle className="w-5 h-5" />
            Enter SCN1 to calculate the combined PURK+ risk.
          </div>
        )}

        <div className="mt-6">
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Show PURK+ matrix</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-[480px] text-sm border">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-2 border" colSpan={2}></th>
                    <th className="p-2 border text-left">PURK Low</th>
                    <th className="p-2 border text-left">PURK Intermediate</th>
                    <th className="p-2 border text-left">PURK High</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    { s: "Low", row: ["Low", "Low", "Intermediate"] },
                    { s: "Intermediate", row: ["Intermediate", "Intermediate", "High"] },
                    { s: "High", row: ["High", "High", "High"] },
                  ] as const).map((r) => (
                    <tr key={r.s}>
                      <td className="p-2 border bg-slate-50 font-medium" rowSpan={1}>SCN1</td>
                      <td className="p-2 border bg-slate-50">{r.s}</td>
                      {r.row.map((cell) => (
                        <td className="p-2 border" key={cell}>
                          <RiskBadge level={cell as any} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </Section>

      <Section title="How to deploy on Vercel" subtitle="Quick start for a minimal Next.js app">
        <ol className="list-decimal ml-6 space-y-2 text-sm">
          <li>
            Create a Next.js app: <code className="px-1 rounded bg-slate-100">npx create-next-app@latest purk-calculator --ts --eslint --tailwind --app</code>
          </li>
          <li>
            Replace <code>app/page.tsx</code> with this component (ensure it's the default export). Optionally move the component to <code>components/RiskCalculator.tsx</code> and import it in <code>app/page.tsx</code>.
          </li>
          <li>
            Run locally: <code className="px-1 rounded bg-slate-100">npm run dev</code> and open <code>http://localhost:3000</code>.
          </li>
          <li>
            Push to GitHub, then import the repo at vercel.com → “New Project” → select the repo → Deploy. Defaults are fine.
          </li>
          <li>
            (Optional) Add analytics or a print-to-PDF button for clinic charts. Keep PHI out of the URL and logs.
          </li>
        </ol>
      </Section>

      <footer className="text-xs text-gray-500">
        This tool aids risk stratification using the PURK variables and 1-year SCN1. It doesn’t replace clinical judgment.
      </footer>
    </div>
  );
}
