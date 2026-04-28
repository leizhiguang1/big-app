"use client";

import { Layers, Pencil } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onChooseScratch: () => void;
	onChooseTemplate: () => void;
};

export function NewWorkflowDialog({
	open,
	onOpenChange,
	onChooseScratch,
	onChooseTemplate,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Create new workflow</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<button
						type="button"
						onClick={onChooseScratch}
						className="flex flex-col gap-2 rounded-md border bg-card p-4 text-left transition-colors hover:bg-muted/40"
					>
						<Pencil className="size-5 text-sky-600" />
						<div className="font-semibold text-sm">Start from scratch</div>
						<p className="text-muted-foreground text-xs">
							Build a custom workflow from the ground up.
						</p>
					</button>
					<button
						type="button"
						onClick={onChooseTemplate}
						className="flex flex-col gap-2 rounded-md border bg-card p-4 text-left transition-colors hover:bg-muted/40"
					>
						<Layers className="size-5 text-emerald-600" />
						<div className="font-semibold text-sm">Use a template</div>
						<p className="text-muted-foreground text-xs">
							Start with a pre-built starter workflow.
						</p>
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
