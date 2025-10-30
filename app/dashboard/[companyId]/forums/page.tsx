import { getWhopSdk } from "@/lib/whop-sdk";

interface PageProps {
  params: { companyId: string };
}

export default async function DashboardForumsPage({ params }: PageProps) {
  const sdk = getWhopSdk();
  const companyId = params.companyId;

  if (!companyId || companyId.startsWith("[")) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Missing company ID. Ensure Dashboard path is set to <code>/dashboard/:companyId/forums</code>.
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


