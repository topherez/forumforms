import { headers } from "next/headers";
import { whopSdk } from "@/lib/whop-sdk";

export default async function ForumsBindingPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const headersList = await headers();
  const { companyId } = await params;
  const { userId } = await whopSdk.verifyUserToken(headersList);
  const access = await whopSdk.access.checkIfUserHasAccessToCompany({ userId, companyId });
  if (!access.hasAccess || access.accessLevel !== "admin") {
    return <div className="p-6">Admins only.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Forum Bindings</h1>
      <p className="text-sm text-gray-600">Bind your Whop forum(s) to this app.</p>
      {/* Simple manual bind UI for now */}
      <BindForm companyId={companyId} />
      <BindingsList companyId={companyId} />
    </div>
  );
}

async function BindingsList({ companyId }: { companyId: string }) {
  const res = await fetch(`/api/bindings/${companyId}`, { cache: "no-store" });
  const data = await res.json();
  const bindings = (data.bindings ?? []) as Array<{ forumId: string }>;
  if (bindings.length === 0) return <div className="text-sm text-gray-500">No bindings.</div>;
  return (
    <ul className="list-disc pl-5">
      {bindings.map((b, i) => (
        <li key={i} className="flex items-center gap-3 text-sm">
          <span>Forum: {b.forumId}</span>
          <form action={`/api/bindings/${companyId}?forumId=${encodeURIComponent(b.forumId)}`} method="delete">
            <button className="text-red-600">Remove</button>
          </form>
        </li>
      ))}
    </ul>
  );
}

function BindForm({ companyId }: { companyId: string }) {
  async function onBind(formData: FormData) {
    "use server";
    const raw = String(formData.get("forumIdOrUrl") ?? "").trim();
    if (!raw) return;
    // Accept either a full URL or a slug like forums-xxxxx
    let forumId = raw;
    try {
      const url = new URL(raw);
      // Expect something like .../forums-<slug>/...
      const match = url.pathname.match(/\/(forums-[A-Za-z0-9]+)(?:[\/?]|$)/);
      if (match?.[1]) forumId = match[1];
    } catch {
      // not a URL; assume they pasted the slug directly
    }
    await fetch(`/api/bindings/${companyId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ forumId }),
    });
  }

  return (
    <form action={onBind} className="flex items-end gap-3">
      <div className="flex-1">
        <label className="text-xs text-gray-500">Forum URL or ID</label>
        <input name="forumIdOrUrl" className="w-full border rounded px-2 py-1" placeholder="https://whop.com/joined/.../forums-xxxx or forums-xxxx" />
      </div>
      <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Bind</button>
    </form>
  );
}


