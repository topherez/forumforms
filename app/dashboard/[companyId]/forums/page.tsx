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

  // If no binding exists, try to auto-detect a forum experience and bind it once for convenience
  const existing = await prisma.forumBinding.findFirst({ where: { companyId, enabled: true } });
  if (!existing) {
    try {
      const sdkAny: any = whopSdk as any;
      const scoped = typeof sdkAny.withCompany === "function" ? sdkAny.withCompany(companyId) : sdkAny;
      const resp: any = await scoped.experiences.listExperiences({ first: 50 });
      const nodes: any[] = resp?.nodes ?? resp?.experiences ?? [];
      const forumExp = nodes.find((e: any) =>
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
    const sdkAny: any = whopSdk as any;
    const scoped = typeof sdkAny.withCompany === "function" ? sdkAny.withCompany(companyId) : sdkAny;
    try {
      const resp: any = await scoped.experiences.listExperiences({ first: 50 });
      const nodes: any[] = resp?.nodes ?? resp?.experiences ?? [];
      const forumExp = nodes.find((e: any) =>
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
        const resp: any = await (whopSdk as any).experiences.listExperiences({ first: 50 });
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


