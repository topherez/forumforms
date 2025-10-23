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

  // Best-effort: list recent posts using the SDK’s forums feed if available
  let posts: Array<{ id: string; content?: string | null }> = [];
  try {
    const res: any = await (whopSdk as any).forums.listForumPostsFromForum({ experienceId });
    const items: any[] = Array.isArray(res?.nodes ?? res) ? (res.nodes ?? res) : [];
    posts = items.map((p: any) => ({ id: p?.id ?? "", content: p?.content ?? p?.title ?? "" })).filter((p) => p.id);
  } catch {
    // If not available, render a helpful message
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Forum</h1>
      {posts.length === 0 ? (
        <div className="text-sm text-gray-500">No posts to show yet.</div>
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


