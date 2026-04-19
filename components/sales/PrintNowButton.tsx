"use client";

import { Button } from "@/components/ui/button";

export function PrintNowButton() {
	return (
		<Button type="button" size="sm" onClick={() => window.print()}>
			Print
		</Button>
	);
}
