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
  const referer = h.get("referer") || "";
  const refererExp = referer.match(/(exp_[A-Za-z0-9]+)/)?.[1] || null;
  const experienceId = routeId || headerId || queryId || refererExp;
  const companyIdHeader = h.get("x-whop-company-id") || undefined;
  const companyIdQuery =
    typeof searchParams?.companyId === "string"
      ? (searchParams?.companyId as string)
      : Array.isArray(searchParams?.companyId)
      ? (searchParams?.companyId?.[0] as string)
      : undefined;
  const companyId = companyIdHeader || companyIdQuery || undefined;

  // Server no longer does listing; client component handles fallbacks

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Forum Feed</h1>
      <ExperienceFeedClient
        initialExperienceId={experienceId ?? null}
        initialCompanyId={companyId ?? null}
      />
    </div>
  );
}


