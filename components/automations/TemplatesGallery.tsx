"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Automation } from "@/components/chats/types";
import {
	type WorkflowTemplate,
	WORKFLOW_TEMPLATES,
} from "./automation-templates";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	existing: Automation[];
	onPick: (template: WorkflowTemplate) => void;
};

export function TemplatesGallery({
	open,
	onOpenChange,
	existing,
	onPick,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-3xl">
				<DialogHeader className="border-b px-5 py-4">
					<DialogTitle>Choose a template</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
					{WORKFLOW_TEMPLATES.map((tpl) => {
						const alreadyExists = existing.some(
							(wf) => wf.name === tpl.workflow.name,
						);
						return (
							<button
								type="button"
								key={tpl.title}
								onClick={() => onPick(tpl)}
								className="flex flex-col gap-2 rounded-md border bg-card p-4 text-left transition-colors hover:bg-muted/40"
							>
								<div className="flex items-center justify-between">
									<span className="text-2xl" aria-hidden>
										{tpl.icon}
									</span>
									{alreadyExists && (
										<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-[11px] text-emerald-700">
											<Check className="size-3" /> Added
										</span>
									)}
								</div>
								<div className="font-semibold text-sm">{tpl.title}</div>
								<p className="text-muted-foreground text-xs">{tpl.desc}</p>
								<div className="mt-auto flex justify-end pt-1">
									<Button size="sm" variant="ghost">
										{alreadyExists ? "Open" : "Use template →"}
									</Button>
								</div>
							</button>
						);
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}
