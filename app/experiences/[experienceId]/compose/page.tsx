import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

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

  // Resolve the companyId from the experience
  const experience = await whopSdk.experiences.getExperience({ experienceId });
  const companyId = experience.company_id;

  const schema = await prisma.companyPostFieldSchema.findFirst({
    where: { companyId },
  });
  const fields: Array<any> = (schema?.schemaJson as any)?.fields ?? [];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Create Post (with Custom Fields)</h1>
      <FormClient companyId={companyId} userId={userId} fields={fields} />
    </div>
  );
}

function FormClient({
  companyId,
  userId,
  fields,
}: {
  companyId: string;
  userId: string;
  fields: Array<any>;
}) {
  async function onSubmit(formData: FormData) {
    "use server";
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      const key = String(field.key ?? field.name);
      data[key] = formData.get(key);
    }

    // Placeholder: in a full integration, create the forum post and capture its postId.
    // For now, we store metadata with a temporary client-generated id and let the creator link it later.
    const syntheticPostId = `temp_${Date.now()}`;

    await fetch(`/api/post-metadata`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postId: syntheticPostId, companyId, data }),
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
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
      <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Save Metadata</button>
    </form>
  );
}


