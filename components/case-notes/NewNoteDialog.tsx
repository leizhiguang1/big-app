"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (content: string) => void;
	pending?: boolean;
};

export function NewNoteDialog({ open, onOpenChange, onSave, pending }: Props) {
	const [draft, setDraft] = useState("");

	const handleSave = () => {
		if (!draft.trim()) return;
		onSave(draft.trim());
		setDraft("");
	};

	const handleClose = () => {
		setDraft("");
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
			<DialogContent
				preventOutsideClose
				className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg"
			>
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle>New case note</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto px-6 py-4">
					<textarea
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						rows={8}
						placeholder="Chief complaint, findings, procedure details, medication…"
						className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						// biome-ignore lint/a11y/noAutofocus: intentional focus in modal
						autoFocus
					/>
					<div className="mt-1.5 flex justify-end text-[11px] text-muted-foreground tabular-nums">
						{draft.length} / 8000
					</div>
				</div>

				<DialogFooter className="border-t px-6 py-4">
					<Button type="button" variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						disabled={pending || !draft.trim()}
					>
						<Save className="size-3.5" />
						Save note
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
