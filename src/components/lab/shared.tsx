"use client";

import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SectionTitle({ title, desc, icon }: { title: string; desc?: string; icon?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      {icon && <div className="mt-0.5 text-emerald-600">{icon}</div>}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {desc && <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">{desc}</p>}
      </div>
    </div>
  );
}

export function StatCard({ label, value, unit, hint, tone }: { label: string; value: string | number; unit?: string; hint?: string; tone?: "default" | "warn" | "fail" }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3",
        tone === "warn" && "border-amber-500/50 bg-amber-500/10",
        tone === "fail" && "border-red-500/50 bg-red-500/10"
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: "ok" | "warn" | "fail" }) {
  if (status === "ok") return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0">PASS</Badge>;
  if (status === "warn") return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0">WARN</Badge>;
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0">FAIL</Badge>;
}

export function ChartCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

export const CHART_COLORS = {
  emerald: "#059669",
  teal: "#0d9488",
  amber: "#d97706",
  red: "#dc2626",
  slate: "#64748b",
  violet: "#7c3aed",
};

export const COOLING_PRESETS = [
  { label: "None (adiabatic)", h: 0 },
  { label: "Natural air", h: 8 },
  { label: "Forced air (fan)", h: 35 },
  { label: "Liquid cold plate", h: 150 },
];
