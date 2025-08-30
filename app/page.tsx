"use client";
import { useMemo, useState } from "react";
import {
  calculatePURKScore,
  purkRiskGroup,
  scn1RiskGroup,
  purkPlusRisk,
  normalizeCreatinine,
  type Unit,
} from "@/components/calculations";

const [cr72h, setCr72h] = useState<number | undefined>();
const [cr72hUnit, setCr72hUnit] = useState<Unit>("mg/dL");

const cr72hNorm = useMemo(
  () => (cr72h == null ? null : normalizeCreatinine(cr72h, cr72hUnit)),
  [cr72h, cr72hUnit]
);

const purkScore = useMemo(
  () =>
    calculatePURKScore({
      creatinine72h_mgdl: cr72hNorm?.mgdl ?? null,
      failureToThrive: ftt,
      highGradeVUR: vur,
      renalDysplasia: dysplasia,
    }),
  [cr72hNorm, ftt, vur, dysplasia]
);

const purkGroup = purkRiskGroup(purkScore);
const scn1Group = scn1RiskGroup(scn1Norm?.mgdl ?? null);
const combined = purkPlusRisk(purkGroup, scn1Group);

/**
 * PURK + SCN1 (PURK+) Risk Calculator — v2 (polished UI)
 * - Tailwind-only, no external UI kits.
 * - Professional typography, clear sectioning, better spacing & alignment.
 * - Mobile-first, responsive grid; accessible labels; help text under inputs.
 * - Print-friendly layout (works fine without extra CSS; see notes in README).
 */

// --- Utilities ---
const UMOL_PER_MGDL = 88.4; // creatinine unit conversion
function mgdlToUmol(mgdl: number): number { return mgdl * UMOL_PER_MGDL; }
function umolToMgdl(umol: number): number { return umol / UMOL_PER_MGDL; }

type Unit = "mg/dL" | "µmol/L";
function normalizeCreatinine(value: number, unit: Unit): { mgdl: number; umol: number } {
  if (!Number.isFinite(value)) return { mgdl: NaN as any, umol: NaN as any };
  return unit === "mg/dL" ? { mgdl: value, umol: mgdlToUmol(value) } : { mgdl: umolToMgdl(value), umol: value };
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
  | "Low" | "Intermediate" | "High" | null {
  if (!scn1) return null; // defined once SCN1 available at ~1 year
  const table: Record<string, Record<string, "Low" | "Intermediate" | "High">> = {
    Low: { Low: "Low", Intermediate: "Intermediate", High: "High" },
    Intermediate: { Low: "Low", Intermediate: "Intermediate", High: "High" },
    High: { Low: "Intermediate", Intermediate: "High", High: "High" },
  };
  return table[purk][scn1];
}

// --- Reusable UI primitives ---
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardBody({ children, className = "p-6" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

function Field({ label, help, children }:{ label: string; help?: string; children: React.ReactNode }){
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-800">{label}</label>
      {children}
      {help && <p className="text-xs text-slate-500 leading-relaxed">{help}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type="number" }:{ value: string | number | undefined; onChange:(v:string)=>void; placeholder?:string; type?:string }){
  return (
    <input
      type={type}
      step="any"
      className="w-full rounded-xl border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-300"
      value={value ?? ""}
      onChange={(e)=>onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function Select({ value, onChange, options }:{ value: string; onChange:(v:string)=>void; options: string[] }){
  return (
    <select
      className="w-full rounded-xl border px-3 py-2 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-300"
      value={value}
      onChange={(e)=>onChange(e.target.value)}
    >
      {options.map(o=> <option key={o}>{o}</option>)}
    </select>
  );
}

function Checkbox({ checked, onChange }:{ checked:boolean; onChange:(v:boolean)=>void }){
  return (
    <input type="checkbox" className="h-5 w-5 rounded border" checked={checked} onChange={(e)=>onChange(e.target.checked)} />
  );
}

function Badge({ children, tone = "slate" }:{ children: React.ReactNode; tone?: "green"|"yellow"|"red"|"slate" }){
  const toneMap: Record<string,string> = {
    green: "bg-green-50 text-green-700 ring-green-200",
    yellow: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm ring-1 ${toneMap[tone]}`}>{children}</span>;
}

function RiskBadge({ level }:{ level: "Low" | "Intermediate" | "High" | null }){
  if (!level) return <Badge>—</Badge>;
  const tone = level === "Low" ? "green" : level === "Intermediate" ? "yellow" : "red";
  return <Badge tone={tone}>{level}</Badge>;
}

// --- Main page ---
export default function Page(){
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
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <div className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            <span className="font-semibold">PURK + SCN1 (PURK+)</span>
          </div>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-700 inline-flex items-center gap-2 text-sm">
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </a>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-5 py-8 space-y-6">
        {/* Hero */}
        <Card>
          <CardBody className="p-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">PURK + SCN1 Risk Calculator</h1>
            <p className="mt-2 text-slate-600 text-base md:text-[17px]">
              Clinical decision support for pediatric kidney risk stratification. Calculates PURK at initial presentation and re‑stratifies at ~1 year using SCN1.
            </p>
            <div className="mt-3 text-sm text-slate-500 flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>For clinical support only — not a substitute for clinical judgment.</span>
            </div>
          </CardBody>
        </Card>

        {/* Calculator grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PURK */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold">Initial Presentation: PURK</h2>
              <p className="mt-1 text-sm text-slate-600">Enter variables available at initial presentation (creatinine &gt;72h after birth).</p>

              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-5 gap-3 items-end">
                  <div className="col-span-3">
                    <Field label=">72h Serum Creatinine" help="Enter the first value obtained at &gt;72 hours of life.">
                      <Input value={cr72h} onChange={(v)=>setCr72h(v===""? undefined : Number(v))} placeholder="e.g., 1.2" />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Unit">
                      <Select value={cr72hUnit} onChange={(v)=>setCr72hUnit(v as Unit)} options={["mg/dL","µmol/L"]} />
                    </Field>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={ftt} onChange={setFtt} />
                    <div>
                      <div className="text-sm font-medium">Failure to Thrive</div>
                      <div className="text-xs text-slate-500">Poor weight gain or growth parameters below expected ranges.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox checked={vur} onChange={setVur} />
                    <div>
                      <div className="text-sm font-medium">High‑grade VUR on VCUG</div>
                      <div className="text-xs text-slate-500">Vesicoureteral reflux grade III–V on voiding cystourethrogram.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox checked={dysplasia} onChange={setDysplasia} />
                    <div>
                      <div className="text-sm font-medium">Renal Dysplasia on Ultrasound</div>
                      <div className="text-xs text-slate-500">Abnormal renal development visible on ultrasound imaging.</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-600">PURK score</div>
                    <div className="text-3xl font-bold">{purkScore}</div>
                    <div className="text-xs text-slate-500">Points: 0–6 based on criteria</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-600">PURK risk group</div>
                    <div className="mt-1"><RiskBadge level={purkGroup} /></div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* SCN1 */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold">One‑Year Follow‑up: SCN1</h2>
              <p className="mt-1 text-sm text-slate-600">Enter the serum creatinine nadir within the first year of life.</p>

              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-5 gap-3 items-end">
                  <div className="col-span-3">
                    <Field label="SCN1 (nadir creatinine)" help="Use the lowest value recorded in the first 12 months.">
                      <Input value={scn1} onChange={(v)=>setScn1(v===""? undefined : Number(v))} placeholder="e.g., 0.35" />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Unit">
                      <Select value={scn1Unit} onChange={(v)=>setScn1Unit(v as Unit)} options={["mg/dL","µmol/L"]} />
                    </Field>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-600">SCN1 risk group</div>
                  <div className="mt-1"><RiskBadge level={scn1Group} /></div>
                  <div className="mt-2 text-xs text-slate-500 flex gap-2 items-start">
                    <Info className="w-4 h-4 mt-0.5" />
                    <span>Low &lt;0.4 mg/dL (&lt;35 µmol/L) · Intermediate 0.4–0.99 mg/dL (35–88 µmol/L) · High ≥1.0 mg/dL (≥88 µmol/L).</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Combined result */}
        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold">Combined PURK+ Risk</h2>
            <p className="mt-1 text-sm text-slate-600">SCN1‑weighted matrix using initial PURK group and 1‑year SCN1 group.</p>

            <div className="mt-4 grid md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-600">PURK group</div>
                <div className="mt-1"><RiskBadge level={purkGroup} /></div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-600">SCN1 group</div>
                <div className="mt-1"><RiskBadge level={scn1Group} /></div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-600">PURK+ group</div>
                <div className="mt-1"><RiskBadge level={purkPlus} /></div>
              </div>
            </div>

            {!scn1Group && (
              <div className="mt-4 flex items-start gap-2 text-sm text-slate-700">
                <AlertCircle className="w-5 h-5" />
                Enter SCN1 to calculate the combined PURK+ risk.
              </div>
            )}

            <details className="mt-6 text-sm">
              <summary className="cursor-pointer font-medium">Show PURK+ matrix</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[520px] text-sm border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
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
                        {r.row.map((cell, idx) => (
                          <td className="p-2 border" key={idx}>
                            <RiskBadge level={cell as any} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </CardBody>
        </Card>

        <p className="text-xs text-slate-500">This tool aids risk stratification using the PURK variables and 1‑year SCN1. It doesn’t replace clinical judgment.</p>
      </main>
    </div>
  );
}
