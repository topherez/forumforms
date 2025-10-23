import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { whopSdk } from "@/lib/whop-sdk";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await context.params;
  const bindings = await prisma.forumBinding.findMany({ where: { companyId, enabled: true } });
  return NextResponse.json({ bindings });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
) {
  const headersList = await headers();
  const { userId } = await whopSdk.verifyUserToken(headersList);
  const { companyId } = await context.params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object" || !body.forumId) {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const access = await whopSdk.access.checkIfUserHasAccessToCompany({ userId, companyId });
  if (!access.hasAccess || access.accessLevel !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const saved = await prisma.forumBinding.upsert({
    where: { companyId_forumId: { companyId, forumId: String(body.forumId) } },
    update: { enabled: true },
    create: { companyId, forumId: String(body.forumId), enabled: true },
  });
  return NextResponse.json({ ok: true, binding: saved });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
) {
  const headersList = await headers();
  const { userId } = await whopSdk.verifyUserToken(headersList);
  const { companyId } = await context.params;
  const url = new URL(req.url);
  const forumId = url.searchParams.get("forumId");
  if (!forumId) return new NextResponse("Missing forumId", { status: 400 });

  const access = await whopSdk.access.checkIfUserHasAccessToCompany({ userId, companyId });
  if (!access.hasAccess || access.accessLevel !== "admin") return new NextResponse("Forbidden", { status: 403 });

  await prisma.forumBinding.updateMany({
    where: { companyId, forumId },
    data: { enabled: false },
  });
  return NextResponse.json({ ok: true });
}


