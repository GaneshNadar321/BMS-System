"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Microscope, Box, Ruler, Weight, Layers, Package } from "lucide-react";
import { useLabStore } from "@/lib/lab/store";
import { SectionTitle, StatCard, WizardNav } from "./shared";

// 3D viewers — client-only (WebGL), code-split out of the main bundle
const CellViewer3D = dynamic(() => import("./cell-3d").then((m) => m.CellViewer3D), {
  ssr: false,
  loading: () => <div className="h-[340px] rounded-lg border bg-slate-100 dark:bg-slate-900 animate-pulse" />,
});
const PackViewer3D = dynamic(() => import("./pack-3d"), {
  ssr: false,
  loading: () => <div className="h-[360px] rounded-lg border bg-slate-100 dark:bg-slate-900 animate-pulse" />,
});

// Mechanical modeling only — how the cell and the finished pack are BUILT:
// geometry, materials and pack layout in interactive 3D. The electrical
// behaviour (2RC ECM) is simulated in the Simulation tab.
export function ModelTab() {
  const { design, pack } = useLabStore();
  const [view3d, setView3d] = useState<"cell" | "pack">("cell");

  const isPouch = /pouch|prismatic|blade/i.test(design.formFactor || "");
  const dims =
    isPouch
      ? `${design.widthMm || "?"} × ${design.heightMm || "?"} × ${design.thicknessMm || "?"} mm`
      : `⌀ ${design.diameterMm || "?"} × ${design.lengthMm || "?"} mm`;
  const packMass = design.massKg > 0 ? design.massKg * pack.series * pack.parallel : 0;
  const packWh = design.nominalV * pack.series * design.capacityAh * pack.parallel;
  const gravimetric = packMass > 0 && packWh > 0 ? (packWh / packMass).toFixed(0) : null;

  return (
    <div className="space-y-6">
      <SectionTitle
        icon={<Microscope className="h-5 w-5" />}
        title="3 · Mechanical Modeling"
        desc="How your battery is built — cell construction and the finished pack in interactive 3D. Electrical behaviour is modelled in Simulation."
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

      {/* Mechanical specification strip */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <Ruler className="h-4 w-4 text-primary" /> Mechanical specification
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Form factor"
            value={design.formFactor || "—"}
            hint={<span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" />{design.chemistry || ""}{design.cathode ? ` · ${design.cathode}` : ""}</span>}
          />
          <StatCard label="Cell dimensions" value={dims} hint={isPouch ? "W × H × T" : "diameter × length"} />
          <StatCard
            label="Cell mass"
            value={design.massKg > 0 ? <>{(design.massKg * 1000).toFixed(0)}<span className="text-[11px] text-muted-foreground ml-0.5">g</span></> : "—"}
            hint={<span className="inline-flex items-center gap-1"><Weight className="h-3 w-3" />single cell</span>}
          />
          <StatCard
            label="Pack cells"
            value={pack.series * pack.parallel}
            unit="cells"
            hint={`${pack.series}S × ${pack.parallel}P groups`}
          />
          <StatCard
            label="Pack cell mass"
            value={packMass > 0 ? <>{packMass.toFixed(2)}<span className="text-[11px] text-muted-foreground ml-0.5">kg</span></> : "—"}
            hint="cells only, no enclosure"
          />
          <StatCard
            label="Energy density"
            value={gravimetric ? <>{gravimetric}<span className="text-[11px] text-muted-foreground ml-0.5">Wh/kg</span></> : "—"}
            hint={`${packWh.toFixed(0)} Wh pack · cells`}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" /> materials: {design.cathode || "—"} cathode · {design.anode || "—"} anode{design.separator ? ` · ${design.separator} separator` : ""}</span>
          <span className="ml-auto">drag the 3D view to orbit · scroll to zoom</span>
        </div>
      </div>

      {/* Wizard: Modeling → Simulation */}
      <WizardNav
        step={2}
        summary={
          <>{pack.series}S{pack.parallel}P mechanical layout carried into Simulation</>
        }
      />
    </div>
  );
}
