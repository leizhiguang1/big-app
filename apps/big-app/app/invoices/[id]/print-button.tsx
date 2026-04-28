"use client";

import { Printer } from "lucide-react";
import { useEffect, useRef } from "react";
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

export function AutoPrint({ enabled }: { enabled: boolean }) {
	const fired = useRef(false);
	useEffect(() => {
		if (!enabled || fired.current) return;
		fired.current = true;
		const id = window.setTimeout(() => window.print(), 300);
		return () => window.clearTimeout(id);
	}, [enabled]);
	return null;
}
