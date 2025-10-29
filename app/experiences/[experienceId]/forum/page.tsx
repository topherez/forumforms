import { headers } from "next/headers";
import { whopSdk } from "@/lib/whop-sdk";

export default async function ForumViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ experienceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const headersList = await headers();
  const { experienceId } = await params;
  const sp = await searchParams;
  const rawOverride = (typeof sp.forumExpId === "string" ? sp.forumExpId : undefined) || (typeof sp.forum === "string" ? sp.forum : undefined) || (typeof sp.slug === "string" ? sp.slug : undefined);
  const { userId } = await whopSdk.verifyUserToken(headersList);

  // Access check
  const access = await whopSdk.access.checkIfUserHasAccessToExperience({ userId, experienceId });
  if (!access.hasAccess) return <div className="p-6">No access</div>;

  // Get company id from the experience
  const experience = await whopSdk.experiences.getExperience({ experienceId });
  const companyId = (experience as any)?.company?.id as string | undefined;
  if (!companyId) return <div className="p-6">Could not determine company.</div>;

  // SDK (GraphQL): list experiences for this company via withUser + withCompany
  let forumExpId: string | null = rawOverride?.startsWith("exp_") ? rawOverride : null;
  let expsStatus: number | null = null;
  let expsBody: any = null;
  let expsError: string | null = null;
  try {
    const sdkAny: any = whopSdk as any;
    const scopedUser = typeof sdkAny.withUser === "function" ? sdkAny.withUser(userId) : sdkAny;
    const scoped = typeof scopedUser.withCompany === "function" ? scopedUser.withCompany(companyId) : scopedUser;
    const resp: any = await scoped.experiences.listExperiences({ companyId, first: 50 });
    const nodes: any[] = resp?.company?.experiencesV2?.nodes ?? resp?.nodes ?? resp?.experiences ?? [];
    expsStatus = 200;
    expsBody = { count: nodes.length };
    const forumExp = nodes.find((e: any) =>
      String(e?.app?.name ?? e?.name ?? "").toLowerCase().includes("forum") ||
      String(e?.route ?? e?.slug ?? "").toLowerCase().startsWith("forums-")
    );
    forumExpId = forumExpId ?? (forumExp?.id ?? forumExp?.experienceId ?? null);
  } catch (e: any) {
    expsStatus = 500;
    expsError = String(e?.message ?? e);
  }

  if (!forumExpId) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Forum</h1>
        <div className="text-sm text-gray-500">No forum experience found for this company.</div>
        <details className="text-xs">
          <summary>Debug</summary>
          <pre className="mt-2 p-3 bg-gray-900 rounded overflow-auto">{JSON.stringify({ companyId, expsStatus, expsError, expsBody }, null, 2)}</pre>
        </details>
      </div>
    );
  }

  // Fetch posts using the exp_ id
  let posts: Array<{ id: string; content?: string | null; authorName?: string | null }> = [];
  try {
    const res: any = await whopSdk.forums.listForumPostsFromForum({ experienceId: forumExpId });
    const items: any[] = res?.feedPosts?.nodes ?? res?.posts ?? [];
    posts = items.map((p: any) => ({
      id: p?.id ?? "",
      content: p?.content ?? p?.title ?? "",
      authorName: p?.user?.name ?? p?.author?.name ?? null,
    })).filter((p) => p.id);
  } catch {}

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Forum</h1>
      <div className="text-xs text-gray-500 mb-4">Company: {companyId} • Forum: {forumExpId}</div>
      {posts.length === 0 ? (
        <div className="text-sm text-gray-500">No posts to show yet.</div>
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


