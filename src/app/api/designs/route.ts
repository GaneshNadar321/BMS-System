import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const designs = await db.batteryDesign.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { runs: true } } },
    });
    return NextResponse.json({ designs });
  } catch (e) {
    console.error("GET /api/designs failed", e);
    return NextResponse.json({ error: "Failed to load designs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const required = ["name", "chemistry", "capacityAh", "vmax", "vmin", "r0", "massKg"];
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === "") {
        return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
      }
    }
    const design = await db.batteryDesign.create({
      data: {
        name: String(body.name).slice(0, 80),
        chemistry: String(body.chemistry),
        capacityAh: Number(body.capacityAh),
        vmax: Number(body.vmax),
        vmin: Number(body.vmin),
        r0: Number(body.r0),
        r1: Number(body.r1 ?? 0),
        c1: Number(body.c1 ?? 0),
        r2: Number(body.r2 ?? 0),
        c2: Number(body.c2 ?? 0),
        massKg: Number(body.massKg),
        cpJkgK: Number(body.cpJkgK ?? 1000),
        areaM2: Number(body.areaM2 ?? 0.04),
        entropicVperK: Number(body.entropicVperK ?? 0.0001),
        maxDischargeC: Number(body.maxDischargeC ?? 2),
        maxChargeC: Number(body.maxChargeC ?? 1),
        seriesCount: Math.max(1, Math.round(Number(body.seriesCount ?? 1))),
        parallelCount: Math.max(1, Math.round(Number(body.parallelCount ?? 1))),
      },
    });
    return NextResponse.json({ design }, { status: 201 });
  } catch (e) {
    console.error("POST /api/designs failed", e);
    return NextResponse.json({ error: "Failed to save design" }, { status: 500 });
  }
}
