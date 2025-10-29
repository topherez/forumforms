import { notFound } from "next/navigation";
import { getWhopSdk } from "@/lib/whop-sdk";

interface PageProps {
  params: { experienceId: string };
}

export default async function ExperienceForumPage({ params }: PageProps) {
  const sdk = getWhopSdk();
  const experienceId = params.experienceId;

  // Attempt to fetch posts via SDK. Adjust method names if SDK differs.
  // Expecting shape: { data, page_info } or similar
  // Pinned first; fall back gracefully if parameter unsupported
  const listArgs: Record<string, unknown> = { experience_id: experienceId, first: 20 };
  try {
    // Prefer pinned first if supported
    listArgs.pinned = true;
  } catch {}

  // @ts-expect-error - SDK typing may vary by version
  const resp = await sdk?.forumPosts?.listForumPosts?.(listArgs);

  const posts: any[] = resp?.data ?? resp?.items ?? [];
  const pageInfo = resp?.page_info ?? resp?.pageInfo ?? null;

  if (!Array.isArray(posts) || posts.length === 0) {
    notFound();
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-7 font-bold">Forum Feed</h1>
      <ul className="space-y-2">
        {posts.map((post: any) => (
          <li key={post.id} className="border p-3 rounded bg-white">
            <h2 className="text-5 font-semibold">{post.title}</h2>
            {post.content ? (
              <p className="text-gray-6 mt-2 whitespace-pre-wrap">{post.content}</p>
            ) : null}
            <div className="text-2 text-gray-5 mt-3">
              By {post.user?.name || post.user?.username || "Unknown"}
              {typeof post.like_count === "number" ? ` • ${post.like_count} likes` : ""}
              {typeof post.comment_count === "number" ? ` • ${post.comment_count} comments` : ""}
            </div>
          </li>
        ))}
      </ul>
      {pageInfo?.has_next_page && (
        <div className="pt-4 text-center text-3 text-gray-6">More posts available…</div>
      )}
    </div>
  );
}


