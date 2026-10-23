import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { simulate, type CellDesign, type PackConfig, type SimParams, type Chemistry } from "@/lib/lab/engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // design may come inline (from client state) or by saved id
    let design = body.design as CellDesign | undefined;
    let pack = body.pack as PackConfig | undefined;
    const params = body.params as SimParams | undefined;

    if (body.designId && !design) {
      const saved = await db.batteryDesign.findUnique({ where: { id: body.designId } });
      if (!saved) return NextResponse.json({ error: "Design not found" }, { status: 404 });
      design = {
        name: saved.name, chemistry: saved.chemistry as Chemistry,
        capacityAh: saved.capacityAh, vmax: saved.vmax, vmin: saved.vmin,
        r0: saved.r0, r1: saved.r1, c1: saved.c1, r2: saved.r2, c2: saved.c2,
        massKg: saved.massKg, cpJkgK: saved.cpJkgK, areaM2: saved.areaM2,
        entropicVperK: saved.entropicVperK, maxDischargeC: saved.maxDischargeC, maxChargeC: saved.maxChargeC,
      };
      pack = { series: saved.seriesCount, parallel: saved.parallelCount };
    }

    if (!design || !pack || !params) {
      return NextResponse.json({ error: "design, pack and params are required" }, { status: 400 });
    }

    // basic validation
    if (!design.capacityAh || design.capacityAh <= 0) return NextResponse.json({ error: "capacityAh must be > 0" }, { status: 400 });
    if (design.r0 <= 0) return NextResponse.json({ error: "r0 must be > 0" }, { status: 400 });
    if (!pack.series || pack.series < 1 || !pack.parallel || pack.parallel < 1) {
      return NextResponse.json({ error: "pack series/parallel must be >= 1" }, { status: 400 });
    }

    const result = simulate(design, pack, params);

    // persist run (best effort — sim still returns if persistence fails)
    let runId: string | undefined;
    try {
      let designId = body.designId as string | undefined;
      if (!designId) {
        // reuse an identical existing design instead of duplicating rows
        const existing = await db.batteryDesign.findFirst({
          where: {
            name: design.name,
            chemistry: design.chemistry,
            capacityAh: design.capacityAh,
            vmax: design.vmax,
            vmin: design.vmin,
            r0: design.r0,
            seriesCount: pack.series,
            parallelCount: pack.parallel,
          },
        });
        if (existing) {
          designId = existing.id;
        } else {
          const auto = await db.batteryDesign.create({
            data: {
              name: design.name,
              chemistry: design.chemistry,
              capacityAh: design.capacityAh, vmax: design.vmax, vmin: design.vmin,
              r0: design.r0, r1: design.r1 ?? 0, c1: design.c1 ?? 0, r2: design.r2 ?? 0, c2: design.c2 ?? 0,
              massKg: design.massKg, cpJkgK: design.cpJkgK ?? 1000, areaM2: design.areaM2 ?? 0.04,
              entropicVperK: design.entropicVperK ?? 0.0001,
              maxDischargeC: design.maxDischargeC ?? 2, maxChargeC: design.maxChargeC ?? 1,
              seriesCount: pack.series, parallelCount: pack.parallel,
            },
          });
          designId = auto.id;
        }
      }
      const run = await db.testRun.create({
        data: {
          designId,
          name: body.runName || `${params.profile.toUpperCase()} @ ${params.cRate}C`,
          profile: params.profile,
          cRate: params.cRate,
          ambientC: params.ambientC,
          hConv: params.coolingOn ? params.hConv : 0,
          summary: JSON.stringify(result.summary),
          series: JSON.stringify(result.series),
        },
      });
      runId = run.id;
    } catch (e) {
      console.error("Run persistence failed (non-fatal)", e);
    }

    return NextResponse.json({ ...result, runId });
  } catch (e) {
    console.error("POST /api/simulate failed", e);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
