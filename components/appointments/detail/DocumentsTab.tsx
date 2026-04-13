"use client";

import { FileText } from "lucide-react";

export function DocumentsTab() {
	return (
		<div className="flex flex-col items-center gap-3 rounded-md border bg-muted/20 p-10 text-center">
			<FileText className="size-10 text-muted-foreground/50" />
			<div className="font-medium text-base">Documents</div>
			<p className="max-w-md text-muted-foreground text-sm">
				X-rays, consent forms, and uploaded files will live here. The Documents
				module isn't wired up yet — upload support lands with the shared storage
				infrastructure.
			</p>
		</div>
	);
}
