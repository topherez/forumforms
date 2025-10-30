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
    const respForums: any = await (sdk as any).forums?.list?.({ company_id: companyId, first: 50 });
    const forums: any[] = respForums?.data ?? respForums?.items ?? [];
    const experiences = forums
      .map((f: any) => ({ id: f?.experience?.id, name: f?.experience?.name }))
      .filter((e: any) => Boolean(e?.id));
    return NextResponse.json({ companyId, experiences });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}


