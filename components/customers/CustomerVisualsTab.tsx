"use client";

import { Construction } from "lucide-react";
import type { CustomerDocumentWithRefs } from "@/lib/services/customer-documents";

type Props = {
	documents: CustomerDocumentWithRefs[];
};

export function CustomerVisualsTab(_props: Props) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
			<Construction className="size-8 text-muted-foreground/60" />
			<span className="font-medium">Visuals — in development</span>
			<span className="text-xs">This tab is not yet available.</span>
		</div>
	);
}
