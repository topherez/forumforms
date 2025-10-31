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
    // Helper: resolve a forum-capable experience ID
    const resolveForumExp = async (): Promise<string | null> => {
      // Prefer DB binding when company context exists
      if (companyId) {
        if (prisma) {
          const bound = await prisma.forumBinding.findFirst({ where: { companyId, enabled: true } });
          if (bound?.forumId) return bound.forumId;
        }
        const respForums: any = await (sdk as any).forums?.list?.({ company_id: companyId, first: 1 });
        const forums: any[] = respForums?.data ?? respForums?.items ?? [];
        const fid = forums?.[0]?.experience?.id || null;
        if (fid) return fid;
      }
      if (experienceId) {
        // Probe: try listing posts; if it fails with bad_request, derive company and get forum exp
        try {
          await (sdk as any).forumPosts?.list?.({ experience_id: experienceId, first: 1 });
          return experienceId; // works
        } catch {
          // Get company from the non-forum experience and fetch its forum
          const exp: any = await (sdk as any).experiences?.retrieve?.(experienceId);
          const cid = exp?.company?.id || exp?.company_id || null;
          if (cid) {
            if (prisma) {
              const bound = await prisma.forumBinding.findFirst({ where: { companyId: cid, enabled: true } });
              if (bound?.forumId) return bound.forumId;
            }
            const respForums: any = await (sdk as any).forums?.list?.({ company_id: cid, first: 1 });
            const forums: any[] = respForums?.data ?? respForums?.items ?? [];
            return forums?.[0]?.experience?.id || null;
          }
        }
      }
      return null;
    };

    const effectiveExp = await resolveForumExp();
    if (!effectiveExp) return NextResponse.json({ posts: [], pageInfo: null }, { status: 200 });

    const resp: any = await (sdk as any).forumPosts?.list?.({ experience_id: effectiveExp, first: 20 });
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