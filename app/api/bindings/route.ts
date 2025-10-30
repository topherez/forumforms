import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const experienceId = searchParams.get("experienceId");
  if (!prisma) return NextResponse.json({ error: "Prisma client unavailable" }, { status: 500 });
  if (experienceId) {
    const binding = await prisma.forumBinding.findFirst({ where: { forumId: experienceId, enabled: true } });
    return NextResponse.json({ bindings: binding ? [binding] : [] });
  }
  if (companyId) {
    const bindings = await prisma.forumBinding.findMany({ where: { companyId, enabled: true } });
    return NextResponse.json({ bindings });
  }
  // Fallback: return latest enabled binding across all companies (for member view when
  // company context is unavailable in iframe). Safe enough for single-tenant testing.
  const latest = await prisma.forumBinding.findMany({
    where: { enabled: true },
    orderBy: { updatedAt: "desc" },
    take: 1,
  });
  return NextResponse.json({ bindings: latest });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const companyId = String(body.companyId || "");
  const experienceId = String(body.experienceId || "");
  if (!companyId.startsWith("biz_")) {
    return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
  }
  if (!experienceId.startsWith("exp_")) {
    return NextResponse.json({ error: "Invalid experienceId" }, { status: 400 });
  }
  if (!prisma) return NextResponse.json({ error: "Prisma client unavailable" }, { status: 500 });
  try {
    // Disable any other bindings for this company (keep only the chosen one enabled)
    await prisma.forumBinding.updateMany({
      where: { companyId, NOT: { forumId: experienceId } },
      data: { enabled: false },
    });
    // Upsert on the compound unique (companyId, forumId) to avoid duplicate errors
    const created = await prisma.forumBinding.upsert({
      where: { companyId_forumId: { companyId, forumId: experienceId } },
      update: { enabled: true },
      create: { companyId, forumId: experienceId, enabled: true },
    });
    return NextResponse.json({ binding: created });
  } catch (err: any) {
    // Surface a helpful error so you can see missing table / permission issues
    return NextResponse.json(
      { error: err?.message || "Unknown DB error", code: "prisma_error" },
      { status: 500 }
    );
  }
}


