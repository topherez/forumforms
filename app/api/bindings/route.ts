import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });
  if (!prisma) return NextResponse.json({ error: "Prisma client unavailable" }, { status: 500 });
  const bindings = await prisma.forumBinding.findMany({ where: { companyId, enabled: true } });
  return NextResponse.json({ bindings });
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
  // Ensure a single active binding per company: disable existing
  await prisma.forumBinding.updateMany({ where: { companyId }, data: { enabled: false } });
  const created = await prisma.forumBinding.create({
    data: { companyId, forumId: experienceId, enabled: true },
  });
  return NextResponse.json({ binding: created });
}


