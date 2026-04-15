"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteTaxAction } from "@/lib/actions/taxes";
import type { Tax } from "@/lib/services/taxes";
import { TaxFormDialog } from "./TaxForm";

const numberFormatter = new Intl.NumberFormat("en-MY", {
	maximumFractionDigits: 2,
});

const dash = <span className="text-muted-foreground">—</span>;

export function TaxesTable({ taxes }: { taxes: Tax[] }) {
	const [editing, setEditing] = useState<Tax | null>(null);
	const [deleting, setDeleting] = useState<Tax | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<Tax>[] = [
		{
			key: "name",
			header: "Name",
			sortable: true,
			sortValue: (t) => t.name,
			cell: (t) => (
				<button
					type="button"
					className="text-left font-medium text-primary hover:underline"
					onClick={() => setEditing(t)}
				>
					{t.name}
				</button>
			),
		},
		{
			key: "rate_pct",
			header: "Rate",
			sortable: true,
			align: "right",
			sortValue: (t) => Number(t.rate_pct),
			cell: (t) => (
				<span className="tabular-nums">
					{numberFormatter.format(Number(t.rate_pct))}%
				</span>
			),
		},
		{
			key: "is_active",
			header: "Active",
			align: "center",
			sortable: true,
			sortValue: (t) => (t.is_active ? 1 : 0),
			cell: (t) =>
				t.is_active ? <Check className="mx-auto size-4 text-primary" /> : dash,
		},
		{
			key: "actions",
			header: "",
			align: "right",
			cell: (t) => (
				<div className="inline-flex gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setEditing(t)}
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
									setDeleteError(null);
									setDeleting(t);
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
				data={taxes}
				columns={columns}
				getRowKey={(t) => t.id}
				searchKeys={["name"]}
				searchPlaceholder="Search taxes…"
				emptyMessage="No taxes yet. Click “New tax” to create one."
			/>
			<TaxFormDialog
				open={!!editing}
				tax={editing}
				onClose={() => setEditing(null)}
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete tax?"
				description={
					deleting
						? `"${deleting.name}" will be permanently removed.${deleteError ? ` — ${deleteError}` : ""}`
						: undefined
				}
				confirmLabel="Delete"
				pending={pending}
				onConfirm={() => {
					if (!deleting) return;
					const target = deleting;
					setDeleteError(null);
					startTransition(async () => {
						try {
							await deleteTaxAction(target.id);
							setDeleting(null);
						} catch (err) {
							setDeleteError(
								err instanceof Error ? err.message : "Failed to delete",
							);
						}
					});
				}}
			/>
		</>
	);
}
