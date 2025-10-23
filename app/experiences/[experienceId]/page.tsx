import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import Link from "next/link";

export default async function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	// The headers contains the user token
	const headersList = await headers();

	// The experienceId is a path param
	const { experienceId } = await params;

	// The user token is in the headers
	const { userId } = await whopSdk.verifyUserToken(headersList);

	const result = await whopSdk.access.checkIfUserHasAccessToExperience({
		userId,
		experienceId,
	});

	const user = await whopSdk.users.getUser({ userId });
const experience = await whopSdk.experiences.getExperience({ experienceId });
const companyIdFromExperience =
  (experience as any)?.companyId ??
  (experience as any)?.company_id ??
  process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

	// Either: 'admin' | 'customer' | 'no_access';
	// 'admin' means the user is an admin of the whop, such as an owner or moderator
	// 'customer' means the user is a common member in this whop
	// 'no_access' means the user does not have access to the whop
	const { accessLevel } = result;

	return (
		<div className="flex flex-col gap-6 justify-center items-center h-screen px-8 text-center">
			<h1 className="text-xl">
				Hi <strong>{user.name}</strong>, you{" "}
				<strong>{result.hasAccess ? "have" : "do not have"} access</strong> to
				this experience. Your access level to this whop is:{" "}
				<strong>{accessLevel}</strong>. <br />
				<br />
				Your user ID is <strong>{userId}</strong> and your username is{" "}
				<strong>@{user.username}</strong>.<br />
				<br />
				You are viewing the experience: <strong>{experience.name}</strong>
			</h1>

			{result.hasAccess && (
				<Link
					href={`/experiences/${experienceId}/compose`}
					className="px-4 py-2 rounded bg-blue-600 text-white"
				>
					Compose a Post with Custom Fields
				</Link>
			)}

			{accessLevel === "admin" && companyIdFromExperience && (
				<div className="flex gap-3">
					<Link
						href={`/dashboard/${companyIdFromExperience}`}
						className="px-4 py-2 rounded border border-gray-300 text-white/90"
					>
						Go to Schema Dashboard
					</Link>
					<Link
						href={`/dashboard/${companyIdFromExperience}/forums`}
						className="px-4 py-2 rounded border border-gray-300 text-white/90"
					>
						Manage Forum Bindings
					</Link>
				</div>
			)}
		</div>
	);
}
