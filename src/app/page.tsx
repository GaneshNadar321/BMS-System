"use client";

import { Battery, ChevronRight, CircleDot } from "lucide-react";
import { useLabStore } from "@/lib/lab/store";
import { DesignTab } from "@/components/lab/design-tab";
import { ConnectionTab } from "@/components/lab/connection-tab";
import { ModelTab } from "@/components/lab/model-tab";
import { SimulateTab } from "@/components/lab/simulate-tab";
import { ThermalTab } from "@/components/lab/thermal-tab";
import { AnalysisTab } from "@/components/lab/analysis-tab";

const STEPS = [
  { id: "design", label: "Design" },
  { id: "connection", label: "Connection" },
  { id: "model", label: "Modeling" },
  { id: "simulate", label: "Simulation" },
  { id: "thermal", label: "Thermal Test" },
  { id: "analysis", label: "Analysis" },
];

export default function Home() {
  const activeTab = useLabStore((s) => s.activeTab);
  const setActiveTab = useLabStore((s) => s.setActiveTab);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/60 via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 grid place-items-center">
                <Battery className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-bold leading-none tracking-tight">BatteryLab</div>
                <div className="text-[10px] text-muted-foreground leading-tight">Design · Test · Analyze</div>
              </div>
            </div>
            <nav aria-label="Workflow steps" className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(s.id)}
                  aria-current={activeTab === s.id ? "page" : undefined}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === s.id
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                    activeTab === s.id ? "bg-white/25" : "bg-muted"
                  }`}>
                    {i + 1}
                  </span>
                  {s.label}
                  {i < STEPS.length - 1 && <ChevronRight className="hidden sm:inline h-3 w-3 opacity-40" />}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero (only on first step) */}
      {activeTab === "design" && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
          <div className="rounded-2xl border bg-card p-5 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Battery Design, Testing &amp; Analysis System
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-3xl leading-relaxed">
              A complete engineering workflow: <span className="font-medium text-foreground">design</span> your cell,
              configure the pack <span className="font-medium text-foreground">connection</span>, build the equivalent-circuit
              <span className="font-medium text-foreground"> model</span>, run <span className="font-medium text-foreground">simulations</span>,
              execute <span className="font-medium text-foreground">thermal tests</span> with the Bernardi heat model, and
              <span className="font-medium text-foreground"> analyze</span> every stored test run. The physics engine uses a
              2RC Thevenin ECM integrated at 1-second steps with coulomb-counting SOC.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CircleDot className="h-3 w-3 text-emerald-600" /> 4 chemistry presets</span>
              <span className="flex items-center gap-1"><CircleDot className="h-3 w-3 text-emerald-600" /> CC / CC-CV / HPPC / drive profiles</span>
              <span className="flex items-center gap-1"><CircleDot className="h-3 w-3 text-emerald-600" /> Bernardi thermal model</span>
              <span className="flex items-center gap-1"><CircleDot className="h-3 w-3 text-emerald-600" /> Auto-saved test database</span>
              <span className="flex items-center gap-1"><CircleDot className="h-3 w-3 text-emerald-600" /> CSV export</span>
            </div>
          </div>
        </section>
      )}

      {/* Main content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6">
        {activeTab === "design" && <DesignTab />}
        {activeTab === "connection" && <ConnectionTab />}
        {activeTab === "model" && <ModelTab />}
        {activeTab === "simulate" && <SimulateTab />}
        {activeTab === "thermal" && <ThermalTab />}
        {activeTab === "analysis" && <AnalysisTab />}
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto border-t bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>BatteryLab — electro-thermal battery engineering workspace. Results are model estimates, not a substitute for physical testing.</span>
          <span>2RC ECM · Bernardi heat · coulomb counting</span>
        </div>
      </footer>
    </div>
  );
}
