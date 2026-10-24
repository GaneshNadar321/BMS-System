"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Microscope, Box } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { useLabStore } from "@/lib/lab/store";
import { ocvCurve, ocvScaleOf } from "@/lib/lab/engine";
import { SectionTitle, ChartCard, CHART_COLORS, WizardNav } from "./shared";

// 3D viewers — client-only (WebGL), code-split out of the main bundle
const CellViewer3D = dynamic(() => import("./cell-3d").then((m) => m.CellViewer3D), {
  ssr: false,
  loading: () => <div className="h-[340px] rounded-lg border bg-slate-100 animate-pulse" />,
});
const PackViewer3D = dynamic(() => import("./pack-3d"), {
  ssr: false,
  loading: () => <div className="h-[360px] rounded-lg border bg-slate-100 animate-pulse" />,
});

export function ModelTab() {
  const { design, updateDesign, pack } = useLabStore();
  const [view3d, setView3d] = useState<"cell" | "pack">("cell");

  // cheap scalar — no memo needed
  const ocvScale = ocvScaleOf(design);
  const ocvData = useMemo(() => ocvCurve(design.chemistry, ocvScale), [design.chemistry, ocvScale]);
  const tau1 = design.r1 * design.c1;
  const tau2 = design.r2 * design.c2;
  const zKhz = Math.sqrt(design.r0 * design.r0 + design.r1 * design.r1); // crude HF impedance proxy

  return (
    <div className="space-y-6">
      <SectionTitle
        icon={<Microscope className="h-5 w-5" />}
        title="3 · Battery Modeling"
        desc="2RC Thevenin equivalent circuit — V = OCV(SOC) − I·R₀ − V_C1 − V_C2. Every parameter is editable."
      />

      {/* 3D model — single cell or the finished pack */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Box className="h-4 w-4 text-primary" /> 3D {view3d === "cell" ? "cell" : "pack"} model — interactive
            </CardTitle>
            <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-0.5" role="group" aria-label="3D view">
              {(["cell", "pack"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setView3d(m)}
                  className={`rounded px-3 py-1 text-[11px] font-semibold capitalize transition-colors ${
                    view3d === m ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "cell" ? "Cell" : "Full pack"}
                </button>
              ))}
            </div>
          </div>
          <CardDescription>
            {view3d === "cell"
              ? `Geometry from your design (${design.formFactor || "cylindrical"}) · cutaway shows the jelly roll · Li⁺ shuttle animates charge / discharge`
              : `Your finished battery: ${pack.series} group${pack.series === 1 ? "" : "s"} in series × ${pack.parallel} cell${pack.parallel === 1 ? "" : "s"} in parallel with busbars, BMS and enclosure — exactly as configured in Connection`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {view3d === "cell" ? <CellViewer3D design={design} /> : <PackViewer3D design={design} series={pack.series} parallel={pack.parallel} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Circuit diagram (SVG) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Model topology</CardTitle>
            <CardDescription>One node per branch · Euler integration, Δt = 1 s</CardDescription>
          </CardHeader>
          <CardContent>
            <svg viewBox="0 0 560 220" className="w-full" role="img" aria-label="2RC equivalent circuit diagram">
              {/* wires */}
              <line x1="40" y1="60" x2="110" y2="60" stroke="#334155" strokeWidth="2" />
              <line x1="170" y1="60" x2="230" y2="60" stroke="#334155" strokeWidth="2" />
              <line x1="290" y1="60" x2="330" y2="60" stroke="#334155" strokeWidth="2" />
              <line x1="330" y1="60" x2="330" y2="40" stroke="#334155" strokeWidth="2" />
              <line x1="330" y1="60" x2="330" y2="130" stroke="#334155" strokeWidth="2" />
              <line x1="330" y1="130" x2="470" y2="130" stroke="#334155" strokeWidth="2" />
              <line x1="330" y1="40" x2="470" y2="40" stroke="#334155" strokeWidth="2" />
              <line x1="470" y1="40" x2="470" y2="85" stroke="#334155" strokeWidth="2" />
              <line x1="470" y1="130" x2="470" y2="95" stroke="#334155" strokeWidth="2" />

              {/* R0 resistor */}
              <rect x="110" y="48" width="60" height="24" fill="#eff6ff" stroke="#1e5a96" strokeWidth="2" rx="3" />
              <text x="140" y="64" textAnchor="middle" fontSize="12" fontWeight="700" fill="#174a7c">R₀</text>

              {/* R1 */}
              <rect x="230" y="28" width="60" height="24" fill="#ecfeff" stroke="#0e7490" strokeWidth="2" rx="3" />
              <text x="260" y="44" textAnchor="middle" fontSize="12" fontWeight="700" fill="#155e75">R₁</text>
              {/* C1 */}
              <line x1="245" y1="95" x2="275" y2="95" stroke="#0e7490" strokeWidth="3" />
              <line x1="245" y1="105" x2="275" y2="105" stroke="#0e7490" strokeWidth="3" />
              <line x1="260" y1="52" x2="260" y2="95" stroke="#0e7490" strokeWidth="2" />
              <line x1="260" y1="105" x2="260" y2="130" stroke="#0e7490" strokeWidth="2" />
              <line x1="260" y1="130" x2="330" y2="130" stroke="#334155" strokeWidth="2" />
              <text x="290" y="88" fontSize="11" fontWeight="700" fill="#155e75">C₁</text>

              {/* R2 */}
              <rect x="392" y="28" width="60" height="24" fill="#f1f5f9" stroke="#475569" strokeWidth="2" rx="3" />
              <text x="422" y="44" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">R₂</text>
              <line x1="422" y1="52" x2="422" y2="95" stroke="#475569" strokeWidth="2" />
              <line x1="407" y1="95" x2="437" y2="95" stroke="#475569" strokeWidth="3" />
              <line x1="407" y1="105" x2="437" y2="105" stroke="#475569" strokeWidth="3" />
              <line x1="422" y1="105" x2="422" y2="130" stroke="#475569" strokeWidth="2" />
              <text x="442" y="88" fontSize="11" fontWeight="700" fill="#334155">C₂</text>

              {/* OCV source */}
              <circle cx="40" cy="130" r="22" fill="#eff6ff" stroke="#1e5a96" strokeWidth="2" />
              <text x="40" y="127" textAnchor="middle" fontSize="11" fontWeight="700" fill="#174a7c">OCV</text>
              <text x="40" y="139" textAnchor="middle" fontSize="9" fill="#174a7c">f(SOC)</text>
              <line x1="40" y1="108" x2="40" y2="60" stroke="#334155" strokeWidth="2" />
              <line x1="40" y1="152" x2="40" y2="180" stroke="#334155" strokeWidth="2" />
              <line x1="40" y1="180" x2="470" y2="180" stroke="#334155" strokeWidth="2" />
              <line x1="470" y1="180" x2="470" y2="130" stroke="#334155" strokeWidth="2" />

              {/* terminals */}
              <circle cx="470" cy="40" r="4" fill="#dc2626" />
              <circle cx="470" cy="180" r="4" fill="#334155" />
              <text x="482" y="44" fontSize="12" fontWeight="700" fill="#dc2626">+</text>
              <text x="482" y="184" fontSize="12" fontWeight="700" fill="#334155">−</text>
              <text x="480" y="115" fontSize="11" fill="#334155">V</text>
              {/* current arrow */}
              <line x1="180" y1="185" x2="230" y2="185" stroke="#dc2626" strokeWidth="2" />
              <polygon points="230,181 240,185 230,189" fill="#dc2626" />
              <text x="205" y="202" textAnchor="middle" fontSize="11" fill="#dc2626" fontWeight="700">I (+ discharge)</text>
            </svg>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/60 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">τ₁ polarization</div>
                <div className="font-bold text-sm tabular-nums">{tau1.toFixed(1)} s</div>
              </div>
              <div className="rounded-lg bg-muted/60 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">τ₂ diffusion</div>
                <div className="font-bold text-sm tabular-nums">{tau2.toFixed(0)} s</div>
              </div>
              <div className="rounded-lg bg-muted/60 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">HF impedance ≈</div>
                <div className="font-bold text-sm tabular-nums">{(zKhz * 1000).toFixed(1)} mΩ</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OCV curve */}
        <ChartCard title={`Open-Circuit Voltage vs SOC — ${design.chemistry}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ocvData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="soc" tick={{ fontSize: 11 }} unit="%" />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} unit=" V" />
              <Tooltip formatter={(v: number | string) => [`${v} V`, "OCV"]} labelFormatter={(l) => `SOC ${l}%`} />
              <Legend />
              <Line type="monotone" dataKey="v" name="OCV" stroke={CHART_COLORS.blue} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* RC parameter editing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Model parameters (per cell)</CardTitle>
          <CardDescription>
            From an HPPC pulse test: R₀ from the instantaneous step, R₁/C₁ fast recovery, R₂/C₂ slow tail. Set to 0 for a simple Rint model.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <PField label="R₀ (mΩ)" value={+(design.r0 * 1000).toFixed(2)} onChange={(v) => updateDesign({ r0: v / 1000 })} />
          <PField label="R₁ (mΩ)" value={+(design.r1 * 1000).toFixed(2)} onChange={(v) => updateDesign({ r1: v / 1000 })} />
          <PField label="C₁ (F)" value={design.c1} onChange={(v) => updateDesign({ c1: v })} />
          <PField label="R₂ (mΩ)" value={+(design.r2 * 1000).toFixed(2)} onChange={(v) => updateDesign({ r2: v / 1000 })} />
          <PField label="C₂ (F)" value={design.c2} onChange={(v) => updateDesign({ c2: v })} />
          <div className="col-span-2 md:col-span-5 rounded-lg bg-muted/60 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">State-space: </span>
            SOĊ = −I / (3600·Q) · V̇_C1 = −V_C1/(R₁C₁) + I/C₁ · V̇_C2 = −V_C2/(R₂C₂) + I/C₂ ·
            Q̇ = I²R₀ + V²_C1/R₁ + V²_C2/R₂ + I·T·(dU/dT) − h·A·(T − T<sub>amb</sub>) ·
            Pack: {pack.series}S{pack.parallel}P scales V ×{pack.series}, Ah ×{pack.parallel}.
          </div>
        </CardContent>
      </Card>

      {/* Wizard: Modeling → Simulation carries the cell model parameters */}
      <WizardNav
        step={2}
        summary={
          <>2RC parameters (R₀ {(design.r0 * 1000).toFixed(1)} mΩ) for {pack.series}S{pack.parallel}P carried into Simulation</>
        }
      />
    </div>
  );
}

function PField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        className="mt-1 h-8"
        type="number"
        step="any"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v) && v >= 0) onChange(v);
        }}
      />
    </div>
  );
}
