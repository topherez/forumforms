import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

export default async function DashboardPage({
	params,
}: {
	params: Promise<{ companyId: string }>;
}) {
	// The headers contains the user token
	const headersList = await headers();

	// The companyId is a path param
	const { companyId } = await params;

	// The user token is in the headers
	const { userId } = await whopSdk.verifyUserToken(headersList);

	const result = await whopSdk.access.checkIfUserHasAccessToCompany({
		userId,
		companyId,
	});

	const user = await whopSdk.users.getUser({ userId });
	const company = await whopSdk.companies.getCompany({ companyId });

	// Either: 'admin' | 'no_access';
	// 'admin' means the user is an admin of the company, such as an owner or moderator
	// 'no_access' means the user is not an authorized member of the company
	const { accessLevel } = result;

    const isAdmin = result.hasAccess && accessLevel === "admin";

    return (
        <div className="min-h-screen px-8 py-12 max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold mb-6">Company Dashboard</h1>
            <div className="rounded-lg border p-4 mb-8">
                <p>
                    Hi <strong>{user.name}</strong>, you{" "}
                    <strong>{result.hasAccess ? "have" : "do not have"} access</strong> to this company.
                    Your access level is <strong>{accessLevel}</strong>. You are viewing
                    <strong> {company.title}</strong>.
                </p>
            </div>

            {isAdmin ? (
                <SchemaEditor companyId={companyId} />
            ) : (
                <p className="text-sm text-gray-500">Only admins can edit the post field schema.</p>
            )}

            <div className="mt-10 text-sm text-gray-500">
                Open an experience to compose a post with custom fields.
            </div>
        </div>
    );
}

async function SchemaEditor({ companyId }: { companyId: string }) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/schema/${companyId}`, {
        cache: "no-store",
    });
    const data = await res.json().catch(() => ({ schema: { fields: [] } }));

    return (
        <Suspense>
            {/* Simple editor: JSON textarea for now */}
            <div className="rounded-lg border p-4">
                <h2 className="font-medium mb-3">Custom Post Fields (JSON)</h2>
                <SchemaEditorClient companyId={companyId} initialSchema={data.schema} />
            </div>
        </Suspense>
    );
}

function SchemaEditorClient({ companyId, initialSchema }: { companyId: string; initialSchema: unknown }) {
    async function onSubmit(formData: FormData) {
        "use server";
        const raw = String(formData.get("schema") ?? "{}");
        let parsed: unknown = null;
        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error("Invalid JSON");
        }

        await fetch(`/api/schema/${companyId}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ schema: parsed }),
            cache: "no-store",
        });
    }

    return (
        <form action={onSubmit} className="space-y-3">
            <textarea
                name="schema"
                defaultValue={JSON.stringify(initialSchema ?? { fields: [] }, null, 2)}
                className="w-full h-64 font-mono text-sm border rounded p-2"
            />
            <div>
                <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
            </div>
        </form>
    );
}
