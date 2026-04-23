"use client";

import { History, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	Automation,
	AutomationTriggerType,
} from "@/components/chats/types";

type Props = {
	automations: Automation[];
	isLoading: boolean;
	onEdit: (a: Automation) => void;
	onToggle: (id: string, enabled: boolean) => void;
	onDelete: (id: string) => void;
	onViewLog: (a: Automation) => void;
};

const TRIGGER_LABEL: Record<AutomationTriggerType, string> = {
	inbound_message: "Any inbound message",
	keyword_match: "Keyword match",
	appointment_booked: "Appointment booked",
	appointment_completed: "Appointment completed",
	appointment_cancelled: "Appointment cancelled",
	scheduler: "Scheduled",
	birthday_reminder: "Birthday reminder",
	inbound_webhook: "Inbound webhook",
	new_contact: "New contact",
};

function triggerSummary(a: Automation): string {
	const label =
		TRIGGER_LABEL[a.trigger.type as AutomationTriggerType] ?? a.trigger.type;
	if (
		a.trigger.type === "keyword_match" &&
		Array.isArray(a.trigger.keywords) &&
		a.trigger.keywords.length > 0
	) {
		return `${label}: ${a.trigger.keywords.slice(0, 3).join(", ")}`;
	}
	if (a.trigger.type === "scheduler" && a.trigger.time) {
		return `${label} at ${a.trigger.time}`;
	}
	return label;
}

function formatTime(ts: number | undefined): string {
	if (!ts) return "—";
	const diff = Date.now() - ts;
	if (diff < 60_000) return "just now";
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
	return new Date(ts).toLocaleDateString();
}

export function AutomationsTable({
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
			key: "enabled",
			header: "On",
			cell: (a) => (
				<Switch
					checked={a.enabled}
					onCheckedChange={(v) => onToggle(a.id, v)}
					aria-label={`Toggle ${a.name}`}
				/>
			),
		},
		{
			key: "name",
			header: "Name",
			sortable: true,
			cell: (a) => (
				<button
					type="button"
					onClick={() => onEdit(a)}
					className="text-left font-medium hover:text-sky-600 hover:underline"
				>
					{a.name || "(untitled)"}
				</button>
			),
		},
		{
			key: "trigger",
			header: "Trigger",
			sortable: true,
			sortValue: (a) => a.trigger.type,
			cell: (a) => <span className="text-sm">{triggerSummary(a)}</span>,
		},
		{
			key: "actions_count",
			header: "Actions",
			cell: (a) => (
				<span className="text-muted-foreground text-xs">
					{a.actions.length}
				</span>
			),
		},
		{
			key: "updatedAt",
			header: "Updated",
			sortable: true,
			sortValue: (a) => a.updatedAt,
			cell: (a) => (
				<span className="text-muted-foreground text-xs">
					{formatTime(a.updatedAt)}
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
								aria-label="View execution log"
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
								aria-label="Edit automation"
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
								aria-label="Delete automation"
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
				searchPlaceholder="Search automations…"
				emptyMessage={
					isLoading ? "Loading automations…" : "No automations yet."
				}
				pagination
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => !o && setDeleting(null)}
				title="Delete automation?"
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
