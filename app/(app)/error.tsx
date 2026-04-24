"use client";

import { AlertTriangle, Copy, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		console.error("[app error boundary]", {
			name: error.name,
			message: error.message,
			digest: error.digest,
			stack: error.stack,
		});
	}, [error]);

	const isDev = process.env.NODE_ENV !== "production";
	const digest = error.digest ?? null;

	const copyDigest = async () => {
		if (!digest) return;
		try {
			await navigator.clipboard.writeText(digest);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	};

	return (
		<div className="flex min-h-[60vh] items-center justify-center p-6">
			<div className="flex w-full max-w-xl flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
				<div className="flex items-center gap-3 text-destructive">
					<AlertTriangle className="size-5" />
					<h2 className="font-semibold text-lg">Something went wrong</h2>
				</div>
				<p className="text-muted-foreground text-sm">
					The page failed to render. You can retry, or share the reference below
					with support so we can look it up in the server logs.
				</p>
				{digest ? (
					<div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 font-mono text-xs">
						<span className="text-muted-foreground">digest:</span>
						<span className="flex-1 truncate">{digest}</span>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 px-2"
							onClick={copyDigest}
						>
							<Copy className="size-3.5" />
							{copied ? "Copied" : "Copy"}
						</Button>
					</div>
				) : null}
				{isDev ? (
					<pre className="max-h-64 overflow-auto rounded-md border bg-background p-3 text-xs">
						{error.message}
						{error.stack ? `\n\n${error.stack}` : ""}
					</pre>
				) : null}
				<div className="flex justify-end gap-2">
					<Button variant="outline" onClick={() => window.location.reload()}>
						Reload page
					</Button>
					<Button onClick={() => reset()}>
						<RotateCcw className="size-4" />
						Try again
					</Button>
				</div>
			</div>
		</div>
	);
}
