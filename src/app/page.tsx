"use client";

import { Battery, BookOpen, Check } from "lucide-react";
import { useLabStore } from "@/lib/lab/store";
import { designIssues } from "@/lib/lab/engine";
import { DesignTab } from "@/components/lab/design-tab";
import { LibraryTab } from "@/components/lab/library-tab";
import { ConnectionTab } from "@/components/lab/connection-tab";
import { ModelTab } from "@/components/lab/model-tab";
import { SimulateTab } from "@/components/lab/simulate-tab";
import { ThermalTab } from "@/components/lab/thermal-tab";
import { MonitorTab } from "@/components/lab/monitor-tab";
import { AnalysisTab } from "@/components/lab/analysis-tab";
import { Copilot } from "@/components/lab/copilot";
import { ThemeToggle } from "@/components/lab/theme-toggle";

const STEPS = [
  { id: "design", label: "Design" },
  { id: "connection", label: "Connection" },
  { id: "model", label: "Modeling" },
  { id: "simulate", label: "Simulation" },
  { id: "thermal", label: "Thermal" },
  { id: "monitor", label: "Monitor" },
  { id: "analysis", label: "Analysis" },
];

export default function Home() {
  const activeTab = useLabStore((s) => s.activeTab);
  const setActiveTab = useLabStore((s) => s.setActiveTab);
  // Step completion — derived from live store state so checkmarks stay
  // truthful: design valid, schematic connected, step visited, run stored.
  // (Primitive selectors only — object selectors break useSyncExternalStore.)
  const done: Record<string, boolean> = {
    design: useLabStore((s) => designIssues(s.design).length === 0),
    connection: useLabStore((s) => s.build.stage === 3 && s.build.s === s.pack.series && s.build.p === s.pack.parallel),
    model: useLabStore((s) => s.visitedSteps.includes("model")),
    simulate: useLabStore((s) => s.lastResult !== null),
    thermal: useLabStore((s) => s.visitedSteps.includes("thermal")),
    monitor: useLabStore((s) => s.visitedSteps.includes("monitor")),
    analysis: useLabStore((s) => s.visitedSteps.includes("analysis")),
  };

  const navBtn = (active: boolean) =>
    `flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
      active
        ? "bg-primary text-white shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-8 w-8 rounded-md bg-primary grid place-items-center">
                <Battery className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="font-semibold leading-none tracking-tight text-[15px]">BatteryLab</div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <nav aria-label="Workflow steps" className="flex items-center gap-0.5 rounded-lg bg-muted p-1 overflow-x-auto scrollbar-none">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(s.id)}
                  aria-current={activeTab === s.id ? "page" : undefined}
                  title={done[s.id as keyof typeof done] ? `${s.label} complete` : s.label}
                  className={navBtn(activeTab === s.id)}
                >
                  {done[s.id as keyof typeof done] ? (
                    <Check className={`h-3.5 w-3.5 ${activeTab === s.id ? "text-white" : "text-emerald-600"}`} strokeWidth={3} />
                  ) : (
                    <span className={`text-[10px] tabular-nums ${activeTab === s.id ? "opacity-70" : "opacity-50"}`}>{i + 1}</span>
                  )}
                  {s.label}
                </button>
              ))}
              <span className="mx-0.5 h-4 w-px bg-border shrink-0" aria-hidden />
              <button
                onClick={() => setActiveTab("library")}
                aria-current={activeTab === "library" ? "page" : undefined}
                className={navBtn(activeTab === "library")}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Library
              </button>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6">
        {activeTab === "design" && <DesignTab />}
        {activeTab === "library" && <LibraryTab />}
        {activeTab === "connection" && <ConnectionTab />}
        {activeTab === "model" && <ModelTab />}
        {activeTab === "simulate" && <SimulateTab />}
        {activeTab === "thermal" && <ThermalTab />}
        {activeTab === "monitor" && <MonitorTab />}
        {activeTab === "analysis" && <AnalysisTab />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 text-[11px] text-muted-foreground">
          Model estimates — validate with physical testing.
        </div>
      </footer>

      {/* Real-time AI copilot (all tabs) */}
      <Copilot />
    </div>
  );
}
