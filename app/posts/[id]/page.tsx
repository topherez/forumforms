import { prisma } from "@/lib/prisma";

export default async function PostDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meta = await prisma.postMetadata.findUnique({ where: { id } });

  if (!meta) {
    return <div className="p-6">Metadata not found.</div>;
  }

  const entries = Object.entries((meta.dataJson as any) ?? {});

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Post Details</h1>
      <div className="text-sm text-gray-500">Record ID: {meta.id}</div>
      <div className="text-sm">Company: {meta.companyId}</div>
      <div className="text-sm">Created by: {meta.createdByUserId}</div>
      {meta.postId && (
        <div className="text-sm">
          Forum Post: <a className="text-blue-600 underline" href={meta.postId}>{meta.postId}</a>
        </div>
      )}
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


