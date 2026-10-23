"use client";

import { create } from "zustand";
import { defaultDesign, type CellDesign, type PackConfig, type SimParams, type SimPoint, type RunSummary, type SafetyCheck } from "./engine";

export interface SimResponse {
  series: SimPoint[];
  summary: RunSummary;
  checks: SafetyCheck[];
  runId?: string;
}

interface LabState {
  design: CellDesign;
  pack: PackConfig;
  simParams: SimParams;
  lastResult: SimResponse | null;
  running: boolean;
  activeTab: string;

  setActiveTab: (t: string) => void;
  updateDesign: (patch: Partial<CellDesign>) => void;
  applyPreset: (p: CellDesign) => void;
  setPack: (patch: Partial<PackConfig>) => void;
  setSimParams: (patch: Partial<SimParams>) => void;
  setRunning: (r: boolean) => void;
  setLastResult: (r: SimResponse | null) => void;
}

export const defaultSimParams: SimParams = {
  profile: "discharge",
  cRate: 1,
  durationS: 3600,
  ambientC: 25,
  hConv: 10,
  socStart: 1,
  coolingOn: false,
};

export const useLabStore = create<LabState>((set) => ({
  design: defaultDesign(),
  pack: { series: 13, parallel: 2 },
  simParams: defaultSimParams,
  lastResult: null,
  running: false,
  activeTab: "design",

  setActiveTab: (t) => set({ activeTab: t }),
  updateDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),
  applyPreset: (p) => set({ design: { ...p } }),
  setPack: (patch) => set((s) => ({ pack: { ...s.pack, ...patch } })),
  setSimParams: (patch) => set((s) => ({ simParams: { ...s.simParams, ...patch } })),
  setRunning: (r) => set({ running: r }),
  setLastResult: (r) => set({ lastResult: r }),
}));
