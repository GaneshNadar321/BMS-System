"use client";

import { useSyncExternalStore } from "react";
import { Zap } from "lucide-react";
import { Overview } from "@/components/platform/overview";
import { Designer } from "@/components/platform/designer";
import { Compare } from "@/components/platform/compare";
import { Traceability } from "@/components/platform/traceability";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "designer", label: "Designer" },
  { id: "compare", label: "Compare" },
  { id: "trace", label: "Traceability" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export default function Home() {
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash.replace("#", ""), () => "");
  const tab: TabId = (TABS.some((t) => t.id === hash) ? hash : "overview") as TabId;

  const jump = (t: string) => {
    if (typeof window !== "undefined") window.location.hash = t;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center gap-4">
            <button
              onClick={() => jump("overview")}
              className="flex items-center gap-2 shrink-0"
              aria-label="VoltLab home"
            >
              <span className="rounded-lg bg-primary/15 border border-primary/30 p-1.5">
                <Zap className="h-4 w-4 text-primary" />
              </span>
              <span className="font-semibold tracking-tight">
                Volt<span className="text-primary">Lab</span>
              </span>
              <span className="hidden md:inline text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5 font-mono">
                Battery Energy System Studio
              </span>
            </button>

            <nav
              className="ml-auto flex items-center gap-1 overflow-x-auto max-w-[62%] sm:max-w-none"
              aria-label="Sections"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => jump(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    tab === t.id
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 sm:py-8">
        {tab === "overview" ? <Overview onJump={jump} /> : null}
        {tab === "designer" ? <Designer /> : null}
        {tab === "compare" ? <Compare onJump={jump} /> : null}
        {tab === "trace" ? <Traceability /> : null}
      </main>

      {/* Footer (sticks to bottom, pushed naturally on long pages) */}
      <footer className="mt-auto border-t border-border/60 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center gap-2 justify-between">
          <p className="text-[11px] text-muted-foreground">
            VoltLab — virtual battery design platform · Case Study 2: Reusable Digital Platform for
            Designing Battery Energy Systems
          </p>
          <p className="text-[11px] text-muted-foreground font-mono">
            physics-based demo · low-voltage scoping · datasheet-verified cells
          </p>
        </div>
      </footer>
    </div>
  );
}
