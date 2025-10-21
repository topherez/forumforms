import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { whopSdk } from "@/lib/whop-sdk";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const postId = url.searchParams.get("postId");
  if (!postId) return new NextResponse("Missing postId", { status: 400 });

  const meta = await prisma.postMetadata.findFirst({ where: { postId } });
  return NextResponse.json({ metadata: meta });
}

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const { userId } = await whopSdk.verifyUserToken(headersList);
  const body = await req.json().catch(() => null);

  if (
    !body ||
    typeof body !== "object" ||
    !body.postId ||
    !body.companyId ||
    body.data == null
  ) {
    return new NextResponse("Invalid body", { status: 400 });
  }

  // Only allow save if user has access to the company
  const access = await whopSdk.access.checkIfUserHasAccessToCompany({
    userId,
    companyId: body.companyId,
  });
  if (!access.hasAccess) return new NextResponse("Forbidden", { status: 403 });

  const saved = await prisma.postMetadata.create({
    data: {
      postId: String(body.postId),
      companyId: String(body.companyId),
      createdByUserId: String(userId),
      dataJson: body.data,
    },
  });

  return NextResponse.json({ ok: true, id: saved.id });
}


