import { whopSdk } from "@/lib/whop-sdk";

export type CreateForumPostArgs = {
  forumId: string;
  title: string;
  content: string;
  userId: string;
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
  const { forumId, title, content, userId } = args;

  try {
    // Whop SDK exposes a createForumPost mutation; use forum experience id and content.
    // Title support varies; include it in content if the API doesn't accept a title.
    const payload: any = {
      forumExperienceId: forumId,
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
      console.log("[forum-service] createForumPost succeeded", { forumId, postId, postUrl });
      return { postId, postUrl };
    }
    console.warn("[forum-service] createForumPost returned no id", { forumId, resultKeys: Object.keys(created || {}) });
  } catch (err) {
    console.error("[forum-service] createForumPost error", { forumId, error: err });
  }
  return null;
}


