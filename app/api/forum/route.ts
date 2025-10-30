import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getWhopSdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let experienceId = searchParams.get("experienceId");
  const companyId = searchParams.get("companyId") || (await headers()).get("x-whop-company-id");

  try {
    const sdk = getWhopSdk();
    if (!experienceId && companyId && prisma) {
      const bound = await prisma.forumBinding.findFirst({ where: { companyId, enabled: true } });
      if (bound?.forumId) experienceId = bound.forumId;
    }
    if (!experienceId && companyId) {
      // Resolve via forums.list -> experience.id
      const respForums: any = await (sdk as any).forums?.list?.({ company_id: companyId, first: 1 });
      const forums: any[] = respForums?.data ?? respForums?.items ?? [];
      experienceId = forums?.[0]?.experience?.id || null;
      if (!experienceId) {
        return NextResponse.json({ posts: [], pageInfo: null }, { status: 200 });
      }
    }
    if (!experienceId) {
      return NextResponse.json(
        { error: "Missing experienceId and companyId" },
        { status: 400 }
      );
    }
    const resp: any = await (sdk as any).forumPosts?.list?.({
      experience_id: experienceId,
      limit: 20,
    });
    return NextResponse.json({
      posts: resp?.data ?? resp?.items ?? [],
      pageInfo: resp?.page_info ?? resp?.pageInfo ?? null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}