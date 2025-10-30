import { headers } from "next/headers";
import { getWhopSdk } from "@/lib/whop-sdk";

interface PageProps {
  params: { companyId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function DashboardForumsPage({ params, searchParams }: PageProps) {
  const sdk = getWhopSdk();
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
  const queryCompanyId = normalize(
    typeof searchParams?.companyId === "string"
      ? (searchParams?.companyId as string)
      : Array.isArray(searchParams?.companyId)
      ? (searchParams?.companyId?.[0] as string)
      : undefined
  );
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
  const envCompanyId = normalize(process.env.WHOP_COMPANY_ID || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || null);
  const companyId = routeCompanyId || queryCompanyId || urlCompanyId || headerCompanyId || envCompanyId;

  if (!companyId || companyId.startsWith("[")) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm text-gray-600">
          Missing company ID. Paste your Whop dashboard URL (or company ID):
        </div>
        <form className="flex gap-2" method="get">
          <input
            type="text"
            name="dashboardUrl"
            placeholder="https://whop.com/dashboard/biz_XXXXXXXX"
            className="w-full border rounded px-3 py-2"
            defaultValue=""
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

  const resp: any = await (sdk as any).experiences.list({ company_id: companyId, limit: 50 });
  const experiences: any[] = resp?.data ?? resp?.items ?? [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Forums by Experience</h1>
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


