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

  // SDK typing may vary by version; use any to avoid type conflicts here
  const resp: any = await (sdk as any)?.forumPosts?.listForumPosts?.(listArgs);

  const posts: any[] = resp?.data ?? resp?.items ?? [];
  const pageInfo = resp?.page_info ?? resp?.pageInfo ?? null;

  if (!Array.isArray(posts) || posts.length === 0) {
    notFound();
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Forum Feed</h1>
      <ul className="space-y-2">
        {posts.map((post: any) => (
          <li key={post.id} className="border p-3 rounded bg-white">
            <h2 className="text-xl font-semibold">{post.title}</h2>
            {post.content ? (
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">{post.content}</p>
            ) : null}
            <div className="text-sm text-gray-500 mt-3">
              By {post.user?.name || post.user?.username || "Unknown"}
              {typeof post.like_count === "number" ? ` • ${post.like_count} likes` : ""}
              {typeof post.comment_count === "number" ? ` • ${post.comment_count} comments` : ""}
            </div>
          </li>
        ))}
      </ul>
      {pageInfo?.has_next_page && (
        <div className="pt-4 text-center text-base text-gray-600">More posts available…</div>
      )}
    </div>
  );
}


