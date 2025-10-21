import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { whopSdk } from "@/lib/whop-sdk";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await context.params;

  const existing = await prisma.companyPostFieldSchema.findFirst({
    where: { companyId },
  });

  return NextResponse.json({
    companyId,
    schema: existing?.schemaJson ?? { fields: [] },
    updatedAt: existing?.updatedAt ?? null,
  });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
) {
  const headersList = await headers();
  const { userId } = await whopSdk.verifyUserToken(headersList);
  const { companyId } = await context.params;

  const access = await whopSdk.access.checkIfUserHasAccessToCompany({
    userId,
    companyId,
  });

  if (!access.hasAccess || access.accessLevel !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || body.schema == null) {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const existing = await prisma.companyPostFieldSchema.findFirst({ where: { companyId } });
  const saved = existing
    ? await prisma.companyPostFieldSchema.update({
        where: { id: existing.id },
        data: { schemaJson: body.schema },
      })
    : await prisma.companyPostFieldSchema.create({
        data: { companyId, schemaJson: body.schema },
      });

  return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
}


