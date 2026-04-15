"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteOutletAction } from "@/lib/actions/outlets";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import { OutletFormDialog } from "./OutletForm";

export function OutletsTable({ outlets }: { outlets: OutletWithRoomCount[] }) {
	const [editing, setEditing] = useState<OutletWithRoomCount | null>(null);
	const [deleting, setDeleting] = useState<OutletWithRoomCount | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<OutletWithRoomCount>[] = [
		{
			key: "code",
			header: "Code",
			sortable: true,
			cell: (o) => (
				<span className="font-mono text-muted-foreground text-xs">
					{o.code}
				</span>
			),
		},
		{
			key: "name",
			header: "Name",
			sortable: true,
			cell: (o) => <span className="font-medium">{o.name}</span>,
		},
		{
			key: "city",
			header: "City",
			sortable: true,
			sortValue: (o) => o.city ?? "",
			cell: (o) => (
				<span className="text-muted-foreground">{o.city || "—"}</span>
			),
		},
		{
			key: "state",
			header: "State",
			sortable: true,
			sortValue: (o) => o.state ?? "",
			cell: (o) => (
				<span className="text-muted-foreground">{o.state || "—"}</span>
			),
		},
		{
			key: "rooms",
			header: "Rooms",
			sortable: true,
			sortValue: (o) => o.room_count,
			cell: (o) => (
				<span className="text-muted-foreground">{o.room_count}</span>
			),
		},
		{
			key: "is_active",
			header: "Status",
			sortable: true,
			cell: (o) => (
				<span
					className={
						o.is_active
							? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 text-xs"
							: "rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
					}
				>
					{o.is_active ? "Active" : "Inactive"}
				</span>
			),
		},
		{
			key: "actions",
			header: "Actions",
			align: "right",
			cell: (o) => (
				<div className="inline-flex gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setEditing(o)}
								aria-label="Edit"
							>
								<Pencil />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Edit</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => {
									setActionError(null);
									setDeleting(o);
								}}
								aria-label="Delete"
							>
								<Trash2 />
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
			<DataTable
				data={outlets}
				columns={columns}
				getRowKey={(o) => o.id}
				searchKeys={["code", "name", "city", "state"]}
				searchPlaceholder="Search outlets…"
				emptyMessage="No outlets yet. Click “New outlet” to create one."
				minWidth={900}
			/>
			<OutletFormDialog
				open={!!editing}
				outlet={editing}
				onClose={() => setEditing(null)}
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete outlet?"
				description={
					deleting
						? `"${deleting.name}" will be permanently removed. This cannot be undone.${actionError ? ` — ${actionError}` : ""}`
						: undefined
				}
				confirmLabel="Delete"
				pending={pending}
				onConfirm={() => {
					if (!deleting) return;
					const target = deleting;
					setActionError(null);
					startTransition(async () => {
						try {
							await deleteOutletAction(target.id);
							setDeleting(null);
						} catch (err) {
							setActionError(
								err instanceof Error ? err.message : "Failed to delete",
							);
						}
					});
				}}
			/>
		</>
	);
}
