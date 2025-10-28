import { headers } from "next/headers";
import { whopSdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/prisma";

export default async function ForumViewerPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const headersList = await headers();
  const { experienceId } = await params;
  const { userId } = await whopSdk.verifyUserToken(headersList);

  const access = await whopSdk.access.checkIfUserHasAccessToExperience({ userId, experienceId });
  if (!access.hasAccess) return <div className="p-6">No access</div>;

  // Resolve company and forum binding
  const exp = await whopSdk.experiences.getExperience({ experienceId });
  const companyIdFromExp = (exp as any)?.company?.id ?? (exp as any)?.companyId ?? (exp as any)?.company_id ?? process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
  // Try to find ANY enabled binding for this company; fall back to companyId from exp
  const binding = await prisma.forumBinding.findFirst({ where: { companyId: companyIdFromExp, enabled: true } });
  if (!binding) {
    return (
      <div className="p-6">
        <div>No forum bound for this company.</div>
        <div className="text-xs mt-2">Company from experience: {companyIdFromExp}</div>
      </div>
    );
  }

  // Resolve bound forum to an exp_* id if a forums-* slug was saved
  let resolvedExperienceId = binding.forumId;
  if (resolvedExperienceId.startsWith("forums-")) {
    try {
      const sdkAny: any = whopSdk as any;
      const sdkWithUser = typeof sdkAny.withUser === "function" ? sdkAny.withUser(userId) : sdkAny;
      const resp: any = await sdkWithUser.experiences.listExperiences({ companyId: companyIdFromExp, first: 50 });
      const nodes: any[] = resp?.company?.experiencesV2?.nodes ?? resp?.nodes ?? resp?.experiences ?? [];
      const forumExp = nodes.find((e: any) =>
        (e?.type && String(e.type).toLowerCase().includes("forum")) ||
        (e?.appKey && String(e.appKey).toLowerCase().includes("forum")) ||
        (e?.app?.name && String(e.app.name).toLowerCase().includes("forum")) ||
        (e?.name && String(e.name).toLowerCase().includes("forum"))
      );
      const expId: string | undefined = forumExp?.id ?? forumExp?.experienceId;
      if (expId?.startsWith("exp_")) {
        resolvedExperienceId = expId;
      }
    } catch {}
  }

  // List posts from the bound forum experience
  let posts: Array<{ 
    id: string; 
    content?: string | null; 
    authorId?: string | null; 
    authorName?: string | null;
    metadata?: any;
    authorUser?: any;
  }> = [];
  let rawResponse: any = null;
  let debugError: Error | null = null;
  try {
    console.log("[ForumViewer] calling listForumPostsFromForum", { bindingForumId: binding.forumId, resolvedExperienceId });
    const res: any = await whopSdk.forums.listForumPostsFromForum({ experienceId: resolvedExperienceId });
    rawResponse = res;
    console.log("[ForumViewer] raw response", { res, keys: Object.keys(res || {}) });
    const feed = res?.feedPosts;
    console.log("[ForumViewer] feed", { feed, keys: Object.keys(feed || {}) });
    // Try different response shapes
    const items: any[] = feed?.nodes ?? res?.posts ?? feed?.posts ?? [];
    console.log("[ForumViewer] items", { itemsCount: items.length, items });
    
    // Get all post IDs and fetch metadata and user data
    const postIds = items.map((p: any) => p?.id ?? "").filter(Boolean);
    const metadataRecords = await prisma.postMetadata.findMany({
      where: { postId: { in: postIds }, companyId: companyIdFromExp },
    });
    const metadataMap = new Map(metadataRecords.map(m => [m.postId, m.dataJson]));
    
    // Fetch user details for unique author IDs
    const uniqueAuthorIds = [...new Set(items.map((p: any) => p?.user?.id ?? p?.author?.id ?? p?.userId).filter(Boolean))];
    const userMap = new Map();
    for (const authorId of uniqueAuthorIds) {
      try {
        const authorUser = await whopSdk.users.getUser({ userId: authorId });
        userMap.set(authorId, authorUser);
      } catch (err) {
        console.error("[ForumViewer] failed to fetch user", { authorId, error: err });
      }
    }
    
    posts = items.map((p: any) => ({
      id: p?.id ?? "",
      content: p?.content ?? p?.title ?? "",
      authorId: p?.user?.id ?? p?.author?.id ?? p?.userId,
      authorName: p?.user?.name ?? p?.author?.name,
      metadata: metadataMap.get(p?.id) ?? null,
      authorUser: userMap.get(p?.user?.id ?? p?.author?.id ?? p?.userId) ?? null,
    })).filter((p) => p.id);
  } catch (err) {
    debugError = err as Error;
    console.error("[ForumViewer] listForumPostsFromForum error", { bindingForumId: binding.forumId, error: err });
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Forum</h1>
      <div className="text-xs text-gray-500 mb-4">
        Binding: {binding.forumId} | Company: {companyIdFromExp}
      </div>

      {posts.length === 0 ? (
        <>
          <div className="text-sm text-gray-500">No posts to show yet.</div>
          <details className="mt-4 text-xs">
            <summary>Debug: Raw API response</summary>
            <pre className="mt-2 p-3 bg-gray-900 rounded overflow-auto">
              {JSON.stringify({ bindingForumId: binding.forumId, postsCount: posts.length, rawPosts: posts, rawResponse, debugError }, null, 2)}
            </pre>
          </details>
        </>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500">
                  By {p.authorName ?? "Unknown"} {p.authorUser && `(@${p.authorUser.username})`}
                </div>
                {p.authorUser && (
                  <div className="text-xs text-gray-400">
                    {p.authorUser.email ? `📧 ${p.authorUser.email}` : ''}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-700 mb-2">{p.content}</div>
              {p.metadata && typeof p.metadata === 'object' && Object.keys(p.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t text-xs">
                  <div className="font-semibold text-gray-600 mb-1">Custom Fields:</div>
                  <div className="space-y-1">
                    {Object.entries(p.metadata).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-gray-500">{key}:</span>
                        <span className="text-gray-700">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


