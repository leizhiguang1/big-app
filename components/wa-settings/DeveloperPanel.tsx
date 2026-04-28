"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeveloperPanel() {
	const [resetting, setResetting] = useState(false);

	return (
		<section className="flex items-center justify-between gap-3 rounded-lg border bg-card px-5 py-4">
			<div>
				<h3 className="font-semibold text-sm">Reset & Reload</h3>
				<p className="text-muted-foreground text-xs">
					Clears WA-related localStorage on this device (line list, cache,
					CRM stages) and reloads.
				</p>
			</div>
			<Button variant="destructive" onClick={() => setResetting(true)}>
				Reset
			</Button>
			<ConfirmDialog
				open={resetting}
				onOpenChange={setResetting}
				title="Reset WhatsApp client state?"
				description="This only clears local browser data. WA chat history on the server is untouched."
				confirmLabel="Reset & reload"
				variant="destructive"
				onConfirm={() => {
					if (typeof window === "undefined") return;
					Object.keys(window.localStorage)
						.filter((k) => k.startsWith("wa_"))
						.forEach((k) => window.localStorage.removeItem(k));
					window.location.reload();
				}}
			/>
		</section>
	);
}
