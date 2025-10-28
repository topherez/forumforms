import { redirect } from "next/navigation";
import { whopSdk } from "@/lib/whop-sdk";

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const companyIdFromQuery = typeof sp.companyId === "string" ? sp.companyId : undefined;
  const companyRouteFromQuery = typeof sp.companyRoute === "string" ? sp.companyRoute : undefined;

  let targetCompanyId = companyIdFromQuery;

  // If a route/slug was provided instead of a biz_ id, resolve it to a company id
  if (!targetCompanyId && companyRouteFromQuery) {
    try {
      // The SDK accepts either a company id (biz_*) or a route slug
      const resp: any = await whopSdk.companies.getCompany({ companyId: companyRouteFromQuery });
      const company = resp?.company ?? resp;
      if (company?.id) targetCompanyId = company.id as string;
    } catch {}
  }

  // If still missing, send users to a generic discover page in our app
  if (!targetCompanyId) {
    redirect("/discover");
  }

  redirect(`/dashboard/${targetCompanyId}/forums`);
}


