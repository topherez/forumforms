import { headers } from "next/headers";
import { whopSdk } from "@/lib/whop-sdk";

export default async function ForumViewerPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const headersList = await headers();
  const { experienceId } = await params;
  const { userId } = await whopSdk.verifyUserToken(headersList);

  // 1) Ensure the viewer has access to this experience (Whop iframe provides token)
  const access = await whopSdk.access.checkIfUserHasAccessToExperience({ userId, experienceId });
  if (!access.hasAccess) return <div className="p-6">No access</div>;

  // 2) Resolve a forum experience for this company (prefer REST forums list, then GraphQL discovery)
  async function tryFetch(url: string, headers: Record<string, string>) {
    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      const text = await res.text();
      const body: any = (() => { try { return JSON.parse(text); } catch { return text; } })();
      return { ok: res.ok, status: res.status, body } as const;
    } catch (e: any) {
      return { ok: false, status: 0, body: String(e?.message ?? e) } as const;
    }
  }
  let forumExpId: string | null = null;
  let debugSteps: any[] = [];
  const commonHeaders = {
    Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
    Accept: "application/json",
    "App-Id": process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "",
  } as Record<string, string>;
  // REST first (two possible bases)
  for (const base of ["https://api.whop.com/api/v5", "https://api.whop.com/v5"]) {
    const url = `${base}/forums?company_id=${encodeURIComponent((experience as any)?.company?.id ?? "")}&first=10`;
    const res = await tryFetch(url, commonHeaders);
    debugSteps.push({ step: "rest_forums", base, status: res.status, sample: typeof res.body === "string" ? res.body : (res.body?.data ? res.body.data.length : undefined) });
    if (res.ok && Array.isArray((res.body as any)?.data) && (res.body as any).data.length > 0) {
      forumExpId = (res.body as any).data[0]?.experience?.id ?? null;
      break;
    }
  }
  // GraphQL fallback
  if (!forumExpId) {
    try {
      const sdkAny: any = whopSdk as any;
      const scopedUser = typeof sdkAny.withUser === "function" ? sdkAny.withUser(userId) : sdkAny;
      const scoped = typeof scopedUser.withCompany === "function" ? scopedUser.withCompany((experience as any)?.company?.id) : scopedUser;
      const resp: any = await scoped.experiences.listExperiences({ companyId: (experience as any)?.company?.id, first: 50 });
      const nodes: any[] = resp?.company?.experiencesV2?.nodes ?? resp?.nodes ?? resp?.experiences ?? [];
      debugSteps.push({ step: "gql_list_experiences", count: nodes.length });
      const forumExp = nodes.find((e: any) => String(e?.app?.name ?? e?.name ?? "").toLowerCase().includes("forum") || String(e?.route ?? e?.slug ?? "").toLowerCase().startsWith("forums-"));
      forumExpId = forumExp?.id ?? forumExp?.experienceId ?? null;
    } catch (e: any) {
      debugSteps.push({ step: "gql_list_experiences_error", error: String(e?.message ?? e) });
    }
  }

  // 3) Load posts using the resolved exp id, falling back to the current experience id as a last resort
  const targetExpId = forumExpId ?? experienceId;
  let posts: Array<{ id: string; content?: string | null; authorName?: string | null }> = [];
  let loadError: string | null = null;
  try {
    const res: any = await whopSdk.forums.listForumPostsFromForum({ experienceId: targetExpId });
    const items: any[] = res?.feedPosts?.nodes ?? res?.posts ?? [];
    posts = items.map((p: any) => ({
      id: p?.id ?? "",
      content: p?.content ?? p?.title ?? "",
      authorName: p?.user?.name ?? p?.author?.name ?? null,
    })).filter((p) => p.id);
  } catch (e: any) {
    loadError = String(e?.message ?? e);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Forum</h1>
      <div className="text-xs text-gray-500 mb-4">Company: {(experience as any)?.company?.id} • Forum exp: {forumExpId ?? "(fallback to current)"}</div>
      {posts.length === 0 ? (
        <>
          <div className="text-sm text-gray-500">No posts to show yet.{loadError ? ` (${loadError})` : ""}</div>
          <details className="text-xs">
            <summary>Debug</summary>
            <pre className="mt-2 p-3 bg-gray-900 rounded overflow-auto">{JSON.stringify({ debugSteps }, null, 2)}</pre>
          </details>
        </>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="border rounded p-3">
              <div className="text-xs text-gray-500 mb-1">By {p.authorName ?? "Unknown"}</div>
              <div className="text-sm text-gray-700">{p.content}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


