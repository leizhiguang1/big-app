"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
	return (
		<Button
			type="button"
			size="sm"
			onClick={() => window.print()}
			className="gap-1"
		>
			<Printer className="size-4" />
			Print
		</Button>
	);
}
