"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BatteryCharging, Save, Trash2, FolderOpen, Zap, Weight, Gauge } from "lucide-react";
import { useLabStore } from "@/lib/lab/store";
import { CHEM_PRESETS, packMath, type CellDesign } from "@/lib/lab/engine";
import { SectionTitle, StatCard } from "./shared";

interface SavedDesign {
  id: string;
  name: string;
  chemistry: string;
  capacityAh: number;
  vmax: number;
  vmin: number;
  r0: number;
  seriesCount: number;
  parallelCount: number;
  _count: { runs: number };
}

export function DesignTab() {
  const { design, updateDesign, applyPreset, pack } = useLabStore();
  const { toast } = useToast();
  const [saved, setSaved] = useState<SavedDesign[]>([]);
  const [saving, setSaving] = useState(false);

  const loadSaved = async () => {
    try {
      const res = await fetch("/api/designs");
      const data = await res.json();
      if (res.ok) setSaved(data.designs);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const cellWh = design.capacityAh * ((design.vmax + design.vmin) / 2 + 0.05);
  const whKg = design.massKg > 0 ? cellWh / design.massKg : 0;
  const pm = packMath(design, pack);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...design, ...pack }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Design saved", description: `${design.name} is stored in the database.` });
      loadSaved();
    } catch (e) {
      toast({ title: "Save failed", description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const load = (d: SavedDesign) => {
    const loaded: Partial<CellDesign> = {
      name: d.name, chemistry: d.chemistry as CellDesign["chemistry"],
      capacityAh: d.capacityAh, vmax: d.vmax, vmin: d.vmin, r0: d.r0,
    };
    updateDesign(loaded);
    useLabStore.getState().setPack({ series: d.seriesCount, parallel: d.parallelCount });
    toast({ title: "Design loaded", description: d.name });
  };

  const remove = async (id: string) => {
    try {
      await fetch(`/api/designs/${id}`, { method: "DELETE" });
      loadSaved();
      toast({ title: "Design deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        icon={<BatteryCharging className="h-5 w-5" />}
        title="1 · Battery Design"
        desc="Pick a chemistry preset or build a custom cell. These parameters feed the electrical model (ECM), the pack connection, the simulation and the thermal test."
      />

      {/* Chemistry presets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CHEM_PRESETS.map((p) => {
          const active = design.chemistry === p.chemistry && design.capacityAh === p.capacityAh;
          return (
            <button
              key={p.chemistry}
              onClick={() =>
                applyPreset({
                  name: `${p.chemistry} Cell`, chemistry: p.chemistry,
                  capacityAh: p.capacityAh, vmax: p.vmax, vmin: p.vmin,
                  r0: p.r0, r1: p.r1, c1: p.c1, r2: p.r2, c2: p.c2,
                  massKg: p.massKg, cpJkgK: p.cpJkgK, areaM2: p.areaM2,
                  entropicVperK: p.entropicVperK,
                  maxDischargeC: p.maxDischargeC, maxChargeC: p.maxChargeC,
                })
              }
              className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                active ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" : "bg-card"
              }`}
            >
              <div className="font-semibold text-sm">{p.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{p.desc}</div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">{p.nominalV} V</Badge>
                <Badge variant="secondary" className="text-[10px]">{p.capacityAh} Ah</Badge>
                <Badge variant="secondary" className="text-[10px]">{p.maxDischargeC}C</Badge>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Electrical params */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4 text-emerald-600" /> Electrical</CardTitle>
            <CardDescription>Core ratings of the cell</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="dname">Design name</Label>
              <Input id="dname" className="mt-1" value={design.name} onChange={(e) => updateDesign({ name: e.target.value })} />
            </div>
            <NumField label="Capacity (Ah)" value={design.capacityAh} step={0.1} min={0.1} onChange={(v) => updateDesign({ capacityAh: v })} />
            <NumField label="V max (V)" value={design.vmax} step={0.05} min={0.5} onChange={(v) => updateDesign({ vmax: v })} />
            <NumField label="V min (V)" value={design.vmin} step={0.05} min={0.2} onChange={(v) => updateDesign({ vmin: v })} />
            <NumField label="R₀ ohmic (mΩ)" value={design.r0 * 1000} step={0.1} min={0.01} onChange={(v) => updateDesign({ r0: v / 1000 })} />
            <NumField label="Max discharge (C)" value={design.maxDischargeC} step={0.5} min={0.5} onChange={(v) => updateDesign({ maxDischargeC: v })} />
            <NumField label="Max charge (C)" value={design.maxChargeC} step={0.5} min={0.5} onChange={(v) => updateDesign({ maxChargeC: v })} />
          </CardContent>
        </Card>

        {/* Physical params */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Weight className="h-4 w-4 text-emerald-600" /> Physical &amp; Thermal</CardTitle>
            <CardDescription>Used by the thermal test</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <NumField label="Mass (kg)" value={design.massKg} step={0.001} min={0.001} onChange={(v) => updateDesign({ massKg: v })} />
            <NumField label="Cp (J/kg·K)" value={design.cpJkgK} step={10} min={200} onChange={(v) => updateDesign({ cpJkgK: v })} />
            <NumField label="Surface area (m²)" value={design.areaM2} step={0.001} min={0.001} onChange={(v) => updateDesign({ areaM2: v })} />
            <NumField label="dU/dT (mV/K)" value={design.entropicVperK * 1000} step={0.05} onChange={(v) => updateDesign({ entropicVperK: v / 1000 })} />
            <div className="col-span-2 text-xs text-muted-foreground leading-relaxed">
              Cp is the heat capacity, surface area drives convective cooling, dU/dT is the entropic (reversible) heat coefficient used in the Bernardi equation.
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-emerald-600" /> Cell KPIs</CardTitle>
            <CardDescription>Instant engineering figures</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <StatCard label="Cell energy" value={cellWh.toFixed(1)} unit="Wh" />
            <StatCard label="Energy density" value={whKg.toFixed(0)} unit="Wh/kg" />
            <StatCard label="1C current" value={design.capacityAh.toFixed(1)} unit="A" />
            <StatCard label="Voltage window" value={`${design.vmin}–${design.vmax}`} unit="V" />
            <StatCard label="Pack preview" value={`${pm.packEnergyWh}`} unit="Wh" hint={`${pack.series}S${pack.parallel}P`} />
            <StatCard label="Pack spec. energy" value={pm.gravimetricWhKg} unit="Wh/kg" hint="incl. 25% structure" />
          </CardContent>
        </Card>
      </div>

      {/* Save + library */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><FolderOpen className="h-4 w-4 text-emerald-600" /> Design Library</CardTitle>
          <CardDescription>Save this design to the database, then reuse it in later tests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save design"}
            </Button>
          </div>
          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved designs yet — configure the cell above and press Save.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
              {saved.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.chemistry} · {d.capacityAh} Ah · {d.seriesCount}S{d.parallelCount}P · {d._count.runs} test run(s)
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => load(d)}>Load</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(d.id)} aria-label={`Delete ${d.name}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NumField({ label, value, step, min, onChange }: { label: string; value: number; step: number; min?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        className="mt-1 h-8"
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
      />
    </div>
  );
}
