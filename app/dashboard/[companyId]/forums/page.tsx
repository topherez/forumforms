import { headers } from "next/headers";
import { whopSdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/prisma";

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

  // If no binding exists, try to auto-detect a forum experience for THIS company and bind it once for convenience
  const existing = await prisma.forumBinding.findFirst({ where: { companyId, enabled: true } });
  if (!existing) {
    try {
      // Get company details first
      const companyResp: any = await whopSdk.companies.getCompany({ companyId });
      console.log("[AutoBind] company details", { companyId, companyResp });
      
      // Try to get experiences - the company object should have experiences
      // Try multiple approaches
      const experiencesFromCompany = companyResp?.company?.experiences ?? companyResp?.experiences ?? [];
      const experiencesFromV2 = companyResp?.company?.experiencesV2?.nodes ?? [];
      
      console.log("[AutoBind] experiences from company object", { 
        fromCompany: experiencesFromCompany.length,
        fromV2: experiencesFromV2.length
      });
      
      // Query experiences for this company as the signed-in user
      const sdkAny: any = whopSdk as any;
      const sdkWithUser = typeof sdkAny.withUser === "function" ? sdkAny.withUser(userId) : sdkAny;
      const resp: any = await sdkWithUser.experiences.listExperiences({ companyId, first: 50 });
      const allNodes: any[] = resp?.company?.experiencesV2?.nodes ?? resp?.nodes ?? resp?.experiences ?? [];
      console.log("[AutoBind] all experiences", { totalCount: allNodes.length });
      
      // Filter to experiences for this specific company
      const companyNodes = allNodes.filter((e: any) => {
        const expCompanyId = e?.companyId ?? e?.company?.id ?? e?.company_id;
        return String(expCompanyId ?? "").toLowerCase() === companyId.toLowerCase();
      });
      
      console.log("[AutoBind] filtered for company", { companyId, nodesCount: companyNodes.length, exp: companyNodes.map((e: any) => ({ id: e?.id, name: e?.name, type: e?.type, appKey: e?.appKey, companyId: e?.companyId ?? e?.company?.id })) });
      
      let forumExp = companyNodes.find((e: any) =>
        (e?.type && String(e.type).toLowerCase().includes("forum")) ||
        (e?.appKey && String(e.appKey).toLowerCase().includes("forum")) ||
        (e?.name && String(e.name).toLowerCase().includes("forum"))
      );
      // If none found, try to create one for convenience
      if (!forumExp) {
        try {
          const created: any = await (whopSdk as any).forums.findOrCreateForum({ name: "Community Forum" });
          if (created?.id?.startsWith("exp_")) {
            forumExp = created;
          }
          console.log("[AutoBind] findOrCreateForum", { created });
        } catch (err) {
          console.error("[AutoBind] findOrCreateForum error", { error: err });
        }
      }
      const expId: string | undefined = forumExp?.id ?? forumExp?.experienceId;
      console.log("[AutoBind] found forum exp for company", { forumExp, expId });
      if (expId?.startsWith("exp_")) {
        await prisma.forumBinding.upsert({
          where: { companyId_forumId: { companyId, forumId: expId } },
          update: { enabled: true },
          create: { companyId, forumId: expId, enabled: true },
        });
      } else {
        console.error("[AutoBind] no exp_ found for company", { companyId, nodesCount: companyNodes.length, foundForumExp: forumExp, expId });
      }
    } catch (e) {
      console.error("[AutoBind] error", { companyId, error: e });
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Forum Bindings</h1>
      <p className="text-sm text-gray-600">Bind your Whop forum(s) to this app.</p>
      {/* Simple manual bind UI for now */}
      <div className="flex items-center gap-3">
        <BindForm companyId={companyId} />
        <AutoBindButton companyId={companyId} />
      </div>
      <BindingsList companyId={companyId} />
    </div>
  );
}

async function BindingsList({ companyId }: { companyId: string }) {
  const bindings = await prisma.forumBinding.findMany({ where: { companyId, enabled: true } });
  if (bindings.length === 0) return <div className="text-sm text-gray-500">No bindings.</div>;
  return (
    <ul className="list-disc pl-5">
      {bindings.map((b, i) => (
        <li key={i} className="flex items-center gap-3 text-sm">
          <span>Forum: {b.forumId}</span>
          <RemoveBindingForm companyId={companyId} forumId={b.forumId} />
        </li>
      ))}
    </ul>
  );
}

function AutoBindButton({ companyId }: { companyId: string }) {
  async function onAuto() {
    "use server";
    try {
      // Query experiences for this company as the signed-in user
      const headersList = await headers();
      const { userId } = await whopSdk.verifyUserToken(headersList);
      const sdkAny: any = whopSdk as any;
      const sdkWithUser = typeof sdkAny.withUser === "function" ? sdkAny.withUser(userId) : sdkAny;
      const resp: any = await sdkWithUser.experiences.listExperiences({ companyId, first: 50 });
      const allNodes: any[] = resp?.company?.experiencesV2?.nodes ?? resp?.nodes ?? resp?.experiences ?? [];
      
      // Filter to experiences for this specific company
      const companyNodes = allNodes.filter((e: any) => {
        const expCompanyId = e?.companyId ?? e?.company?.id ?? e?.company_id;
        return String(expCompanyId ?? "").toLowerCase() === companyId.toLowerCase();
      });
      
      const forumExp = companyNodes.find((e: any) =>
        (e?.type && String(e.type).toLowerCase().includes("forum")) ||
        (e?.appKey && String(e.appKey).toLowerCase().includes("forum")) ||
        (e?.name && String(e.name).toLowerCase().includes("forum"))
      );
      const expId: string | undefined = forumExp?.id ?? forumExp?.experienceId;
      if (expId?.startsWith("exp_")) {
        await prisma.forumBinding.upsert({
          where: { companyId_forumId: { companyId, forumId: expId } },
          update: { enabled: true },
          create: { companyId, forumId: expId, enabled: true },
        });
      }
    } catch {}
  }
  return (
    <form action={onAuto}>
      <button type="submit" className="px-3 py-2 border rounded">Auto-bind forum</button>
    </form>
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

    // If we received a forums-* slug, resolve it to an experience (exp_*) id
    let resolvedForumId = forumId;
    if (forumId.startsWith("forums-")) {
      try {
        const resp: any = await whopSdk.experiences.listExperiences({ companyId, first: 50 });
        const nodes: any[] = resp?.nodes ?? resp?.experiences ?? [];
        const hit = nodes.find((e: any) =>
          String(e?.slug ?? "").toLowerCase() === forumId.toLowerCase() ||
          String(e?.name ?? "").toLowerCase() === forumId.toLowerCase()
        );
        const expId: string | undefined = hit?.id ?? hit?.experienceId;
        if (expId?.startsWith("exp_")) resolvedForumId = expId;
      } catch {}
    }
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);
    const access = await whopSdk.access.checkIfUserHasAccessToCompany({ userId, companyId });
    if (!access.hasAccess || access.accessLevel !== "admin") return;

    await prisma.forumBinding.upsert({
      where: { companyId_forumId: { companyId, forumId: resolvedForumId } },
      update: { enabled: true },
      create: { companyId, forumId: resolvedForumId, enabled: true },
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

function RemoveBindingForm({ companyId, forumId }: { companyId: string; forumId: string }) {
  async function onRemove() {
    "use server";
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);
    const access = await whopSdk.access.checkIfUserHasAccessToCompany({ userId, companyId });
    if (!access.hasAccess || access.accessLevel !== "admin") return;
    await prisma.forumBinding.updateMany({ where: { companyId, forumId }, data: { enabled: false } });
  }
  return (
    <form action={onRemove}>
      <button className="text-red-600">Remove</button>
    </form>
  );
}


