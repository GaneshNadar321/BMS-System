"use client";

import { create } from "zustand";
import {
  blankDesign, designIssues,
  type CellDesign, type PackConfig, type SimParams, type SimPoint,
  type RunSummary, type SafetyCheck, type CustomSegment, type Chemistry,
} from "./engine";
import { cellToDesign, type LibraryCell } from "./library";

export interface SimResponse {
  series: SimPoint[];
  summary: RunSummary;
  checks: SafetyCheck[];
  runId?: string;
}

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

// Pack state = electrical configuration + the design targets that size it.
// targetV/targetAh are set in the Design tab and pre-load S×P in Connection.
export interface PackUIState extends PackConfig {
  targetV: number;
  targetAh: number;
}

export const blankPack = (): PackUIState => ({ series: 1, parallel: 1, targetV: 0, targetAh: 0 });

// Keys the AI is allowed to patch via its __apply suggestion
export const AI_DESIGN_KEYS = [
  "name", "brand", "model", "chemistry", "formFactor", "cathode", "anode",
  "separator", "electrolyte", "application", "sourceRef",
  "capacityAh", "nominalV", "vmax", "vmin",
  "r0", "r1", "c1", "r2", "c2",
  "maxDischargeC", "maxPulseDischargeC", "maxChargeC", "stdChargeC",
  "diameterMm", "lengthMm", "widthMm", "heightMm", "thicknessMm",
  "massKg", "cpJkgK", "areaM2", "entropicVperK",
  "cycleLifeCycles", "cycleLifeNote",
  "chargeTempMinC", "chargeTempMaxC", "dischargeTempMinC", "dischargeTempMaxC",
  "selfDischargePctMonth",
] as const;

const NUM_KEYS = new Set([
  "capacityAh", "nominalV", "vmax", "vmin", "r0", "r1", "c1", "r2", "c2",
  "maxDischargeC", "maxPulseDischargeC", "maxChargeC", "stdChargeC",
  "diameterMm", "lengthMm", "widthMm", "heightMm", "thicknessMm",
  "massKg", "cpJkgK", "areaM2", "entropicVperK",
  "cycleLifeCycles",
  "chargeTempMinC", "chargeTempMaxC", "dischargeTempMinC", "dischargeTempMaxC",
  "selfDischargePctMonth",
]);
const STRING_KEYS = new Set([
  "brand", "model", "formFactor", "cathode", "anode", "separator",
  "electrolyte", "application", "sourceRef", "cycleLifeNote",
]);
const CHEMS: Chemistry[] = ["NMC", "LFP", "LTO", "LCO", "NCA", "LeadAcid", "NiMH", "NiCd"];

export function sanitizeAiPatch(raw: unknown): {
  design?: Partial<CellDesign>;
  pack?: Partial<PackConfig>;
} {
  const out: { design?: Partial<CellDesign>; pack?: Partial<PackConfig> } = {};
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;
  const inner = (obj.__apply ?? obj) as Record<string, unknown>;

  if (inner.design && typeof inner.design === "object") {
    const d: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(inner.design as Record<string, unknown>)) {
      if (!(AI_DESIGN_KEYS as readonly string[]).includes(k)) continue;
      if (k === "name") {
        if (typeof v === "string" && v.trim()) d.name = v.trim().slice(0, 60);
      } else if (k === "chemistry") {
        if (typeof v === "string" && CHEMS.includes(v.toUpperCase() as Chemistry)) d.chemistry = v.toUpperCase();
      } else if (STRING_KEYS.has(k)) {
        if (typeof v === "string") d[k] = v.slice(0, 200);
      } else {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        if (Number.isFinite(n) && n >= 0) d[k] = n;
      }
    }
    if (Object.keys(d).length > 0) out.design = d as Partial<CellDesign>;
  }

  if (inner.pack && typeof inner.pack === "object") {
    const p: Record<string, unknown> = {};
    for (const k of ["series", "parallel"] as const) {
      const n = (inner.pack as Record<string, unknown>)[k];
      const num = typeof n === "number" ? n : parseFloat(String(n));
      if (Number.isFinite(num)) {
        p[k] = Math.max(1, Math.round(Math.min(k === "series" ? 200 : 50, num)));
      }
    }
    if (Object.keys(p).length > 0) out.pack = p as Partial<PackConfig>;
  }
  return out;
}

// Extract the last parsable ```json {"__apply": ...}``` block from an AI reply
export function extractApplyPatch(content: string): { patch: ReturnType<typeof sanitizeAiPatch>; stripped: string } | null {
  const re = /```(?:json)?\s*([\s\S]*?)```/g;
  let last: { json: string; index: number; end: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) last = { json: m[1], index: m.index, end: m.index + m[0].length };
  if (!last) return null;
  try {
    const parsed = JSON.parse(last.json.trim());
    const patch = sanitizeAiPatch(parsed);
    if (!patch.design && !patch.pack) return null;
    const stripped = (content.slice(0, last.index) + content.slice(last.end)).replace(/\n{3,}/g, "\n\n").trim();
    return { patch, stripped };
  } catch {
    return null;
  }
}

export const defaultSimParams: SimParams = {
  profile: "discharge",
  cRate: 1,
  durationS: 3600,
  ambientC: 25,
  hConv: 10,
  socStart: 1,
  coolingOn: false,
  customSegments: [] as CustomSegment[],
};

interface LabState {
  design: CellDesign;
  pack: PackUIState;
  simParams: SimParams;
  lastResult: SimResponse | null;
  running: boolean;
  activeTab: string;
  // Schematic build progress on the Connection tab: stage 0–3 and the S×P it
  // was built for. Derived stage resets to 0 whenever S×P no longer matches.
  build: { stage: number; s: number; p: number };
  // Workflow steps the user has already opened (drives nav checkmarks).
  visitedSteps: string[];

  copilotOpen: boolean;
  copilotMessages: CopilotMessage[];
  copilotBusy: boolean;

  setActiveTab: (t: string) => void;
  setBuildStage: (v: number) => void;
  updateDesign: (patch: Partial<CellDesign>) => void;
  resetDesign: () => void;
  loadLibraryCell: (cell: LibraryCell) => void;
  setPack: (patch: Partial<PackUIState>) => void;
  setSimParams: (patch: Partial<SimParams>) => void;
  setRunning: (r: boolean) => void;
  setLastResult: (r: SimResponse | null) => void;

  setCopilotOpen: (v: boolean) => void;
  sendCopilotMessage: (content: string) => Promise<void>;
  clearCopilot: () => void;
  applyAiPatch: (patch: { design?: Partial<CellDesign>; pack?: Partial<PackConfig> }) => void;
}

export const useLabStore = create<LabState>((set, get) => ({
  design: blankDesign(),
  pack: blankPack(),
  simParams: defaultSimParams,
  lastResult: null,
  running: false,
  activeTab: "design",
  build: { stage: 0, s: 1, p: 1 },
  visitedSteps: ["design"],

  copilotOpen: false,
  copilotMessages: [],
  copilotBusy: false,

  setActiveTab: (t) =>
    set((s) => ({
      activeTab: t,
      visitedSteps: s.visitedSteps.includes(t) ? s.visitedSteps : [...s.visitedSteps, t],
    })),
  setBuildStage: (v) =>
    set((s) => ({ build: { stage: v, s: s.pack.series, p: s.pack.parallel } })),
  updateDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),
  resetDesign: () =>
    set({ design: blankDesign(), pack: blankPack(), build: { stage: 0, s: 1, p: 1 }, lastResult: null }),
  // Load a real datasheet cell as the user's EDITABLE starting point:
  // the design stays theirs — every loaded value can be changed after.
  loadLibraryCell: (cell) =>
    set((s) => ({
      design: { ...blankDesign(), ...cellToDesign(cell) },
      pack: blankPack(),
      build: { stage: 0, s: 1, p: 1 },
      lastResult: null,
      activeTab: s.activeTab,
    })),
  setPack: (patch) => set((s) => ({ pack: { ...s.pack, ...patch } })),
  setSimParams: (patch) => set((s) => ({ simParams: { ...s.simParams, ...patch } })),
  setRunning: (r) => set({ running: r }),
  setLastResult: (r) => set({ lastResult: r }),

  setCopilotOpen: (v) => set({ copilotOpen: v }),

  sendCopilotMessage: async (content) => {
    const trimmed = content.trim();
    if (!trimmed || get().copilotBusy) return;
    const messages: CopilotMessage[] = [...get().copilotMessages, { role: "user", content: trimmed }];
    set({ copilotMessages: messages, copilotBusy: true, copilotOpen: true });

    const st = get();
    const context = {
      activeTab: st.activeTab,
      design: st.design,
      designIssues: designIssues(st.design),
      pack: st.pack,
      simParams: {
        profile: st.simParams.profile,
        cRate: st.simParams.cRate,
        durationS: st.simParams.durationS,
        ambientC: st.simParams.ambientC,
        hConv: st.simParams.hConv,
        socStart: st.simParams.socStart,
        coolingOn: st.simParams.coolingOn,
        customSegmentCount: st.simParams.customSegments.length,
      },
      lastResult: st.lastResult
        ? { summary: st.lastResult.summary, checks: st.lastResult.checks }
        : null,
    };

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.slice(-14).map((m) => ({ role: m.role, content: m.content })),
          context,
        }),
      });
      const data = await res.json();
      const reply = res.ok && data.reply
        ? String(data.reply)
        : "I could not reach the AI service just now. Please try again in a moment.";
      set((s) => ({
        copilotMessages: [...s.copilotMessages, { role: "assistant", content: reply }],
        copilotBusy: false,
      }));
    } catch {
      set((s) => ({
        copilotMessages: [
          ...s.copilotMessages,
          { role: "assistant", content: "Network error — I could not reach the AI service. Please try again." },
        ],
        copilotBusy: false,
      }));
    }
  },

  clearCopilot: () => set({ copilotMessages: [] }),

  applyAiPatch: (patch) => {
    if (patch.design) set((s) => ({ design: { ...s.design, ...patch.design } }));
    if (patch.pack) set((s) => ({ pack: { ...s.pack, ...patch.pack } }));
  },
}));
