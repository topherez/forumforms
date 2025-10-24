import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopSdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/prisma";
import { createForumPost } from "@/lib/forum-service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ forumId: string }> },
) {
  const headersList = await headers();
  const { userId } = await whopSdk.verifyUserToken(headersList);
  const { forumId } = await context.params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object" || !body.companyId || !body.title || !body.content || body.fieldsData == null) {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const access = await whopSdk.access.checkIfUserHasAccessToCompany({ userId, companyId: String(body.companyId) });
  if (!access.hasAccess) return new NextResponse("Forbidden", { status: 403 });

  // Try real forum creation first
  const created = await createForumPost({ forumId, title: String(body.title), content: String(body.content), userId, companyId: String(body.companyId) });
  if (created) {
    await prisma.postMetadata.create({
      data: {
        postId: created.postId,
        companyId: String(body.companyId),
        createdByUserId: userId,
        dataJson: body.fieldsData,
      },
    });
    return NextResponse.json({ ok: true, postId: created.postId, postUrl: created.postUrl });
  }

  // Fallback: create a placeholder metadata record; caller can PATCH later with post URL
  const tempId = `temp_${Date.now()}`;
  const saved = await prisma.postMetadata.create({
    data: {
      postId: tempId,
      companyId: String(body.companyId),
      createdByUserId: userId,
      dataJson: body.fieldsData,
    },
  });
  return NextResponse.json({ ok: true, tempId: saved.id });
}


