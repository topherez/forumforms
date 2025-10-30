import { NextResponse } from "next/server";
import { getWhopSdk } from "@/lib/whop-sdk";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const experienceId = searchParams.get("experienceId");
  if (!experienceId) {
    return NextResponse.json(
      { error: "Missing experienceId" },
      { status: 400 }
    );
  }

  try {
    const sdk = getWhopSdk();
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


