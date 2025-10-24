import { whopSdk } from "@/lib/whop-sdk";

export type CreateForumPostArgs = {
  forumId: string;
  title: string;
  content: string;
  userId: string;
  companyId: string;
};

export type CreateForumPostResult = {
  postId: string;
  postUrl?: string;
};

// Thin abstraction around Whop forum APIs. If/when the SDK exposes forum endpoints,
// plug them in here and keep the rest of the app unchanged.
export async function createForumPost(
  args: CreateForumPostArgs,
): Promise<CreateForumPostResult | null> {
  const { forumId, title, content, userId, companyId } = args;

  try {
    // Resolve forums-* slug to exp_* id if necessary
    let forumExperienceId = forumId;
    if (forumId.startsWith("forums-")) {
      try {
        const sdkAny: any = whopSdk as any;
        const scoped = typeof sdkAny.withCompany === "function" ? sdkAny.withCompany(companyId) : sdkAny;
        const resp: any = await scoped.experiences.listExperiences({ first: 50, companyId });
        const companies = resp?.company ?? resp;
        const nodes: any[] = companies?.experiencesV2?.nodes ?? resp?.nodes ?? [];
        const hit = nodes.find((e: any) =>
          String(e?.route ?? e?.slug ?? "").toLowerCase().includes(forumId.toLowerCase())
        );
        const expId: string | undefined = hit?.id ?? hit?.experienceId ?? hit?.experience?.experienceId;
        if (expId?.startsWith("exp_")) forumExperienceId = expId;
      } catch (e) {
        console.warn("[forum-service] could not resolve forums slug to exp id", { forumId, error: e });
      }
    }

    // Whop SDK exposes a createForumPost mutation; use forum experience id and content.
    // Title support varies; include it in content if the API doesn't accept a title.
    const payload: any = {
      forumExperienceId,
      content: (title ? `${title}\n\n` : "") + (content || ""),
      isMention: false,
    };
    // The REST docs indicate experience_id + (title or content) are required — ensure at least one
    if (title) payload.title = title;

    // Execute as the member so posts are authored by the user
    const sdkAny: any = whopSdk as any;
    const client = typeof sdkAny.withUser === "function" && userId
      ? sdkAny.withUser(userId)
      : sdkAny;

    const res: any = await client.forums.createForumPost(payload);
    const created: any = res?.createForumPost ?? res;
    const postId: string | undefined = created?.id ?? created?.postId ?? created?.post?.id;
    const postUrl: string | undefined = created?.url ?? created?.postUrl ?? created?.post?.url;
    if (postId) {
      console.log("[forum-service] createForumPost succeeded", { forumExperienceId, postId, postUrl });
      return { postId, postUrl };
    }
    console.warn("[forum-service] createForumPost returned no id", { forumExperienceId, resultKeys: Object.keys(created || {}) });
  } catch (err) {
    console.error("[forum-service] createForumPost error", { forumId, companyId, error: err });
  }
  return null;
}


