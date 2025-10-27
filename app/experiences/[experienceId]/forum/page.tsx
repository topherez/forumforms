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
  const companyId = (exp as any)?.companyId ?? (exp as any)?.company_id ?? process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
  if (!companyId) return <div className="p-6">Missing company</div>;
  const binding = await prisma.forumBinding.findFirst({ where: { companyId, enabled: true } });
  if (!binding) return <div className="p-6">No forum bound for this company.</div>;

  // List posts from the bound forum experience
  let posts: Array<{ id: string; content?: string | null; authorId?: string | null }> = [];
  let rawResponse: any = null;
  let debugError: Error | null = null;
  try {
    console.log("[ForumViewer] calling listForumPostsFromForum", { bindingForumId: binding.forumId });
    const res: any = await whopSdk.forums.listForumPostsFromForum({ experienceId: binding.forumId });
    rawResponse = res;
    console.log("[ForumViewer] raw response", { res, keys: Object.keys(res || {}) });
    const feed = res?.feedPosts;
    console.log("[ForumViewer] feed", { feed, keys: Object.keys(feed || {}) });
    const items: any[] = feed?.nodes ?? [];
    console.log("[ForumViewer] items", { itemsCount: items.length, items });
    posts = items.map((p: any) => ({
      id: p?.id ?? "",
      content: p?.content ?? p?.title ?? "",
      authorId: p?.author?.id ?? p?.userId,
    })).filter((p) => p.id);
  } catch (err) {
    debugError = err as Error;
    console.error("[ForumViewer] listForumPostsFromForum error", { bindingForumId: binding.forumId, error: err });
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Forum</h1>
      <div className="text-xs text-gray-500 mb-4">
        Binding: {binding.forumId} | Company: {companyId}
      </div>

      {posts.length === 0 ? (
        <>
          <div className="text-sm text-gray-500">No posts to show yet.</div>
          <details className="mt-4 text-xs">
            <summary>Debug: Raw API response</summary>
            <pre className="mt-2 p-3 bg-gray-900 rounded overflow-auto">
              {JSON.stringify({ bindingForumId: binding.forumId, postsCount: posts.length, rawPosts: posts }, null, 2)}
            </pre>
          </details>
        </>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="border rounded p-3">
              <div className="text-sm font-medium">{p.id}</div>
              <div className="text-sm text-gray-600 truncate">{p.content}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


