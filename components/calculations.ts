// components/calculations.ts

// ---- Units & helpers ----
export type Unit = "mg/dL" | "µmol/L";
export const UMOL_PER_MGDL = 88.4;

export function mgdlToUmol(mgdl: number): number {
  return mgdl * UMOL_PER_MGDL;
}

export function umolToMgdl(umol: number): number {
  return umol / UMOL_PER_MGDL;
}

export function normalizeCreatinine(
  value: number,
  unit: Unit
): { mgdl: number; umol: number } {
  if (!Number.isFinite(value)) return { mgdl: NaN as any, umol: NaN as any };
  return unit === "mg/dL"
    ? { mgdl: value, umol: mgdlToUmol(value) }
    : { mgdl: umolToMgdl(value), umol: value };
}

// ---- PURK scoring ----
export type PURKInputs = {
  /** Creatinine at >72h after birth, in mg/dL (pass null if unknown) */
  creatinine72h_mgdl: number | null;
  failureToThrive: boolean;
  highGradeVUR: boolean;
  renalDysplasia: boolean;
};

export function calculatePURKScore(inputs: PURKInputs): number {
  let score = 0;

  if (inputs.creatinine72h_mgdl != null && Number.isFinite(inputs.creatinine72h_mgdl)) {
    const umol = mgdlToUmol(inputs.creatinine72h_mgdl);
    if (umol > 150) score += 2; // >150 µmol/L
  }

  if (inputs.failureToThrive) score += 2;
  if (inputs.highGradeVUR) score += 1;
  if (inputs.renalDysplasia) score += 1;

  return score; // ✅ ensure a number is always returned
}

export type RiskGroup = "Low" | "Intermediate" | "High";

export function purkRiskGroup(score: number): RiskGroup {
  if (score >= 4) return "High";
  if (score >= 2) return "Intermediate";
  return "Low";
}

// ---- SCN1 grouping ----
export function scn1RiskGroup(scn1_mgdl: number | null): RiskGroup | null {
  if (scn1_mgdl == null || !Number.isFinite(scn1_mgdl)) return null;
  if (scn1_mgdl >= 1.0) return "High";
  if (scn1_mgdl >= 0.4) return "Intermediate";
  if (scn1_mgdl >= 0) return "Low";
  return null;
}

// ---- Combined PURK+ matrix ----
export function purkPlusRisk(
  purk: RiskGroup,
  scn1: RiskGroup | null
): RiskGroup | null {
  if (!scn1) return null;
  const table: Record<RiskGroup, Record<RiskGroup, RiskGroup>> = {
    Low: { Low: "Low", Intermediate: "Intermediate", High: "High" },
    Intermediate: { Low: "Low", Intermediate: "Intermediate", High: "High" },
    High: { Low: "Intermediate", Intermediate: "High", High: "High" },
  };
  return table[purk][scn1];
}
