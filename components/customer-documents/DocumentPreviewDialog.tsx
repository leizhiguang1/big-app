"use client";

import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getCustomerDocumentSignedUrlAction } from "@/lib/actions/customer-documents";
import type { CustomerDocumentWithRefs } from "@/lib/services/customer-documents";

type Props = {
	doc: CustomerDocumentWithRefs | null;
	onOpenChange: (open: boolean) => void;
	onError: (message: string) => void;
};

function isImage(mime: string): boolean {
	return mime.startsWith("image/");
}

function isPdf(mime: string): boolean {
	return mime === "application/pdf";
}

export function DocumentPreviewDialog({ doc, onOpenChange, onError }: Props) {
	const [url, setUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!doc) {
			setUrl(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		getCustomerDocumentSignedUrlAction(doc.id)
			.then((u) => {
				if (!cancelled) setUrl(u);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				onError(err instanceof Error ? err.message : "Could not load preview");
				onOpenChange(false);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [doc, onError, onOpenChange]);

	const handleDownload = () => {
		if (!url || !doc) return;
		const a = document.createElement("a");
		a.href = url;
		a.download = doc.file_name;
		a.rel = "noopener noreferrer";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	const handleOpenTab = () => {
		if (!url) return;
		window.open(url, "_blank", "noopener,noreferrer");
	};

	return (
		<Dialog open={doc !== null} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[90vh] w-[min(1100px,95vw)] max-w-none flex-col gap-0 p-0">
				<DialogHeader className="flex-row items-center justify-between gap-4 border-b px-6 py-3">
					<div className="min-w-0">
						<DialogTitle className="truncate text-base">
							{doc?.file_name ?? ""}
						</DialogTitle>
						{doc && (
							<p className="mt-0.5 text-muted-foreground text-xs">
								{doc.mime_type}
							</p>
						)}
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={handleOpenTab}
							disabled={!url}
						>
							<ExternalLink className="size-3.5" />
							Open in tab
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={handleDownload}
							disabled={!url}
						>
							<Download className="size-3.5" />
							Download
						</Button>
					</div>
				</DialogHeader>

				<div className="flex-1 overflow-auto bg-muted/20 p-3">
					{loading || !url || !doc ? (
						<div className="flex h-full items-center justify-center text-muted-foreground">
							<Loader2 className="size-5 animate-spin" />
						</div>
					) : isImage(doc.mime_type) ? (
						// eslint-disable-next-line @next/next/no-img-element -- signed URL, lifetime-bounded, not worth next/image
						<img
							src={url}
							alt={doc.file_name}
							className="mx-auto block max-h-full max-w-full object-contain"
						/>
					) : isPdf(doc.mime_type) ? (
						<iframe
							src={url}
							title={doc.file_name}
							className="h-full w-full rounded border bg-background"
						/>
					) : (
						<div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
							<FileText className="size-10" />
							<p className="text-sm">Preview not supported for this type.</p>
							<Button type="button" size="sm" onClick={handleDownload}>
								<Download className="size-3.5" />
								Download
							</Button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
