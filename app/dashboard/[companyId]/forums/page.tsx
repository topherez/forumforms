import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getWhopSdk } from "@/lib/whop-sdk";
// CompanyIdForm kept as a fallback, but we prefer server action below
import CompanyIdForm from "./CompanyIdForm";

interface PageProps {
  params: { companyId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function DashboardForumsPage({ params, searchParams }: PageProps) {
  const sdk = getWhopSdk();
  async function setCompanyId(formData: FormData) {
    "use server";
    const raw = String(formData.get("companyInput") || "");
    const match = raw.match(/\b(biz_[A-Za-z0-9]+)\b/);
    const id = match ? match[1] : raw;
    if (id && id.startsWith("biz_")) {
      const jar = await cookies();
      jar.set("ff_company_id", id, { path: "/", maxAge: 60 * 60 * 24 });
      revalidatePath("/dashboard/[companyId]/forums", "page");
    }
  }
  const normalize = (v?: string | null) => {
    if (!v) return null;
    if (v === "undefined") return null;
    if (v.startsWith("[")) return null;
    if (v.includes("companyId")) return null;
    return v;
  };
  const extractCompanyId = (input?: string | null) => {
    const value = input || "";
    // Accept direct ID (biz_...) or a full URL like https://whop.com/dashboard/biz_...
    const direct = value.match(/\b(biz_[A-Za-z0-9]+)\b/);
    return direct ? direct[1] : null;
  };
  const routeCompanyId = normalize(params.companyId);
  const rawQueryCompanyId =
    typeof searchParams?.companyId === "string"
      ? (searchParams?.companyId as string)
      : Array.isArray(searchParams?.companyId)
      ? (searchParams?.companyId?.[0] as string)
      : undefined;
  const queryCompanyId = normalize(extractCompanyId(rawQueryCompanyId) || rawQueryCompanyId || null);
  // Optional dashboardUrl query param (paste-in)
  const pastedUrl =
    typeof searchParams?.dashboardUrl === "string"
      ? (searchParams?.dashboardUrl as string)
      : Array.isArray(searchParams?.dashboardUrl)
      ? (searchParams?.dashboardUrl?.[0] as string)
      : undefined;
  const urlCompanyId = normalize(extractCompanyId(pastedUrl));
  const h = await headers();
  const headerCompanyId = normalize(h.get("x-whop-company-id"));
  const jar = await cookies();
  const cookieCompanyId = normalize(jar.get("ff_company_id")?.value || null);
  const envCompanyId = normalize(process.env.WHOP_COMPANY_ID || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || null);
  const companyId = routeCompanyId || queryCompanyId || urlCompanyId || headerCompanyId || cookieCompanyId || envCompanyId;

  if (!companyId || companyId.startsWith("[")) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm text-gray-600">
          Missing company ID. Paste your Whop dashboard URL (or company ID):
        </div>
        <form className="flex gap-2" action={setCompanyId}>
          <input
            type="text"
            name="companyInput"
            placeholder="Paste company URL or ID (biz_XXXXXXXX)"
            className="w-full border rounded px-3 py-2"
            defaultValue={rawQueryCompanyId || pastedUrl || ""}
          />
          <button className="bg-indigo-600 text-white px-4 py-2 rounded" type="submit">Continue</button>
        </form>
        <div className="text-xs text-gray-500">
          Tip: We’ll extract the company ID (e.g., biz_Dh5EJMELZPVzHS) from a URL like
          {" "}
          <a className="underline" href="https://whop.com/dashboard/biz_Dh5EJMELZPVzHS/" target="_blank" rel="noreferrer">this</a>.
        </div>
      </div>
    );
  }

  // Prefer forums.list so we directly link to the forum experience
  const respForums: any = await (sdk as any).forums?.list?.({ company_id: companyId, first: 50 });
  const forums: any[] = respForums?.data ?? respForums?.items ?? [];
  let experiences: any[] = forums
    .map((f: any) => ({ id: f?.experience?.id, name: f?.experience?.name }))
    .filter((e: any) => Boolean(e?.id));
  if (experiences.length === 0) {
    const respExps: any = await (sdk as any).experiences.list({ company_id: companyId, first: 50 });
    experiences = (respExps?.data ?? respExps?.items ?? []).map((e: any) => ({ id: e.id, name: e.name }));
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Forums by Experience</h1>
      <div className="text-xs text-gray-500">Resolved company: <span className="font-mono">{companyId}</span></div>
      <ul className="space-y-2">
        {experiences.map((e) => (
          <li key={e.id} className="border p-3 rounded bg-white flex items-center justify-between">
            <div>
              <div className="text-base font-medium">{e.name || e.id}</div>
              <div className="text-xs text-gray-500">{e.company?.title ?? companyId}</div>
            </div>
            <a href={`/experience/${e.id}`} className="text-indigo-600 hover:underline">Open forum</a>
          </li>
        ))}
        {experiences.length === 0 && (
          <li className="text-sm text-gray-500">No experiences found for this company.</li>
        )}
      </ul>
    </div>
  );
}


