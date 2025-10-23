import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createForumPost } from "@/lib/forum-service";
import { redirect } from "next/navigation";

export default async function ComposePage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const headersList = await headers();
  const { experienceId } = await params;
  const { userId } = await whopSdk.verifyUserToken(headersList);

  const result = await whopSdk.access.checkIfUserHasAccessToExperience({
    userId,
    experienceId,
  });
  if (!result.hasAccess) {
    return (
      <div className="p-6">You do not have access to post in this experience.</div>
    );
  }

  // Resolve the companyId from the experience. The SDK type may not expose this field directly.
  const experience = await whopSdk.experiences.getExperience({ experienceId });
  const companyId =
    (experience as any)?.companyId ??
    (experience as any)?.company_id ??
    process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-red-600">
        Unable to determine companyId for this experience. Please set NEXT_PUBLIC_WHOP_COMPANY_ID or ensure the experience includes a company reference.
      </div>
    );
  }

  const schema = await prisma.companyPostFieldSchema.findFirst({
    where: { companyId },
  });
  const fields: Array<any> = (schema?.schemaJson as any)?.fields ?? [];

  const bindings = await prisma.forumBinding.findMany({ where: { companyId, enabled: true } });
  const forumId = bindings[0]?.forumId;

  if (!forumId) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-4">Create Post</h1>
        <p className="text-sm text-gray-600 mb-2">No forum is bound to this company.</p>
        <p className="text-sm">
          Ask an admin to bind a forum at <a className="text-blue-600 underline" href={`/dashboard/${companyId}/forums`}>Dashboard → Forums</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Create Post (with Custom Fields)</h1>
      <FormClient companyId={companyId} forumId={forumId} userId={userId} fields={fields} />
    </div>
  );
}

function FormClient({
  companyId,
  forumId,
  userId,
  fields,
}: {
  companyId: string;
  forumId: string;
  userId: string;
  fields: Array<any>;
}) {
  async function onSubmit(formData: FormData) {
    "use server";
    const data: Record<string, unknown> = {};
    // Build data from all form entries except the reserved composer fields
    for (const [k, v] of formData.entries()) {
      if (k === "__title" || k === "__content" || k === "__forumId" || k === "__companyId") continue;
      data[k] = v as unknown as string;
    }
    const title = String(formData.get("__title") ?? "Untitled");
    const content = String(formData.get("__content") ?? "");
    const formForumId = String(formData.get("__forumId") ?? "");
    const formCompanyId = String(formData.get("__companyId") ?? "");

    const headersList = await headers();
    const { userId: verifiedUserId } = await whopSdk.verifyUserToken(headersList);
    const created = await createForumPost({ forumId: formForumId, title, content, userId: verifiedUserId });
    if (created?.postId) {
      await prisma.postMetadata.create({
        data: {
          postId: created.postId,
          companyId: formCompanyId,
          createdByUserId: verifiedUserId,
          dataJson: data,
        },
      });
      redirect(`/posts/${encodeURIComponent(created.postId)}`);
    }
    // Fallback: temp record
    const temp = await prisma.postMetadata.create({
      data: {
        postId: `temp_${Date.now()}`,
        companyId: formCompanyId,
        createdByUserId: verifiedUserId,
        dataJson: data,
      },
    });
    redirect(`/posts/${encodeURIComponent(temp.id)}?attach=1`);
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="__forumId" defaultValue={forumId} />
      <input type="hidden" name="__companyId" defaultValue={companyId} />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Title</label>
        <input name="__title" className="border rounded px-3 py-2" placeholder="Post title" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Content</label>
        <textarea name="__content" className="border rounded px-3 py-2 h-28" placeholder="Write your post..." />
      </div>
      {fields.length === 0 ? (
        <p className="text-sm text-gray-500">No custom fields configured by the creator.</p>
      ) : (
        fields.map((f, i) => (
          <div key={i} className="flex flex-col gap-1">
            <label className="text-sm font-medium">{f.label ?? f.name}</label>
            <input
              name={String(f.key ?? f.name)}
              className="border rounded px-3 py-2"
              placeholder={f.placeholder ?? ""}
              required={Boolean(f.required)}
            />
          </div>
        ))
      )}
      <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Publish</button>
    </form>
  );
}


