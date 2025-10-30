import { NextResponse } from "next/server";
import { getWhopSdk } from "@/lib/whop-sdk";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  if (!companyId || !companyId.startsWith("biz_")) {
    return NextResponse.json({ error: "Missing or invalid companyId" }, { status: 400 });
  }

  try {
    const sdk = getWhopSdk();
    const resp: any = await (sdk as any).experiences.list({ company_id: companyId, first: 50 });
    const appId = process.env.WHOP_APP_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID;
    const experiences: Array<{ id: string; name?: string }> = (resp?.data ?? resp?.items ?? [])
      // Filter out experiences created by this app (ForumForms)
      .filter((e: any) => {
        const expAppId = e?.app?.id;
        return !appId || !expAppId || expAppId !== appId;
      })
      .map((e: any) => ({ id: e?.id, name: e?.name }));
    return NextResponse.json({ companyId, experiences });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}


