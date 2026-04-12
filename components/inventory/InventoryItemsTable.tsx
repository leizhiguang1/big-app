"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { deleteInventoryItemAction } from "@/lib/actions/inventory";
import {
	INVENTORY_STOCK_STATUS_LABELS,
	INVENTORY_TYPE_LABELS,
	type InventoryStockStatus,
	type InventoryType,
} from "@/lib/schemas/inventory";
import type { InventoryItem } from "@/lib/services/inventory";
import { InventoryItemFormDialog } from "./InventoryItemForm";

const priceFormatter = new Intl.NumberFormat("en-MY", {
	style: "currency",
	currency: "MYR",
	minimumFractionDigits: 2,
});

const dash = <span className="text-muted-foreground">—</span>;

const STATUS_CLASS: Record<InventoryStockStatus, string> = {
	ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
	low: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
	out: "bg-destructive/10 text-destructive",
};

export function InventoryItemsTable({ items }: { items: InventoryItem[] }) {
	const [editing, setEditing] = useState<InventoryItem | null>(null);
	const [deleting, setDeleting] = useState<InventoryItem | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<InventoryItem>[] = [
		{
			key: "name",
			header: "Name",
			sortable: true,
			sortValue: (i) => i.name,
			cell: (i) => (
				<>
					<div className="font-medium">{i.name}</div>
					<div className="font-mono text-muted-foreground text-xs">{i.sku}</div>
				</>
			),
		},
		{
			key: "type",
			header: "Type",
			sortable: true,
			sortValue: (i) => i.type,
			cell: (i) => (
				<span className="text-muted-foreground text-xs">
					{INVENTORY_TYPE_LABELS[i.type as InventoryType] ?? i.type}
				</span>
			),
		},
		{
			key: "category",
			header: "Category",
			sortable: true,
			sortValue: (i) => i.category ?? "",
			cell: (i) => (
				<span className="text-muted-foreground">{i.category ?? dash}</span>
			),
		},
		{
			key: "brand",
			header: "Brand",
			sortable: true,
			sortValue: (i) => i.brand ?? "",
			cell: (i) => (
				<span className="text-muted-foreground">{i.brand ?? dash}</span>
			),
		},
		{
			key: "supplier",
			header: "Supplier",
			sortable: true,
			sortValue: (i) => i.supplier ?? "",
			cell: (i) => (
				<span className="text-muted-foreground">{i.supplier ?? dash}</span>
			),
		},
		{
			key: "uom",
			header: "UoM",
			cell: (i) => (
				<span className="font-mono text-muted-foreground text-xs">{i.uom}</span>
			),
		},
		{
			key: "price",
			header: "Price",
			sortable: true,
			align: "right",
			sortValue: (i) => Number(i.price),
			cell: (i) => (
				<span className="tabular-nums">
					{priceFormatter.format(Number(i.price))}
				</span>
			),
		},
		{
			key: "stock",
			header: "Stock",
			sortable: true,
			align: "right",
			sortValue: (i) => Number(i.stock),
			cell: (i) => (
				<span className="tabular-nums">
					{Number(i.stock)} {i.uom}
				</span>
			),
		},
		{
			key: "low_alert_count",
			header: "Low Alert",
			sortable: true,
			align: "right",
			sortValue: (i) => Number(i.low_alert_count),
			cell: (i) => (
				<span className="text-muted-foreground tabular-nums">
					{Number(i.low_alert_count)}
				</span>
			),
		},
		{
			key: "stock_status",
			header: "Status",
			sortable: true,
			sortValue: (i) => i.stock_status ?? "",
			align: "center",
			cell: (i) => {
				const s = (i.stock_status ?? "ok") as InventoryStockStatus;
				return (
					<span
						className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[s]}`}
					>
						{INVENTORY_STOCK_STATUS_LABELS[s] ?? s}
					</span>
				);
			},
		},
		{
			key: "actions",
			header: "Actions",
			align: "right",
			cell: (i) => (
				<div className="inline-flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setEditing(i)}
						aria-label="Edit"
					>
						<Pencil />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => {
							setDeleteError(null);
							setDeleting(i);
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
				data={items}
				columns={columns}
				getRowKey={(i) => i.id}
				searchKeys={["name", "sku", "barcode", "brand", "category", "supplier"]}
				searchPlaceholder="Search inventory…"
				emptyMessage='No inventory items yet. Click "New item" to create one.'
				minWidth={1500}
			/>
			<InventoryItemFormDialog
				open={!!editing}
				item={editing}
				onClose={() => setEditing(null)}
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete inventory item?"
				description={
					deleting
						? `"${deleting.name}" will be permanently removed. This cannot be undone.${deleteError ? ` — ${deleteError}` : ""}`
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
							await deleteInventoryItemAction(target.id);
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
