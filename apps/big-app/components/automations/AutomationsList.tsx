"use client";

import { History, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Automation } from "@aimbig/wa-client";
import {
	TRIGGER_TYPES,
	triggerSummary,
} from "./automation-constants";

type Props = {
	automations: Automation[];
	isLoading: boolean;
	onEdit: (a: Automation) => void;
	onToggle: (id: string, enabled: boolean) => void;
	onDelete: (id: string) => void;
	onViewLog: (a: Automation) => void;
};

function formatRelativeTime(ts: number | undefined): string {
	if (!ts) return "—";
	const diff = Date.now() - ts;
	if (diff < 60_000) return "just now";
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
	if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
	return new Date(ts).toLocaleDateString();
}

export function AutomationsList({
	automations,
	isLoading,
	onEdit,
	onToggle,
	onDelete,
	onViewLog,
}: Props) {
	const [deleting, setDeleting] = useState<Automation | null>(null);

	const columns: DataTableColumn<Automation>[] = [
		{
			key: "name",
			header: "Name",
			sortable: true,
			cell: (a) => (
				<button
					type="button"
					draggable
					onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
					onClick={() => onEdit(a)}
					className="flex items-center gap-2 text-left font-medium hover:text-sky-600 hover:underline"
				>
					<span
						className={`size-1.5 rounded-full ${a.enabled ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
					/>
					{a.name || "(untitled)"}
				</button>
			),
		},
		{
			key: "trigger",
			header: "Trigger",
			sortable: true,
			sortValue: (a) => a.trigger?.type ?? "",
			cell: (a) => {
				const summary = triggerSummary(a.trigger);
				const icon = a.trigger?.type
					? TRIGGER_TYPES[a.trigger.type]?.icon
					: null;
				return summary ? (
					<span className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-xs">
						{icon && <span aria-hidden>{icon}</span>}
						{summary}
					</span>
				) : (
					<span className="text-muted-foreground text-xs">No trigger</span>
				);
			},
		},
		{
			key: "actions_count",
			header: "Actions",
			cell: (a) => (
				<span className="text-muted-foreground text-xs">
					{(a.actions ?? []).length} action
					{(a.actions ?? []).length === 1 ? "" : "s"}
				</span>
			),
		},
		{
			key: "enabled",
			header: "Status",
			sortable: true,
			sortValue: (a) => (a.enabled ? 1 : 0),
			cell: (a) => (
				<div className="flex items-center gap-2">
					<Switch
						checked={!!a.enabled}
						onCheckedChange={(v) => onToggle(a.id, v)}
						aria-label={a.enabled ? "Pause workflow" : "Activate workflow"}
					/>
					<Badge variant={a.enabled ? "success" : "secondary"}>
						{a.enabled ? "Active" : "Draft"}
					</Badge>
				</div>
			),
		},
		{
			key: "updatedAt",
			header: "Updated",
			sortable: true,
			sortValue: (a) => a.updatedAt,
			cell: (a) => (
				<span className="text-muted-foreground text-xs">
					{formatRelativeTime(a.updatedAt)}
				</span>
			),
		},
		{
			key: "row_actions",
			header: "",
			align: "right",
			cell: (a) => (
				<div className="flex items-center justify-end gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="icon"
								variant="ghost"
								onClick={() => onViewLog(a)}
								aria-label="Execution log"
							>
								<History className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Execution log</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="icon"
								variant="ghost"
								onClick={() => onEdit(a)}
								aria-label="Edit workflow"
							>
								<Pencil className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Edit</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="icon"
								variant="ghost"
								onClick={() => setDeleting(a)}
								aria-label="Delete workflow"
							>
								<Trash2 className="size-4 text-destructive" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Delete</TooltipContent>
					</Tooltip>
				</div>
			),
		},
	];

	return (
		<>
			<DataTable<Automation>
				data={automations}
				columns={columns}
				getRowKey={(a) => a.id}
				searchKeys={["name"]}
				searchPlaceholder="Search workflows…"
				emptyMessage={
					isLoading ? "Loading workflows…" : "No workflows match the filter."
				}
				pagination
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => !o && setDeleting(null)}
				title="Delete workflow?"
				description={
					deleting
						? `"${deleting.name || "(untitled)"}" will be removed. This cannot be undone.`
						: ""
				}
				confirmLabel="Delete"
				variant="destructive"
				onConfirm={() => {
					if (deleting) onDelete(deleting.id);
					setDeleting(null);
				}}
			/>
		</>
	);
}
