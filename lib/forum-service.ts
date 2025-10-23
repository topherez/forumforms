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
  void userId; // whopSdk authenticates via headers; user context is verified upstream

  try {
    // Whop SDK exposes a createForumPost mutation; use forum experience id and content.
    // Title support varies; include it in content if the API doesn't accept a title.
    const payload: any = { forumExperienceId: forumId, content: content || title || "" };
    if (title) payload.title = title;

    const res: any = await (whopSdk as any).forums.createForumPost(payload);
    const created: any = res?.createForumPost ?? res;
    const postId: string | undefined = created?.id ?? created?.postId;
    const postUrl: string | undefined = created?.url ?? created?.postUrl;
    if (postId) return { postId, postUrl };
  } catch (err) {
    // Swallow and allow caller to fallback
  }
  return null;
}


