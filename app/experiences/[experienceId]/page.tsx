import { headers } from "next/headers";
import ExperienceFeedClient from "./ExperienceFeedClient";

interface PageProps {
  params: { experienceId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function ExperienceForumPage({ params, searchParams }: PageProps) {
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
  const referer = h.get("referer") || "";
  const refererExp = referer.match(/(exp_[A-Za-z0-9]+)/)?.[1] || null;
  const queryId = normalize(
    typeof searchParams?.experienceId === "string"
      ? (searchParams?.experienceId as string)
      : Array.isArray(searchParams?.experienceId)
      ? (searchParams?.experienceId?.[0] as string)
      : undefined
  );
  const experienceId = routeId || headerId || queryId || refererExp;
  const companyIdHeader = h.get("x-whop-company-id") || undefined;
  const companyIdQuery =
    typeof searchParams?.companyId === "string"
      ? (searchParams?.companyId as string)
      : Array.isArray(searchParams?.companyId)
      ? (searchParams?.companyId?.[0] as string)
      : undefined;
  const companyId = companyIdHeader || companyIdQuery || undefined;

  // Attempt to fetch posts via SDK or fall back to API
  // Server no longer lists; client component handles fallback/UI
  // Prefer DB binding resolution
  let resolvedExperienceId = experienceId as string | undefined;
  if (companyId) {
    try {
      const b = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/bindings?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" });
      const bj = (await b.json().catch(() => ({}))) as any;
      const bound = bj?.bindings?.[0]?.forumId as string | undefined;
      if (bound?.startsWith("exp_")) resolvedExperienceId = bound;
    } catch {}
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Forum Feed</h1>
      <ExperienceFeedClient
        initialExperienceId={resolvedExperienceId ?? experienceId ?? null}
        initialCompanyId={companyId ?? null}
      />
    </div>
  );
}


