"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Network, Minus, Plus } from "lucide-react";
import { useLabStore } from "@/lib/lab/store";
import { packMath } from "@/lib/lab/engine";
import { SectionTitle, StatCard } from "./shared";
import { cn } from "@/lib/utils";

const VOLTAGE_TARGETS = [
  { label: "12 V (low power)", s: 4, p: 1 },
  { label: "24 V (e-bike)", s: 8, p: 2 },
  { label: "48 V (scooter)", s: 15, p: 3 },
  { label: "400 V (EV)", s: 110, p: 4 },
];

export function ConnectionTab() {
  const { design, pack, setPack } = useLabStore();
  const pm = packMath(design, pack);

  return (
    <div className="space-y-6">
      <SectionTitle
        icon={<Network className="h-5 w-5" />}
        title="2 · Pack Connection (Series × Parallel)"
        desc="Connect cells in series to raise voltage and in parallel to raise capacity. The configuration drives pack voltage, energy, resistance and how much current each cell sees during tests."
      />

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Controls */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Configuration</CardTitle>
            <CardDescription>S cells in series × P cells in parallel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Series (S) — voltage multiplier</span>
                <Badge className="bg-emerald-600 text-white border-0 text-sm">{pack.series}S</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => setPack({ series: Math.max(1, pack.series - 1) })} aria-label="Decrease series">
                  <Minus className="h-4 w-4" />
                </Button>
                <Slider
                  value={[pack.series]}
                  min={1}
                  max={200}
                  step={1}
                  onValueChange={([v]) => setPack({ series: v })}
                />
                <Button size="icon" variant="outline" onClick={() => setPack({ series: Math.min(200, pack.series + 1) })} aria-label="Increase series">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Parallel (P) — capacity multiplier</span>
                <Badge className="bg-teal-600 text-white border-0 text-sm">{pack.parallel}P</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => setPack({ parallel: Math.max(1, pack.parallel - 1) })} aria-label="Decrease parallel">
                  <Minus className="h-4 w-4" />
                </Button>
                <Slider
                  value={[pack.parallel]}
                  min={1}
                  max={50}
                  step={1}
                  onValueChange={([v]) => setPack({ parallel: v })}
                />
                <Button size="icon" variant="outline" onClick={() => setPack({ parallel: Math.min(50, pack.parallel + 1) })} aria-label="Increase parallel">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Quick presets</div>
              <div className="grid grid-cols-2 gap-2">
                {VOLTAGE_TARGETS.map((v) => (
                  <Button
                    key={v.label}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-1.5"
                    onClick={() => setPack({ series: v.s, parallel: v.p })}
                  >
                    <span className="text-xs">{v.label}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">{v.s}S{v.p}P</Badge>
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Rules of connection: </span>
              Series multiplies voltage and resistance (V<sub>pack</sub> = S·V<sub>cell</sub>, R = S·R/P).
              Parallel multiplies capacity and divides per-cell current (Ah<sub>pack</sub> = P·Ah<sub>cell</sub>).
              The same 1C test stress is shared by P cells.
            </div>
          </CardContent>
        </Card>

        {/* Visual */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pack Layout — {pack.series}S{pack.parallel}P</CardTitle>
            <CardDescription>{pm.cellCount} cells · each column is a series string, each row a parallel group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-1.5 min-w-max">
                {Array.from({ length: Math.min(pack.series, 40) }).map((_, sIdx) => (
                  <div key={sIdx} className="flex flex-col gap-1.5 items-center">
                    {Array.from({ length: Math.min(pack.parallel, 10) }).map((_, pIdx) => (
                      <div
                        key={pIdx}
                        className={cn(
                          "w-7 h-10 rounded-md border-2 flex items-center justify-center text-[9px] font-bold",
                          "bg-emerald-100 border-emerald-500 text-emerald-800"
                        )}
                        title={`Cell (${sIdx + 1}, ${pIdx + 1})`}
                      >
                        {sIdx + 1}
                      </div>
                    ))}
                    {pack.parallel > 10 && <span className="text-[9px] text-muted-foreground">+{pack.parallel - 10}</span>}
                  </div>
                ))}
                {pack.series > 40 && (
                  <div className="flex items-center px-2 text-xs text-muted-foreground">+{pack.series - 40} more</div>
                )}
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border-2 border-emerald-500 inline-block" /> cell</span>
              <span>Series string: cells {Math.min(pack.series, 40)} of {pack.series} shown per column</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pack KPIs */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Pack electrical summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard label="Nominal V" value={pm.packNominalV} unit="V" />
          <StatCard label="V max" value={pm.packVmax} unit="V" />
          <StatCard label="V min" value={pm.packVmin} unit="V" />
          <StatCard label="Capacity" value={pm.packCapacityAh} unit="Ah" />
          <StatCard label="Energy" value={pm.packEnergyWh} unit="Wh" />
          <StatCard label="R₀ pack" value={pm.r0Pack} unit="Ω" />
          <StatCard label="Mass (est.)" value={pm.packMassKg} unit="kg" />
          <StatCard label="Peak power" value={(pm.maxContPowerW / 1000).toFixed(1)} unit="kW" />
        </div>
      </div>
    </div>
  );
}
