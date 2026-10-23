// ============================================================
// BatteryLab — Physics Engine
// Equivalent Circuit Model (2RC Thevenin) + Bernardi thermal
// + CC discharge / CC-CV charge / HPPC pulse / drive-cycle profiles
// ============================================================

export type Chemistry = "NMC" | "LFP" | "LTO" | "LCO";

export interface CellDesign {
  name: string;
  chemistry: Chemistry;
  capacityAh: number;
  vmax: number;
  vmin: number;
  r0: number; // Ohm
  r1: number; // Ohm
  c1: number; // F
  r2: number; // Ohm
  c2: number; // F
  massKg: number;
  cpJkgK: number;
  areaM2: number;
  entropicVperK: number; // dU/dT V/K
  maxDischargeC: number;
  maxChargeC: number;
}

export interface PackConfig {
  series: number;
  parallel: number;
}

export type Profile = "discharge" | "cccv" | "hppc" | "drive";

export interface SimParams {
  profile: Profile;
  cRate: number;
  durationS: number;
  ambientC: number;
  hConv: number;
  socStart: number; // 0..1
  coolingOn: boolean;
}

export interface SimPoint {
  t: number; // s
  vCell: number;
  vPack: number;
  soc: number; // 0..1
  iCell: number; // A, + = discharge
  tempC: number;
  qGen: number; // W per cell
  ocv: number;
  mode: string;
}

export interface RunSummary {
  capacityAh: number;
  energyWh: number; // net electrical energy out (discharge) or in (charge)
  avgPowerW: number;
  peakPowerW: number;
  vStart: number;
  vEnd: number;
  vMin: number;
  vMax: number;
  socStart: number;
  socEnd: number;
  tempStartC: number;
  tempMaxC: number;
  tempEndC: number;
  deltaT: number;
  heatWh: number;
  cutoff: string;
  durationS: number;
  efficiency: number | null; // discharge/charge energy ratio (HPPC)
  packEnergyWh: number;
  packCapacityAh: number;
}

export interface SafetyCheck {
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

// ------------------------------------------------------------
// OCV–SOC curves (anchor points interpolated linearly)
// ------------------------------------------------------------

const OCV_TABLES: Record<Chemistry, { soc: number; v: number }[]> = {
  NMC: [
    { soc: 0, v: 2.8 }, { soc: 0.02, v: 3.2 }, { soc: 0.05, v: 3.32 },
    { soc: 0.1, v: 3.46 }, { soc: 0.2, v: 3.58 }, { soc: 0.3, v: 3.64 },
    { soc: 0.4, v: 3.70 }, { soc: 0.5, v: 3.76 }, { soc: 0.6, v: 3.83 },
    { soc: 0.7, v: 3.92 }, { soc: 0.8, v: 4.02 }, { soc: 0.9, v: 4.12 },
    { soc: 0.95, v: 4.17 }, { soc: 1, v: 4.21 },
  ],
  LFP: [
    { soc: 0, v: 2.5 }, { soc: 0.02, v: 2.9 }, { soc: 0.05, v: 3.02 },
    { soc: 0.1, v: 3.13 }, { soc: 0.2, v: 3.2 }, { soc: 0.3, v: 3.23 },
    { soc: 0.4, v: 3.25 }, { soc: 0.5, v: 3.26 }, { soc: 0.6, v: 3.27 },
    { soc: 0.7, v: 3.28 }, { soc: 0.8, v: 3.3 }, { soc: 0.9, v: 3.33 },
    { soc: 0.95, v: 3.36 }, { soc: 1, v: 3.45 },
  ],
  LTO: [
    { soc: 0, v: 1.7 }, { soc: 0.05, v: 2.05 }, { soc: 0.1, v: 2.15 },
    { soc: 0.2, v: 2.22 }, { soc: 0.3, v: 2.26 }, { soc: 0.4, v: 2.28 },
    { soc: 0.5, v: 2.3 }, { soc: 0.6, v: 2.32 }, { soc: 0.7, v: 2.34 },
    { soc: 0.8, v: 2.38 }, { soc: 0.9, v: 2.44 }, { soc: 1, v: 2.55 },
  ],
  LCO: [
    { soc: 0, v: 3.0 }, { soc: 0.05, v: 3.4 }, { soc: 0.1, v: 3.55 },
    { soc: 0.2, v: 3.68 }, { soc: 0.3, v: 3.75 }, { soc: 0.4, v: 3.8 },
    { soc: 0.5, v: 3.85 }, { soc: 0.6, v: 3.9 }, { soc: 0.7, v: 3.95 },
    { soc: 0.8, v: 4.02 }, { soc: 0.9, v: 4.1 }, { soc: 1, v: 4.2 },
  ],
};

export function ocvSoc(chem: Chemistry, soc: number): number {
  const table = OCV_TABLES[chem] ?? OCV_TABLES.NMC;
  const s = Math.min(1, Math.max(0, soc));
  for (let i = 1; i < table.length; i++) {
    if (s <= table[i].soc) {
      const a = table[i - 1];
      const b = table[i];
      const f = b.soc === a.soc ? 0 : (s - a.soc) / (b.soc - a.soc);
      return a.v + f * (b.v - a.v);
    }
  }
  return table[table.length - 1].v;
}

export function ocvCurve(chem: Chemistry): { soc: number; v: number }[] {
  const pts: { soc: number; v: number }[] = [];
  for (let s = 0; s <= 100; s += 2) pts.push({ soc: s, v: +(ocvSoc(chem, s / 100)).toFixed(3) });
  return pts;
}

// ------------------------------------------------------------
// Chemistry presets
// ------------------------------------------------------------

export interface ChemPreset {
  chemistry: Chemistry;
  label: string;
  desc: string;
  nominalV: number;
  capacityAh: number;
  vmax: number;
  vmin: number;
  r0: number;
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  massKg: number;
  cpJkgK: number;
  areaM2: number;
  entropicVperK: number;
  maxDischargeC: number;
  maxChargeC: number;
}

export const CHEM_PRESETS: ChemPreset[] = [
  {
    chemistry: "NMC", label: "NMC 21700 (EV)", desc: "High energy, EV traction cell",
    nominalV: 3.65, capacityAh: 4.8, vmax: 4.2, vmin: 2.8,
    r0: 0.018, r1: 0.008, c1: 2400, r2: 0.006, c2: 18000,
    massKg: 0.070, cpJkgK: 1000, areaM2: 0.043, entropicVperK: 0.00015,
    maxDischargeC: 8, maxChargeC: 2,
  },
  {
    chemistry: "LFP", label: "LFP Prismatic (Storage)", desc: "Safe, long cycle life, flat curve",
    nominalV: 3.2, capacityAh: 100, vmax: 3.65, vmin: 2.5,
    r0: 0.0009, r1: 0.0004, c1: 60000, r2: 0.0003, c2: 450000,
    massKg: 1.95, cpJkgK: 1150, areaM2: 0.122, entropicVperK: 0.0001,
    maxDischargeC: 3, maxChargeC: 1,
  },
  {
    chemistry: "LTO", label: "LTO Cell (Power)", desc: "Ultra-fast charge, wide temp",
    nominalV: 2.3, capacityAh: 10, vmax: 2.7, vmin: 1.5,
    r0: 0.0035, r1: 0.0012, c1: 8000, r2: 0.0009, c2: 60000,
    massKg: 0.36, cpJkgK: 900, areaM2: 0.064, entropicVperK: 0.00005,
    maxDischargeC: 10, maxChargeC: 10,
  },
  {
    chemistry: "LCO", label: "LCO Pouch (Consumer)", desc: "Compact consumer electronics",
    nominalV: 3.7, capacityAh: 3.0, vmax: 4.2, vmin: 3.0,
    r0: 0.045, r1: 0.015, c1: 1800, r2: 0.010, c2: 14000,
    massKg: 0.048, cpJkgK: 1050, areaM2: 0.032, entropicVperK: 0.0002,
    maxDischargeC: 2, maxChargeC: 1,
  },
];

export function defaultDesign(): CellDesign {
  const p = CHEM_PRESETS[0];
  return {
    name: "My NMC Cell",
    chemistry: p.chemistry,
    capacityAh: p.capacityAh, vmax: p.vmax, vmin: p.vmin,
    r0: p.r0, r1: p.r1, c1: p.c1, r2: p.r2, c2: p.c2,
    massKg: p.massKg, cpJkgK: p.cpJkgK, areaM2: p.areaM2,
    entropicVperK: p.entropicVperK,
    maxDischargeC: p.maxDischargeC, maxChargeC: p.maxChargeC,
  };
}

// ------------------------------------------------------------
// Pack math
// ------------------------------------------------------------

export interface PackMath {
  packNominalV: number;
  packVmax: number;
  packVmin: number;
  packCapacityAh: number;
  packEnergyWh: number;
  gravimetricWhKg: number;
  r0Pack: number;
  r1Pack: number;
  r2Pack: number;
  cellCount: number;
  packMassKg: number;
  iCellAt1C: number;
  maxContPowerW: number;
}

export function packMath(d: CellDesign, p: PackConfig): PackMath {
  const nomV = (d.vmax + d.vmin) / 2 + 0.05; // approx nominal from window
  const cellCount = p.series * p.parallel;
  const packMassKg = cellCount * d.massKg * 1.25; // 25% structure/BMS overhead
  const r0Pack = (d.r0 * p.series) / p.parallel;
  const iCellAt1C = d.capacityAh;
  return {
    packNominalV: +(nomV * p.series).toFixed(2),
    packVmax: +(d.vmax * p.series).toFixed(2),
    packVmin: +(d.vmin * p.series).toFixed(2),
    packCapacityAh: +(d.capacityAh * p.parallel).toFixed(2),
    packEnergyWh: +(nomV * p.series * d.capacityAh * p.parallel).toFixed(1),
    gravimetricWhKg: +((nomV * d.capacityAh) / (d.massKg * 1.25)).toFixed(0),
    r0Pack: +r0Pack.toFixed(5),
    r1Pack: +((d.r1 * p.series) / p.parallel).toFixed(5),
    r2Pack: +((d.r2 * p.series) / p.parallel).toFixed(5),
    cellCount,
    packMassKg: +packMassKg.toFixed(2),
    iCellAt1C: +iCellAt1C.toFixed(2),
    maxContPowerW: +(nomV * p.series * d.capacityAh * p.parallel * Math.min(d.maxDischargeC, 10)).toFixed(0),
  };
}

// ------------------------------------------------------------
// Current profiles (per cell, A; + = discharge, − = charge)
// ------------------------------------------------------------

interface Segment { until: number | null; current: number; mode: string }

function buildSegments(params: SimParams, d: CellDesign): Segment[] {
  const i1C = d.capacityAh;
  switch (params.profile) {
    case "discharge":
      return [{ until: null, current: params.cRate * i1C, mode: "CC discharge" }];
    case "cccv":
      return [{ until: null, current: -params.cRate * i1C, mode: "CC charge" }];
    case "hppc": {
      const segs: Segment[] = [];
      let t = 0;
      for (let k = 0; k < 10; k++) {
        segs.push({ until: t + 10, current: 2 * i1C, mode: "HPPC discharge pulse" }); t += 10;
        segs.push({ until: t + 40, current: 0, mode: "Rest" }); t += 40;
        segs.push({ until: t + 10, current: -1.5 * i1C, mode: "HPPC regen pulse" }); t += 10;
        segs.push({ until: t + 40, current: 0, mode: "Rest" }); t += 40;
        segs.push({ until: t + 360, current: 1 * i1C, mode: "1C discharge (10% DOD)" }); t += 360;
      }
      segs.push({ until: null, current: 0, mode: "Rest" });
      return segs;
    }
    case "drive": {
      const segs: Segment[] = [];
      let t = 0;
      for (let k = 0; k < 60; k++) {
        segs.push({ until: t + 60, current: 0.35 * i1C, mode: "Cruise" }); t += 60;
        segs.push({ until: t + 20, current: 1.3 * i1C, mode: "Acceleration" }); t += 20;
        segs.push({ until: t + 45, current: 0.5 * i1C, mode: "Cruise" }); t += 45;
        segs.push({ until: t + 15, current: -0.7 * i1C, mode: "Regen braking" }); t += 15;
        segs.push({ until: t + 30, current: 0, mode: "Stop" }); t += 30;
      }
      segs.push({ until: null, current: 0, mode: "Stop" });
      return segs;
    }
  }
}

// ------------------------------------------------------------
// Core simulation (Euler integration)
// ------------------------------------------------------------

export interface SimResult {
  series: SimPoint[];
  summary: RunSummary;
  checks: SafetyCheck[];
}

export function simulate(d: CellDesign, pack: PackConfig, params: SimParams): SimResult {
  const dt = 1; // s
  const T0 = params.ambientC;
  const cooling = params.coolingOn ? params.hConv : 0;

  let soc = Math.min(1, Math.max(0.02, params.socStart));
  let vc1 = 0, vc2 = 0;
  let tempC = T0;
  let t = 0;

  const segments = buildSegments(params, d);
  let segIdx = 0;
  let cvMode = false;

  const series: SimPoint[] = [];
  let capacityAh = 0;
  let energyWh = 0;
  let heatJ = 0;
  let peakPowerW = 0;
  let vMin = Infinity, vMax = -Infinity;
  let tempMaxC = T0;
  let cutoff = "Test duration reached";
  let dischargeWh = 0, chargeWh = 0;

  const maxSteps = 200000;
  const downsampleEvery = 5;

  for (let step = 0; step < maxSteps; step++) {
    if (segIdx < segments.length - 1 && segments[segIdx].until !== null && t >= (segments[segIdx].until as number)) {
      segIdx++;
      cvMode = false;
    }
    let i = segments[segIdx].current;
    let mode = segments[segIdx].mode;

    const ocv = ocvSoc(d.chemistry, soc);
    // terminal voltage with discharge-positive current: V = OCV − I·R0 − Vc1 − Vc2
    const vtPre = ocv - i * d.r0 - vc1 - vc2;
    if (params.profile === "cccv" && !cvMode && vtPre >= d.vmax) {
      cvMode = true;
      mode = "CV charge (taper)";
    }
    if (cvMode) {
      // hold V = vmax → solve ocv − i·r0 − vc1 − vc2 = vmax
      i = (ocv - vc1 - vc2 - d.vmax) / d.r0;
      if (i > 0) i = 0;
      const iTaper = d.capacityAh * 0.05;
      if (Math.abs(i) <= iTaper) {
        i = -iTaper;
        cutoff = "CV taper complete (C/20)";
      }
    }

    const dv1 = (-vc1 / (d.r1 * d.c1) + i / d.c1) * dt;
    const dv2 = (-vc2 / (d.r2 * d.c2) + i / d.c2) * dt;
    // polarization voltage: + during discharge, − during charge (no clamp — sign matters)
    vc1 = vc1 + dv1;
    vc2 = vc2 + dv2;
    soc = soc - (i * dt) / (3600 * d.capacityAh);
    const vCell = ocvSoc(d.chemistry, soc) - i * d.r0 - vc1 - vc2;

    const TK = tempC + 273.15;
    const qJoule = (i * i * d.r0) + (vc1 * vc1) / d.r1 + (vc2 * vc2) / d.r2;
    const qRev = i * TK * d.entropicVperK;
    const qGen = qJoule + qRev;
    const qLoss = cooling * d.areaM2 * (tempC - T0);
    tempC += ((qGen - qLoss) / (d.massKg * d.cpJkgK)) * dt;

    capacityAh += (Math.abs(i) * dt) / 3600;
    const pCell = vCell * i;
    energyWh += (pCell * dt) / 3600;
    heatJ += qGen * dt;
    if (pCell > peakPowerW) peakPowerW = pCell;
    if (i > 0) dischargeWh += (pCell * dt) / 3600;
    if (i < 0) chargeWh += (-pCell * dt) / 3600;
    if (vCell < vMin) vMin = vCell;
    if (vCell > vMax) vMax = vCell;
    if (tempC > tempMaxC) tempMaxC = tempC;

    if (step % downsampleEvery === 0) {
      series.push({
        t: +t.toFixed(1), vCell: +vCell.toFixed(4),
        vPack: +(vCell * pack.series).toFixed(2),
        soc: +(soc * 100).toFixed(2), iCell: +i.toFixed(3),
        tempC: +tempC.toFixed(2), qGen: +qGen.toFixed(2),
        ocv: +ocv.toFixed(4), mode,
      });
    }

    t += dt;

    if (params.profile === "discharge" && vCell <= d.vmin) { cutoff = "Cell voltage hit Vmin"; break; }
    if (params.profile === "discharge" && soc <= 0.01) { cutoff = "SOC depleted (1%)"; break; }
    if (params.profile === "cccv" && cutoff.startsWith("CV taper")) { break; }
    if (params.profile === "cccv" && soc >= 0.999) { cutoff = "Fully charged (100% SOC)"; break; }
    if (params.profile !== "discharge" && params.profile !== "cccv") {
      if (soc <= 0.02) { cutoff = "SOC depleted (2%)"; break; }
      if (vCell <= d.vmin) { cutoff = "Cell voltage hit Vmin"; break; }
    }
    if (t >= params.durationS) { cutoff = "Test duration reached"; break; }
    if (tempC >= 130) { cutoff = "ABORT — thermal runaway onset (130°C)"; break; }
  }

  const trimmed = trimSeries(series, 400);
  const tempEndC = trimmed[trimmed.length - 1]?.tempC ?? T0;

  const summary: RunSummary = {
    capacityAh: +capacityAh.toFixed(3),
    energyWh: +energyWh.toFixed(2),
    avgPowerW: +((energyWh * 3600) / Math.max(1, t)).toFixed(1),
    peakPowerW: +peakPowerW.toFixed(1),
    vStart: trimmed[0]?.vCell ?? 0,
    vEnd: trimmed[trimmed.length - 1]?.vCell ?? 0,
    vMin: +vMin.toFixed(3),
    vMax: +vMax.toFixed(3),
    socStart: +(params.socStart * 100).toFixed(1),
    socEnd: +(soc * 100).toFixed(1),
    tempStartC: T0,
    tempMaxC: +tempMaxC.toFixed(1),
    tempEndC: +tempEndC.toFixed(1),
    deltaT: +(tempMaxC - T0).toFixed(1),
    heatWh: +(heatJ / 3600).toFixed(2),
    cutoff,
    durationS: Math.round(t),
    // regen recovery: energy returned via regen/charge vs energy discharged (HPPC & drive cycles)
    efficiency:
      dischargeWh > 0.05 && chargeWh > 0.05 ? +((chargeWh / dischargeWh) * 100).toFixed(1) : null,
    packEnergyWh: +(Math.abs(energyWh) * pack.series * pack.parallel).toFixed(1),
    packCapacityAh: +(capacityAh * pack.parallel).toFixed(2),
  };

  const checks = safetyChecks(d, pack, params, summary);
  return { series: trimmed, summary, checks };
}

function trimSeries(series: SimPoint[], max: number): SimPoint[] {
  if (series.length <= max) return series;
  const stride = Math.ceil(series.length / max);
  const out: SimPoint[] = [];
  for (let i = 0; i < series.length; i += stride) out.push(series[i]);
  const last = series[series.length - 1];
  if (out[out.length - 1].t !== last.t) out.push(last);
  return out;
}

// ------------------------------------------------------------
// Safety checks
// ------------------------------------------------------------

function safetyChecks(d: CellDesign, pack: PackConfig, params: SimParams, s: RunSummary): SafetyCheck[] {
  const checks: SafetyCheck[] = [];

  if (params.profile === "cccv") {
    checks.push({
      label: "Charge C-rate within limit",
      status: params.cRate <= d.maxChargeC ? "ok" : params.cRate <= d.maxChargeC * 1.5 ? "warn" : "fail",
      detail: `${params.cRate.toFixed(1)}C vs max charge ${d.maxChargeC}C`,
    });
  } else {
    checks.push({
      label: "Discharge C-rate within limit",
      status: params.cRate <= d.maxDischargeC ? "ok" : params.cRate <= d.maxDischargeC * 1.5 ? "warn" : "fail",
      detail: `${params.cRate.toFixed(1)}C vs max discharge ${d.maxDischargeC}C`,
    });
  }

  checks.push({
    label: "Voltage window respected",
    status: s.vMin >= d.vmin - 0.02 && s.vMax <= d.vmax + 0.02 ? "ok" : "warn",
    detail: `V range ${s.vMin.toFixed(2)}–${s.vMax.toFixed(2)} V (cell window ${d.vmin}–${d.vmax} V)`,
  });

  if (s.tempMaxC > 130) {
    checks.push({ label: "Thermal runaway", status: "fail", detail: `Peak ${s.tempMaxC}°C ≥ 130°C onset` });
  } else if (s.tempMaxC > 60) {
    checks.push({ label: "Overtemperature", status: "fail", detail: `Peak ${s.tempMaxC}°C > 60°C discharge limit` });
  } else if (s.tempMaxC > 45) {
    checks.push({
      label: "Temperature high",
      status: "warn",
      detail: `Peak ${s.tempMaxC}°C — above 45°C charging limit, ok for discharge only`,
    });
  } else {
    checks.push({ label: "Temperature in safe band", status: "ok", detail: `Peak ${s.tempMaxC}°C (limit 45/60°C)` });
  }

  if (!params.coolingOn) {
    checks.push({
      label: "Cooling system",
      status: s.deltaT > 15 ? "warn" : "ok",
      detail: "No cooling (adiabatic test)",
    });
  } else {
    checks.push({ label: "Cooling system", status: "ok", detail: `h = ${params.hConv} W/m²K convection` });
  }

  const pm = packMath(d, pack);
  checks.push({
    label: "Pack configuration valid",
    status: pack.series >= 1 && pack.parallel >= 1 ? "ok" : "fail",
    detail: `${pack.series}S${pack.parallel}P — ${pm.cellCount} cells, ${pm.packEnergyWh} Wh, ${pm.packNominalV} V nominal`,
  });

  return checks;
}

// ------------------------------------------------------------
// CSV export helper (client-safe)
// ------------------------------------------------------------

export function seriesToCsv(series: SimPoint[]): string {
  const head = "t_s,v_cell,v_pack,soc_pct,i_cell_A,temp_C,q_gen_W,ocv,mode";
  const rows = series.map((p) =>
    [p.t, p.vCell, p.vPack, p.soc, p.iCell, p.tempC, p.qGen, p.ocv, p.mode].join(",")
  );
  return [head, ...rows].join("\n");
}
