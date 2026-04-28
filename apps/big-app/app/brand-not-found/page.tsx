import { apexUrl } from "@/lib/multibrand/host";

export default function BrandNotFoundPage() {
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
				href={apexUrl("/select-brand")}
				className="mt-8 inline-flex items-center justify-center rounded-md border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
			>
				Pick a workspace →
			</a>
		</div>
	);
}
