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
    if (v.startsWith("[")) return null;
    if (v.includes("experienceId")) return null;
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
  const companyIdHeader = h.get("x-whop-company-id") || undefined;
  const companyIdQuery =
    typeof searchParams?.companyId === "string"
      ? (searchParams?.companyId as string)
      : Array.isArray(searchParams?.companyId)
      ? (searchParams?.companyId?.[0] as string)
      : undefined;
  const companyId = companyIdHeader || companyIdQuery || undefined;

  if (!experienceId) {
    // Fallback: try company context then let the user choose
    const companyId = normalize(h.get("x-whop-company-id"));
    let experiences: any[] = [];
    try {
      if (companyId) {
        // Prefer forums.list -> experience.id for direct forum experiences
        const respForums: any = await (sdk as any).forums.list({ company_id: companyId, first: 50 });
        const forums: any[] = respForums?.data ?? respForums?.items ?? [];
        experiences = forums
          .map((f: any) => ({ id: f?.experience?.id, name: f?.experience?.name }))
          .filter((e: any) => Boolean(e?.id));
        // Fallback: experiences.list if forums is empty
        if (experiences.length === 0) {
          const respExps: any = await (sdk as any).experiences.list({ company_id: companyId, first: 50 });
          experiences = (respExps?.data ?? respExps?.items ?? []).map((e: any) => ({ id: e.id, name: e.name }));
        }
      }
    } catch {}
    const whopHeaders: Array<[string, string]> = [];
    h.forEach((value, key) => {
      if (key.startsWith("x-whop-")) whopHeaders.push([key, value]);
    });
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm text-gray-600">Select an experience to view its forum.</div>
        <ul className="space-y-2">
          {experiences.map((e: any) => (
            <li key={e.id}>
              <a className="text-indigo-600 hover:underline" href={`/experience/${e.id}`}>{e.name || e.id}</a>
            </li>
          ))}
          {experiences.length === 0 && (
            <li className="text-sm text-gray-500">No experiences found in this context.</li>
          )}
        </ul>
        <details className="text-xs text-gray-500">
          <summary>Debug headers</summary>
          <pre>{JSON.stringify(Object.fromEntries(whopHeaders), null, 2)}</pre>
        </details>
      </div>
    );
  }

  // Prefer resolving via DB binding (companyId) so we always hit the correct
  // forum experience saved from the dashboard. Fallback to route param.
  let resolvedExperienceId = experienceId as string | undefined;
  if (companyId) {
    try {
      const b = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/bindings?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" });
      const bj = (await b.json().catch(() => ({}))) as any;
      const bound = bj?.bindings?.[0]?.forumId as string | undefined;
      if (bound?.startsWith("exp_")) resolvedExperienceId = bound;
    } catch {}
  }

  let posts: any[] = [];
  let pageInfo: any = null;
  if (resolvedExperienceId) {
    const sdk = getWhopSdk();
    const resp: any = await (sdk as any).forumPosts.list({ experience_id: resolvedExperienceId, first: 20 });
    posts = resp?.data ?? resp?.items ?? [];
    pageInfo = resp?.page_info ?? resp?.pageInfo ?? null;
  } else if (companyId) {
    const qs = new URLSearchParams({ companyId }).toString();
    const apiResp = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/forum?${qs}`, { cache: "no-store" });
    const json = (await apiResp.json().catch(() => ({}))) as any;
    posts = json?.posts ?? [];
    pageInfo = json?.pageInfo ?? null;
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


