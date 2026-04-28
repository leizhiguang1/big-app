import { headers } from "next/headers";

export default async function BrandNotFoundPage() {
	// Build the apex URL from the actual request host (e.g.
	// "nonexistent.bigapp.online" → strip first label → "bigapp.online").
	// This is robust to NEXT_PUBLIC_ROOT_DOMAIN being unset/misconfigured.
	const h = await headers();
	const requestHost = h.get("host") ?? "";
	const requestProto =
		h.get("x-forwarded-proto") ??
		(process.env.NODE_ENV === "production" ? "https" : "http");

	const [hostname = "", port = ""] = requestHost.split(":");
	const apexHostname = hostname.includes(".")
		? hostname.split(".").slice(1).join(".")
		: hostname;
	const apexHost = port ? `${apexHostname}:${port}` : apexHostname;
	const pickerUrl = apexHost
		? `${requestProto}://${apexHost}/select-brand`
		: "/select-brand";

	return (
		<div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center px-6 py-16 text-center">
			<h1 className="text-3xl font-semibold tracking-tight">
				Workspace not found
			</h1>
			<p className="mt-3 text-sm text-muted-foreground">
				This subdomain doesn&apos;t match any active workspace. Check the URL,
				or pick another from the workspace list.
			</p>
			<a
				href={pickerUrl}
				className="mt-8 inline-flex items-center justify-center rounded-md border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
			>
				Pick a workspace →
			</a>
		</div>
	);
}
