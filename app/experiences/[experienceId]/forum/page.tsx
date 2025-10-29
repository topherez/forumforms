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

  // 2) Load forum posts for THIS experience (the forum app should be attached to this exp_)
  let posts: Array<{ id: string; content?: string | null; authorName?: string | null }> = [];
  let loadError: string | null = null;
  try {
    const res: any = await whopSdk.forums.listForumPostsFromForum({ experienceId });
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
      <div className="text-xs text-gray-500 mb-4">Experience: {experienceId}</div>
      {posts.length === 0 ? (
        <div className="text-sm text-gray-500">No posts to show yet.{loadError ? ` (${loadError})` : ""}</div>
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


