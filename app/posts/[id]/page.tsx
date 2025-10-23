import { prisma } from "@/lib/prisma";

export default async function PostDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ attach?: string }>;
}) {
  const { id } = await params;
  const attach = (await (searchParams ?? Promise.resolve({})))?.attach;
  const meta = await prisma.postMetadata.findUnique({ where: { id } });

  if (!meta) {
    return <div className="p-6">Metadata not found.</div>;
  }

  const entries = Object.entries((meta.dataJson as any) ?? {});
  const showAttach = attach === "1" || (meta.postId && meta.postId.startsWith("temp_"));

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Post Details</h1>
      <div className="text-sm text-gray-500">Record ID: {meta.id}</div>
      <div className="text-sm">Company: {meta.companyId}</div>
      <div className="text-sm">Created by: {meta.createdByUserId}</div>
      <div className="text-sm">
        Forum Post:{" "}
        {meta.postId?.startsWith("http") ? (
          <a className="text-blue-600 underline" href={meta.postId}>{meta.postId}</a>
        ) : (
          <span className="text-gray-500">{meta.postId}</span>
        )}
      </div>

      {showAttach && <AttachForm metaId={meta.id} />}
      <div className="border rounded p-4">
        <h2 className="font-medium mb-2">Custom Fields</h2>
        {entries.length === 0 ? (
          <div className="text-sm text-gray-500">No fields</div>
        ) : (
          <ul className="list-disc pl-6">
            {entries.map(([k, v]) => (
              <li key={k} className="text-sm">
                <strong>{k}:</strong> {String(v)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AttachForm({ metaId }: { metaId: string }) {
  async function onAttach(formData: FormData) {
    "use server";
    const url = String(formData.get("postUrl") ?? "").trim();
    if (!url) return;
    await fetch(`/api/post-metadata`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: metaId, postUrl: url }),
      cache: "no-store",
    });
  }
  return (
    <form action={onAttach} className="space-y-2 border rounded p-3">
      <label className="text-sm">Attach the live forum post URL</label>
      <input name="postUrl" className="w-full border rounded px-2 py-1" placeholder="https://whop.com/..." />
      <div>
        <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded">Attach</button>
      </div>
    </form>
  );
}


