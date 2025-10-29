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

  // Access check
  const access = await whopSdk.access.checkIfUserHasAccessToExperience({ userId, experienceId });
  if (!access.hasAccess) return <div className="p-6">No access</div>;

  // Get company id from the experience
  const experience = await whopSdk.experiences.getExperience({ experienceId });
  const companyId = (experience as any)?.company?.id as string | undefined;
  if (!companyId) return <div className="p-6">Could not determine company.</div>;

  // REST: list experiences for the company to discover the Forum exp_ id
  let forumExpId: string | null = null;
  let expsStatus: number | null = null;
  let expsBody: any = null;
  let expsError: string | null = null;
  try {
    const res = await fetch(`https://api.whop.com/v5/experiences?company_id=${encodeURIComponent(companyId)}&first=50`, {
      headers: {
        Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    expsStatus = res.status;
    const text = await res.text();
    try { expsBody = JSON.parse(text); } catch { expsBody = text; }
    if (!res.ok) {
      expsError = typeof expsBody === "string" ? expsBody : (expsBody?.message ?? JSON.stringify(expsBody));
    } else {
      const nodes: any[] = (expsBody as any)?.data ?? [];
      const forumExp = nodes.find((e: any) =>
        String(e?.app?.name ?? "").toLowerCase().includes("forum") ||
        String(e?.route ?? e?.slug ?? "").toLowerCase().startsWith("forums-")
      );
      forumExpId = forumExp?.id ?? null;
    }
  } catch (e: any) {
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


