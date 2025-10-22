import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import SchemaBuilderClient from "./SchemaBuilderClient";

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
            <div className="rounded-lg border p-4">
                <h2 className="font-medium mb-3">Custom Post Fields</h2>
                <SchemaBuilderClient companyId={companyId} initialSchema={data.schema} />
            </div>
        </Suspense>
    );
}

