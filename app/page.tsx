"use client";

import React, { useMemo, useState } from "react";
import { AlertCircle, Calculator, Info, Heart, Activity, TrendingUp } from "lucide-react";

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
function Section({ title, children, subtitle, icon: Icon = Calculator }: { 
  title: string; 
  subtitle?: string; 
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-blue-50/30 shadow-xl border border-blue-100/50 transition-all duration-300 hover:shadow-2xl hover:border-blue-200/50">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {title}
          </h2>
        </div>
        {subtitle && <p className="text-sm text-gray-600 mb-6 pl-11">{subtitle}</p>}
        <div className="pl-11">{children}</div>
      </div>
    </div>
  );
}

function LabeledToggle({ label, checked, onChange, help }:
  { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <label className="group flex items-start gap-4 py-3 cursor-pointer transition-all duration-200 hover:bg-blue-50/50 -mx-4 px-4 rounded-xl">
      <div className="relative mt-1">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
          checked 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-500 scale-105' 
            : 'border-gray-300 bg-white group-hover:border-blue-400'
        }`}>
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-800">{label}</div>
        {help && <div className="text-xs text-gray-500 mt-1">{help}</div>}
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
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="grid grid-cols-5 items-end gap-3">
        <div className="col-span-3">
          <input
            type="number"
            step="any"
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg font-medium transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none bg-gradient-to-r from-white to-blue-50/30"
            value={value ?? ""}
            onChange={(e) => onValue(e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder={placeholder}
          />
        </div>
        <div className="col-span-2">
          <select
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 bg-gradient-to-r from-white to-blue-50/30 font-medium transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none"
            value={unit}
            onChange={(e) => onUnit(e.target.value as Unit)}
          >
            <option>mg/dL</option>
            <option>µmol/L</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, tone = "slate" }:
  { children: React.ReactNode; tone?: "green" | "yellow" | "red" | "slate" }) {
  const toneMap: Record<string, string> = {
    green: "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 ring-emerald-200/50 shadow-emerald-100",
    yellow: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 ring-amber-200/50 shadow-amber-100",
    red: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 ring-red-200/50 shadow-red-100",
    slate: "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700 ring-slate-200/50 shadow-slate-100",
  };
  return (
    <span className={`inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold ring-2 shadow-lg ${toneMap[tone]}`}>
      {children}
    </span>
  );
}

function RiskBadge({ level }:
  { level: "Low" | "Intermediate" | "High" | null }) {
  if (!level) return <Badge>—</Badge>;
  const tone = level === "Low" ? "green" : level === "Intermediate" ? "yellow" : "red";
  return <Badge tone={tone}>{level} Risk</Badge>;
}

function MetricCard({ title, value, subtitle, gradient }: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  gradient?: string;
}) {
  return (
    <div className={`rounded-3xl p-6 ${gradient || 'bg-gradient-to-br from-slate-50 to-blue-50/50'} border border-slate-200/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105`}>
      <div className="text-sm font-semibold text-gray-600 mb-2">{title}</div>
      <div className="flex items-center gap-2">
        {typeof value === 'number' ? (
          <div className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {value}
          </div>
        ) : (
          value
        )}
      </div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="mx-auto max-w-6xl p-6 space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 shadow-2xl">
              <Heart className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-800 via-indigo-700 to-purple-700 bg-clip-text text-transparent mb-2">
            PURK + SCN1 Risk Calculator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Advanced clinical decision support tool for pediatric kidney risk stratification
          </p>
          <div className="mt-4 text-sm text-gray-500 bg-white/50 backdrop-blur rounded-full px-4 py-2 inline-block border border-gray-200/50">
            Not a substitute for clinical judgment
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PURK section */}
          <Section
            title="Initial Presentation Assessment"
            subtitle="Enter variables available at initial presentation (creatinine >72h after birth)"
            icon={Activity}
          >
            <div className="space-y-6">
              <NumberWithUnit
                label="72+ Hour Serum Creatinine"
                value={cr72h}
                unit={cr72hUnit}
                onValue={setCr72h}
                onUnit={setCr72hUnit}
                placeholder="e.g., 1.2"
              />
              
              <div className="space-y-2">
                <LabeledToggle 
                  label="Failure to Thrive" 
                  checked={ftt} 
                  onChange={setFtt}
                  help="Poor weight gain or growth parameters below expected ranges"
                />
                <LabeledToggle 
                  label="High-grade VUR on VCUG" 
                  checked={vur} 
                  onChange={setVur}
                  help="Vesicoureteral reflux grade III, IV, or V on voiding cystourethrogram"
                />
                <LabeledToggle 
                  label="Renal Dysplasia on Ultrasound" 
                  checked={dysplasia} 
                  onChange={setDysplasia}
                  help="Abnormal kidney development visible on ultrasound imaging"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <MetricCard
                  title="PURK Score"
                  value={purkScore}
                  subtitle={`Points: ${purkScore}/6`}
                  gradient="bg-gradient-to-br from-blue-100 to-indigo-100"
                />
                <MetricCard
                  title="PURK Risk Group"
                  value={<RiskBadge level={purkGroup} />}
                  subtitle="Based on scoring criteria"
                />
              </div>
            </div>
          </Section>

          {/* SCN1 section */}
          <Section
            title="One-Year Follow-up"
            subtitle="Enter the serum creatinine nadir within the first year of life"
            icon={TrendingUp}
          >
            <div className="space-y-6">
              <NumberWithUnit
                label="SCN1 (Nadir Creatinine)"
                value={scn1}
                unit={scn1Unit}
                onValue={setScn1}
                onUnit={setScn1Unit}
                placeholder="e.g., 0.35"
              />

              <MetricCard
                title="SCN1 Risk Group"
                value={<RiskBadge level={scn1Group} />}
                subtitle="Based on 1-year nadir creatinine"
                gradient="bg-gradient-to-br from-purple-100 to-pink-100"
              />

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50">
                <div className="flex gap-3 items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <div className="font-semibold mb-1">SCN1 Risk Groups:</div>
                    <div className="space-y-1 text-xs">
                      <div><strong>Low:</strong> &lt;0.4 mg/dL (&lt;35 µmol/L)</div>
                      <div><strong>Intermediate:</strong> 0.4–0.99 mg/dL (35–88 µmol/L)</div>
                      <div><strong>High:</strong> ≥1.0 mg/dL (≥88 µmol/L)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Combined result */}
        <Section title="Combined PURK+ Risk Assessment" subtitle="Matrix-based risk stratification combining PURK and SCN1 scores">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="PURK Risk Group"
              value={<RiskBadge level={purkGroup} />}
              subtitle="From initial presentation"
              gradient="bg-gradient-to-br from-blue-100 to-cyan-100"
            />
            <MetricCard
              title="SCN1 Risk Group"
              value={<RiskBadge level={scn1Group} />}
              subtitle="From 1-year nadir"
              gradient="bg-gradient-to-br from-purple-100 to-pink-100"
            />
            <MetricCard
              title="Final PURK+ Risk"
              value={<RiskBadge level={purkPlus} />}
              subtitle="Combined assessment"
              gradient="bg-gradient-to-br from-emerald-100 to-green-100"
            />
          </div>

          {!scn1Group && (
            <div className="flex items-center gap-3 p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/50">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div className="text-amber-800">
                <div className="font-semibold">SCN1 Required</div>
                <div className="text-sm">Enter the 1-year nadir creatinine (SCN1) to calculate the combined PURK+ risk assessment.</div>
              </div>
            </div>
          )}

          <div className="mt-8">
            <details className="group">
              <summary className="cursor-pointer font-semibold text-gray-700 hover:text-blue-600 transition-colors duration-200 flex items-center gap-2">
                <span>View PURK+ Risk Matrix</span>
                <svg className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-6 overflow-x-auto">
                <div className="min-w-[600px] bg-white rounded-3xl p-6 shadow-xl border border-gray-200/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-100 to-blue-50">
                        <th className="p-4 border-b-2 border-slate-200" colSpan={2}></th>
                        <th className="p-4 border-b-2 border-slate-200 text-left font-bold">PURK Low</th>
                        <th className="p-4 border-b-2 border-slate-200 text-left font-bold">PURK Intermediate</th>
                        <th className="p-4 border-b-2 border-slate-200 text-left font-bold">PURK High</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { s: "Low", row: ["Low", "Low", "Intermediate"] },
                        { s: "Intermediate", row: ["Intermediate", "Intermediate", "High"] },
                        { s: "High", row: ["High", "High", "High"] },
                      ] as const).map((r, idx) => (
                        <tr key={r.s} className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                          <td className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-100 to-blue-50 font-bold" rowSpan={1}>
                            {idx === 1 ? "SCN1" : ""}
                          </td>
                          <td className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-100 to-blue-50 font-semibold">{r.s}</td>
                          {r.row.map((cell, cellIdx) => (
                            <td className="p-4 border-b border-slate-200" key={cellIdx}>
                              <RiskBadge level={cell as any} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </div>
        </Section>

        <footer className="text-center text-sm text-gray-500 bg-white/50 backdrop-blur rounded-3xl p-6 border border-gray-200/50">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="font-semibold">Clinical Decision Support Tool</span>
          </div>
          This calculator aids risk stratification using PURK variables and 1-year SCN1. Always use in conjunction with clinical judgment and institutional protocols.
        </footer>
      </div>
    </div>
  );
}
