"use client";

import { Plus, X, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	ACTION_TYPES,
	TRIGGER_TYPES,
} from "@/components/automations/automation-constants";
import type {
	AutomationAction,
	AutomationTrigger,
} from "@aimbig/wa-client";
import { AddActionMenu } from "./AddActionMenu";
import {
	type Path,
	actionSummary,
	pathsEqual,
	triggerSummaryFor,
} from "./builder-utils";

export type Selection =
	| { kind: "trigger" }
	| { kind: "action"; path: Path }
	| null;

type Props = {
	trigger: AutomationTrigger | null;
	actions: AutomationAction[];
	selection: Selection;
	onSelect: (s: Selection) => void;
	onAddAction: (afterIdx: number, basePath: Path, type: string) => void;
	onRemoveAction: (path: Path) => void;
};

type SegBranch = {
	condition?: { rules?: { field: string; operator: string }[] };
	actions?: AutomationAction[];
};

function isAddingHere(
	addingAt: { afterIdx: number; basePath: Path } | null,
	afterIdx: number,
	basePath: Path,
): boolean {
	if (!addingAt) return false;
	return (
		addingAt.afterIdx === afterIdx &&
		JSON.stringify(addingAt.basePath) === JSON.stringify(basePath)
	);
}

export function WorkflowCanvas({
	trigger,
	actions,
	selection,
	onSelect,
	onAddAction,
	onRemoveAction,
}: Props) {
	const [addingAt, setAddingAt] = useState<{
		afterIdx: number;
		basePath: Path;
	} | null>(null);

	const renderSequence = (
		actionList: AutomationAction[],
		basePath: Path,
	): React.ReactNode[] => {
		const nodes: React.ReactNode[] = [];

		for (let i = 0; i <= actionList.length; i++) {
			const action = actionList[i] as AutomationAction | undefined;
			const thisPath = [...basePath, i];
			const showAddHere = isAddingHere(addingAt, i - 1, basePath);

			nodes.push(
				<div
					key={`conn-${basePath.join(".")}-${i}`}
					className="flex flex-col items-center"
				>
					<div className="h-3 w-px bg-border" />
					<AddActionMenu
						open={showAddHere}
						onOpenChange={(o) =>
							setAddingAt(o ? { afterIdx: i - 1, basePath } : null)
						}
						trigger={
							<button
								type="button"
								aria-label="Add action"
								onClick={(e) => {
									e.stopPropagation();
									setAddingAt(showAddHere ? null : { afterIdx: i - 1, basePath });
								}}
								className={`flex size-7 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted ${
									showAddHere ? "border-sky-500 ring-2 ring-sky-500/30" : ""
								}`}
							>
								<Plus className="size-4" />
							</button>
						}
						onPick={(type) => {
							onAddAction(i - 1, basePath, type);
							setAddingAt(null);
						}}
					/>
					<div className="h-3 w-px bg-border" />
				</div>,
			);

			if (!action) break;

			const isSelected =
				selection?.kind === "action" && pathsEqual(selection.path, thisPath);

			if (action.type === "if_else") {
				const segments =
					(action as AutomationAction & { segments?: SegBranch[] }).segments ??
					[];
				const noBranch =
					(action as AutomationAction & { noBranch?: AutomationAction[] })
						.noBranch ?? [];
				nodes.push(
					<div key={action.id ?? `ie-${i}`} className="flex flex-col items-center">
						<NodeCard
							icon="⑂"
							title="If / Else"
							subtitle={
								segments[0]?.condition?.rules?.length
									? `${segments[0].condition.rules.length} rule${segments[0].condition.rules.length === 1 ? "" : "s"}`
									: "Set condition…"
							}
							selected={isSelected}
							onClick={() => onSelect({ kind: "action", path: thisPath })}
							onRemove={() => onRemoveAction(thisPath)}
						/>
						<div className="grid grid-cols-2 gap-6 px-2">
							<div className="flex flex-col items-center">
								<div className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
									Yes
								</div>
								{renderSequence(segments[0]?.actions ?? [], [
									...thisPath,
									"yes",
								])}
							</div>
							<div className="flex flex-col items-center">
								<div className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
									No
								</div>
								{renderSequence(noBranch, [...thisPath, "no"])}
							</div>
						</div>
					</div>,
				);
			} else {
				const def = ACTION_TYPES[action.type];
				nodes.push(
					<NodeCard
						key={action.id ?? `a-${i}`}
						icon={def?.icon ?? "•"}
						title={def?.label ?? action.type ?? "Action"}
						subtitle={actionSummary(action)}
						selected={isSelected}
						onClick={() => onSelect({ kind: "action", path: thisPath })}
						onRemove={() => onRemoveAction(thisPath)}
					/>,
				);
			}
		}

		return nodes;
	};

	return (
		<div className="flex flex-col items-center gap-0 overflow-y-auto bg-muted/30 px-6 py-8">
			<NodeCard
				icon={trigger?.type ? TRIGGER_TYPES[trigger.type]?.icon ?? "⚡" : "⚡"}
				title={trigger?.type ? TRIGGER_TYPES[trigger.type]?.label ?? trigger.type : "Set a trigger"}
				subtitle={triggerSummaryFor(trigger)}
				selected={selection?.kind === "trigger"}
				onClick={() => onSelect({ kind: "trigger" })}
				badge={trigger ? null : <Zap className="size-3.5" />}
				kind="trigger"
			/>
			{renderSequence(actions, [])}
		</div>
	);
}

type NodeCardProps = {
	icon: string;
	title: string;
	subtitle: string;
	selected: boolean;
	onClick: () => void;
	onRemove?: () => void;
	badge?: React.ReactNode;
	kind?: "trigger" | "action";
};

function NodeCard({
	icon,
	title,
	subtitle,
	selected,
	onClick,
	onRemove,
	badge,
	kind = "action",
}: NodeCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`group relative flex w-72 items-start gap-3 rounded-lg border bg-card px-3 py-3 text-left shadow-sm transition-all hover:shadow ${
				selected
					? "border-sky-500 ring-2 ring-sky-500/40"
					: "hover:border-foreground/30"
			} ${kind === "trigger" ? "border-amber-500/60" : ""}`}
		>
			<div
				className={`flex size-8 shrink-0 items-center justify-center rounded-md text-base ${
					kind === "trigger"
						? "bg-amber-500/15 text-amber-700"
						: "bg-sky-500/10 text-sky-700"
				}`}
				aria-hidden
			>
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 font-semibold text-sm">
					{title}
					{badge}
				</div>
				<div className="mt-0.5 truncate text-muted-foreground text-xs">
					{subtitle}
				</div>
			</div>
			{onRemove && (
				<Button
					size="icon"
					variant="ghost"
					className="size-6 opacity-0 group-hover:opacity-100"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					aria-label="Remove"
				>
					<X className="size-3.5" />
				</Button>
			)}
		</button>
	);
}
