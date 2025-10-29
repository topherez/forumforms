import { headers } from "next/headers";
import { getWhopSdk } from "@/lib/whop-sdk";

interface PageProps {
  params: { experienceId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function ExperienceForumPage({ params, searchParams }: PageProps) {
  const sdk = getWhopSdk();
  const normalize = (v?: string | null) => {
    if (!v) return null;
    if (v === "undefined") return null;
    if (v.startsWith("[")) return null; // literal placeholder
    if (v.includes("experienceId")) return null; // un-replaced token
    return v;
  };
  const routeId = normalize(params.experienceId);
  const h = await headers();
  const headerId = normalize(h.get("x-whop-experience-id"));
  const queryId = normalize(
    typeof searchParams?.experienceId === "string"
      ? (searchParams?.experienceId as string)
      : Array.isArray(searchParams?.experienceId)
      ? (searchParams?.experienceId?.[0] as string)
      : undefined
  );
  const experienceId = routeId || headerId || queryId;

  // Attempt to fetch posts via SDK. Adjust method names if SDK differs.
  // Expecting shape: { data, page_info } or similar
  // Pinned first; fall back gracefully if parameter unsupported
  if (!experienceId) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Missing experience ID. Ensure Hosting path is set to <code>/experiences/:experienceId</code>.
      </div>
    );
  }
  const listArgs: Record<string, unknown> = { experience_id: experienceId, limit: 20 };
  // SDK v0.0.2 uses `.forumPosts.list(query)`
  const resp: any = await (sdk as any)?.forumPosts?.list?.(listArgs);

  const posts: any[] = resp?.data ?? resp?.items ?? [];
  const pageInfo = resp?.page_info ?? resp?.pageInfo ?? null;

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
        {posts.length === 0 && (
          <li className="text-sm text-gray-500">No forum posts yet.</li>
        )}
      </ul>
      {pageInfo?.has_next_page && (
        <div className="pt-4 text-center text-base text-gray-600">More posts available…</div>
      )}
    </div>
  );
}


