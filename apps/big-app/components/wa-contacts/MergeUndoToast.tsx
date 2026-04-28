"use client";

import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
	countdown: number;
	onUndo: () => void;
};

export function MergeUndoToast({ countdown, onUndo }: Props) {
	return (
		<div className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-3 rounded-full border bg-foreground px-5 py-2.5 text-background shadow-lg">
			<span className="text-sm">
				Merging contacts in <strong>{countdown}s</strong>…
			</span>
			<Button
				size="sm"
				variant="ghost"
				className="text-background hover:bg-background/15 hover:text-background"
				onClick={onUndo}
			>
				<Undo2 className="size-4" />
				Undo
			</Button>
		</div>
	);
}
