"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { deletePositionAction } from "@/lib/actions/positions";
import type { Position } from "@/lib/services/positions";
import { PositionFormDialog } from "./PositionForm";

export function PositionsTable({ positions }: { positions: Position[] }) {
	const [editing, setEditing] = useState<Position | null>(null);
	const [deleting, setDeleting] = useState<Position | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<Position>[] = [
		{
			key: "name",
			header: "Name",
			sortable: true,
			sortValue: (p) => p.name,
			cell: (p) => <span className="font-medium">{p.name}</span>,
		},
		{
			key: "description",
			header: "Description",
			sortable: true,
			sortValue: (p) => p.description ?? "",
			cell: (p) => (
				<span className="text-muted-foreground">{p.description || "—"}</span>
			),
		},
		{
			key: "is_active",
			header: "Status",
			sortable: true,
			cell: (p) => (
				<span
					className={
						p.is_active
							? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 text-xs"
							: "rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
					}
				>
					{p.is_active ? "Active" : "Inactive"}
				</span>
			),
		},
		{
			key: "actions",
			header: "Actions",
			align: "right",
			cell: (p) => (
				<div className="inline-flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setEditing(p)}
						aria-label="Edit"
					>
						<Pencil />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => {
							setActionError(null);
							setDeleting(p);
						}}
						aria-label="Delete"
					>
						<Trash2 />
					</Button>
				</div>
			),
		},
	];

	return (
		<>
			<DataTable
				data={positions}
				columns={columns}
				getRowKey={(p) => p.id}
				searchKeys={["name", "description"]}
				searchPlaceholder="Search positions…"
				emptyMessage="No positions yet. Click “New position” to create one."
				minWidth={640}
			/>
			<PositionFormDialog
				open={!!editing}
				position={editing}
				onClose={() => setEditing(null)}
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete position?"
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
							await deletePositionAction(target.id);
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
