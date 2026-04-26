"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
	useEffect(() => {
		if (typeof window === "undefined") return;
		const params = new URLSearchParams(window.location.search);
		if (params.get("print") !== "1") return;
		const timer = setTimeout(() => window.print(), 250);
		return () => clearTimeout(timer);
	}, []);

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
