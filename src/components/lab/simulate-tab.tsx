"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Play, Loader2, Activity, Download } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { useLabStore } from "@/lib/lab/store";
import type { Profile } from "@/lib/lab/engine";
import { SectionTitle, StatCard, StatusBadge, ChartCard, CHART_COLORS } from "./shared";
import { seriesToCsv } from "@/lib/lab/engine";

const PROFILES: { id: Profile; label: string; desc: string; socStart: number }[] = [
  { id: "discharge", label: "CC Discharge", desc: "Constant current down to Vmin", socStart: 1 },
  { id: "cccv", label: "CC-CV Charge", desc: "CC up to Vmax, then voltage taper", socStart: 0.15 },
  { id: "hppc", label: "HPPC Pulses", desc: "10 s pulse / rest / regen — impedance test", socStart: 0.9 },
  { id: "drive", label: "Drive Cycle", desc: "Urban profile: cruise / accel / brake", socStart: 0.9 },
];

export function SimulateTab() {
  const { design, pack, simParams, setSimParams, lastResult, setLastResult, running, setRunning } = useLabStore();
  const { toast } = useToast();
  const [runName, setRunName] = useState("");

  const run = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design, pack,
          params: { ...simParams, profile: simParams.profile },
          runName: runName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Simulation failed");
      setLastResult(data);
      toast({ title: "Simulation complete", description: data.summary.cutoff });
    } catch (e) {
      toast({ title: "Simulation error", description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const exportCsv = () => {
    if (!lastResult) return;
    const csv = seriesToCsv(lastResult.series);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation_${simParams.profile}_${simParams.cRate}C.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = lastResult?.summary;
  const series = lastResult?.series ?? [];
  const fmtT = (v: number) => (v >= 3600 ? `${(v / 3600).toFixed(1)} h` : `${Math.round(v / 60)} min`);

  return (
    <div className="space-y-6">
      <SectionTitle
        icon={<Activity className="h-5 w-5" />}
        title="4 · Battery Simulation"
        desc="Run the electro-thermal model with a test profile. Currents scale with your cell capacity; results show cell and pack behaviour over time."
      />

      {/* Profile picker */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => setSimParams({ profile: p.id, socStart: p.socStart })}
            className={`text-left rounded-xl border p-3.5 transition-all hover:shadow-md ${
              simParams.profile === p.id ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" : "bg-card"
            }`}
          >
            <div className="font-semibold text-sm">{p.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{p.desc}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Test conditions</CardTitle>
            <CardDescription>
              {design.name} · {pack.series}S{pack.parallel}P
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">C-rate / pulse size</Label>
                <span className="text-xs font-bold text-emerald-700">{simParams.cRate.toFixed(1)}C</span>
              </div>
              <Slider value={[simParams.cRate]} min={0.1} max={10} step={0.1} onValueChange={([v]) => setSimParams({ cRate: v })} />
              <p className="text-[11px] text-muted-foreground mt-1">
                {simParams.profile === "cccv" ? "CC phase charge current" : simParams.profile === "hppc" ? "2C pulse, 1.5C regen" : `≈ ${(simParams.cRate * design.capacityAh).toFixed(1)} A per cell`}
              </p>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">Start SOC</Label>
                <span className="text-xs font-bold text-emerald-700">{(simParams.socStart * 100).toFixed(0)}%</span>
              </div>
              <Slider value={[simParams.socStart * 100]} min={10} max={100} step={5} onValueChange={([v]) => setSimParams({ socStart: v / 100 })} />
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">Max duration</Label>
                <span className="text-xs font-bold text-emerald-700">{fmtT(simParams.durationS)}</span>
              </div>
              <Slider value={[simParams.durationS]} min={600} max={43200} step={600} onValueChange={([v]) => setSimParams({ durationS: v })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Run name (optional)</Label>
              <Input className="mt-1 h-8" placeholder="e.g. Baseline 1C discharge" value={runName} onChange={(e) => setRunName(e.target.value)} />
            </div>
            <Button onClick={run} disabled={running} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {running ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
              {running ? "Simulating…" : "Run simulation"}
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Result summary</CardTitle>
            <CardDescription>{s ? s.cutoff : "Run a simulation to see results"}</CardDescription>
          </CardHeader>
          <CardContent>
            {s ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <StatCard label="Throughput" value={s.capacityAh} unit="Ah" hint="charge moved" />
                  <StatCard
                    label={simParams.profile === "cccv" ? "Energy in" : "Energy out"}
                    value={Math.abs(s.energyWh).toFixed(1)}
                    unit="Wh"
                  />
                  <StatCard label="Pack energy" value={s.packEnergyWh} unit="Wh" hint={`${pack.series}S${pack.parallel}P`} />
                  <StatCard label="Avg power" value={s.avgPowerW} unit="W" hint={`peak ${s.peakPowerW} W`} />
                  <StatCard label="SOC window" value={`${s.socStart}→${s.socEnd}`} unit="%" />
                  <StatCard label="V cell range" value={`${s.vMin.toFixed(2)}–${s.vMax.toFixed(2)}`} unit="V" />
                  <StatCard label="Peak temp" value={s.tempMaxC} unit="°C" tone={s.tempMaxC > 60 ? "fail" : s.tempMaxC > 45 ? "warn" : "default"} hint={`ΔT +${s.deltaT} K`} />
                  <StatCard label="Heat generated" value={s.heatWh} unit="Wh" />
                  {s.efficiency !== null && <StatCard label="Regen recovery" value={s.efficiency} unit="%" hint="charge vs discharge energy" />}
                  <StatCard label="Test time" value={fmtT(s.durationS)} />
                  <StatCard label="Pack capacity" value={s.packCapacityAh} unit="Ah" />
                  <StatCard label="V end" value={s.vEnd.toFixed(2)} unit="V" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{PROFILES.find((p) => p.id === simParams.profile)?.label}</Badge>
                  <Button size="sm" variant="outline" onClick={exportCsv}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-40 grid place-items-center text-sm text-muted-foreground">
                No results yet — press “Run simulation”.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {series.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="Cell & pack voltage">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} unit=" s" />
                <YAxis yAxisId="v" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <YAxis yAxisId="vp" orientation="right" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip labelFormatter={(l) => `t = ${l} s`} />
                <Legend />
                <ReferenceLine yAxisId="v" y={design.vmin} stroke={CHART_COLORS.red} strokeDasharray="4 4" label={{ value: "Vmin", fontSize: 10 }} />
                {simParams.profile !== "discharge" && (
                  <ReferenceLine yAxisId="v" y={design.vmax} stroke={CHART_COLORS.amber} strokeDasharray="4 4" label={{ value: "Vmax", fontSize: 10 }} />
                )}
                <Line yAxisId="v" type="monotone" dataKey="vCell" name="Cell V" stroke={CHART_COLORS.emerald} dot={false} strokeWidth={2} />
                <Line yAxisId="vp" type="monotone" dataKey="vPack" name={`Pack V (${pack.series}S)`} stroke={CHART_COLORS.teal} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="State of charge">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} unit=" s" />
                <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip labelFormatter={(l) => `t = ${l} s`} />
                <Legend />
                <Line type="monotone" dataKey="soc" name="SOC" stroke={CHART_COLORS.violet} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Current profile">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} unit=" s" />
                <YAxis tick={{ fontSize: 11 }} unit=" A" />
                <Tooltip labelFormatter={(l) => `t = ${l} s`} />
                <Legend />
                <Line type="stepAfter" dataKey="iCell" name="Cell current" stroke={CHART_COLORS.slate} dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Temperature & heat generation">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} unit=" s" />
                <YAxis yAxisId="t" tick={{ fontSize: 11 }} domain={["auto", "auto"]} unit="°C" />
                <YAxis yAxisId="q" orientation="right" tick={{ fontSize: 11 }} unit=" W" />
                <Tooltip labelFormatter={(l) => `t = ${l} s`} />
                <Legend />
                <ReferenceLine yAxisId="t" y={45} stroke={CHART_COLORS.amber} strokeDasharray="4 4" label={{ value: "45°C", fontSize: 10 }} />
                <ReferenceLine yAxisId="t" y={60} stroke={CHART_COLORS.red} strokeDasharray="4 4" label={{ value: "60°C", fontSize: 10 }} />
                <Line yAxisId="t" type="monotone" dataKey="tempC" name="Cell temp" stroke={CHART_COLORS.red} dot={false} strokeWidth={2} />
                <Line yAxisId="q" type="monotone" dataKey="qGen" name="Heat gen" stroke={CHART_COLORS.amber} dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Safety checks */}
      {lastResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Safety & limit checks</CardTitle>
            <CardDescription>Automatic evaluation against cell datasheet limits and thermal thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lastResult.checks.map((c) => (
              <div key={c.label} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.detail}</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
