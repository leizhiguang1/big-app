"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { deleteInventoryItemAction } from "@/lib/actions/inventory";
import {
	type InventoryKind,
	type InventoryStockStatus,
	INVENTORY_STOCK_STATUS_LABELS,
} from "@/lib/schemas/inventory";
import type {
	InventoryBrand,
	InventoryCategory,
	InventoryItemWithRefs,
	InventoryUom,
	Supplier,
} from "@/lib/services/inventory";
import { cn } from "@/lib/utils";
import { ItemFormDialog } from "./ItemForm";

const priceFormatter = new Intl.NumberFormat("en-MY", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const dash = <span className="text-muted-foreground">—</span>;

// Prototype's "Type" column shorthand: P(R) / P(NR) / C(R) / C(NR) / M(R) / M(NR)
const KIND_INITIAL: Record<InventoryKind, string> = {
	product: "P",
	consumable: "C",
	medication: "M",
};

function typeLabel(kind: InventoryKind, isSellable: boolean): string {
	return `${KIND_INITIAL[kind]}(${isSellable ? "R" : "NR"})`;
}

const KIND_PILL: Record<InventoryKind, string> = {
	product: "bg-blue-50 text-blue-700 ring-blue-200",
	consumable: "bg-emerald-50 text-emerald-700 ring-emerald-200",
	medication: "bg-violet-50 text-violet-700 ring-violet-200",
};

const STATUS_PILL: Record<InventoryStockStatus, string> = {
	normal: "bg-emerald-50 text-emerald-700 ring-emerald-200",
	low: "bg-amber-50 text-amber-700 ring-amber-200",
	out: "bg-rose-50 text-rose-700 ring-rose-200",
};

// "1 BOX = 100 PCS" for product/2-tier
// "1 BOX = 100 PCS / 4 USE" for consumable / medication (3-tier)
function conversionFactor(item: InventoryItemWithRefs): string {
	const p = item.purchasing_uom?.name ?? "—";
	const s = item.stock_uom?.name ?? "—";
	const factor1 = Number(item.purchasing_to_stock_factor);
	const head = `1 ${p} = ${factor1} ${s}`;
	if (item.use_uom && item.stock_to_use_factor != null) {
		return `${head} / ${Number(item.stock_to_use_factor)} ${item.use_uom.name}`;
	}
	return head;
}

// Stock (UoM 1) = stock in stock_uom. Display "<value> <stock_uom>"
function stockUom1(item: InventoryItemWithRefs): string {
	return `${Number(item.stock)} ${item.stock_uom?.name ?? ""}`.trim();
}

// Stock (UoM 2) = stock in use_uom (= stock × stock_to_use_factor) when use UoM exists.
// For 2-tier products, the prototype repeats the stock UoM value.
function stockUom2(item: InventoryItemWithRefs): string {
	if (item.use_uom && item.stock_to_use_factor != null) {
		const v = Number(item.stock) * Number(item.stock_to_use_factor);
		return `${v} ${item.use_uom.name}`;
	}
	return `${Number(item.stock)} ${item.stock_uom?.name ?? ""}`.trim();
}

type Props = {
	items: InventoryItemWithRefs[];
	uoms: InventoryUom[];
	brands: InventoryBrand[];
	categories: InventoryCategory[];
	suppliers: Supplier[];
};

export function ItemsTable({
	items,
	uoms,
	brands,
	categories,
	suppliers,
}: Props) {
	const [editing, setEditing] = useState<InventoryItemWithRefs | null>(null);
	const [deleting, setDeleting] = useState<InventoryItemWithRefs | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<InventoryItemWithRefs>[] = [
		{
			key: "description",
			header: "Description",
			sortable: true,
			sortValue: (i) => i.name,
			cell: (i) => <div className="font-medium">{i.name}</div>,
		},
		{
			key: "sku",
			header: "SKU",
			sortable: true,
			sortValue: (i) => i.sku,
			cell: (i) => (
				<span className="font-mono text-muted-foreground text-xs">{i.sku}</span>
			),
		},
		{
			key: "type",
			header: "Type",
			sortable: true,
			sortValue: (i) => typeLabel(i.kind as InventoryKind, i.is_sellable),
			cell: (i) => (
				<span
					className={cn(
						"inline-flex rounded-full px-2 py-0.5 font-mono text-xs ring-1 ring-inset",
						KIND_PILL[i.kind as InventoryKind],
					)}
				>
					{typeLabel(i.kind as InventoryKind, i.is_sellable)}
				</span>
			),
		},
		{
			key: "barcode",
			header: "Barcode",
			cell: (i) =>
				i.barcode ? (
					<span className="font-mono text-muted-foreground text-xs">
						{i.barcode}
					</span>
				) : (
					dash
				),
		},
		{
			key: "conversion_factor",
			header: "Conversion Factor",
			cell: (i) => (
				<span className="font-mono text-muted-foreground text-xs">
					{conversionFactor(i)}
				</span>
			),
		},
		{
			key: "price",
			header: "Price (MYR)",
			sortable: true,
			align: "right",
			sortValue: (i) => Number(i.selling_price),
			cell: (i) => (
				<span className="tabular-nums">
					{priceFormatter.format(Number(i.selling_price))}
				</span>
			),
		},
		{
			key: "brand",
			header: "Brand",
			sortable: true,
			sortValue: (i) => i.brand?.name ?? "",
			cell: (i) => (
				<span className="text-muted-foreground">{i.brand?.name ?? dash}</span>
			),
		},
		{
			key: "category",
			header: "Category",
			sortable: true,
			sortValue: (i) => i.category?.name ?? "",
			cell: (i) => (
				<span className="text-muted-foreground">
					{i.category?.name ?? dash}
				</span>
			),
		},
		{
			key: "supplier",
			header: "Supplier",
			sortable: true,
			sortValue: (i) => i.supplier?.name ?? "",
			cell: (i) => (
				<span className="text-muted-foreground">
					{i.supplier?.name ?? dash}
				</span>
			),
		},
		{
			key: "in_transit",
			header: "In transit",
			sortable: true,
			align: "right",
			sortValue: (i) => Number(i.in_transit),
			cell: (i) => (
				<span className="tabular-nums text-muted-foreground">
					{Number(i.in_transit)} {i.stock_uom?.name ?? ""}
				</span>
			),
		},
		{
			key: "locked",
			header: "Locked",
			sortable: true,
			align: "right",
			sortValue: (i) => Number(i.locked),
			cell: (i) =>
				Number(i.locked) > 0 ? (
					<span className="tabular-nums text-muted-foreground">
						{Number(i.locked)} {i.stock_uom?.name ?? ""}
					</span>
				) : (
					dash
				),
		},
		{
			key: "stock_uom_1",
			header: "Stock (UoM 1)",
			sortable: true,
			align: "right",
			sortValue: (i) => Number(i.stock),
			cell: (i) => <span className="tabular-nums">{stockUom1(i)}</span>,
		},
		{
			key: "stock_uom_2",
			header: "Stock (UoM 2)",
			align: "right",
			cell: (i) => (
				<span className="tabular-nums text-muted-foreground">
					{stockUom2(i)}
				</span>
			),
		},
		{
			key: "location",
			header: "Location",
			sortable: true,
			sortValue: (i) => i.location ?? "",
			cell: (i) => (
				<span className="text-muted-foreground">{i.location ?? dash}</span>
			),
		},
		{
			key: "low_alert_count",
			header: "Low Alert Count",
			sortable: true,
			align: "right",
			sortValue: (i) => Number(i.stock_alert_count),
			cell: (i) => (
				<span className="tabular-nums text-muted-foreground">
					{Number(i.stock_alert_count)} {i.stock_uom?.name ?? ""}
				</span>
			),
		},
		{
			key: "discount_cap",
			header: "Discount Cap",
			sortable: true,
			align: "right",
			sortValue: (i) => (i.discount_cap == null ? -1 : Number(i.discount_cap)),
			cell: (i) =>
				i.discount_cap == null ? (
					dash
				) : (
					<span className="tabular-nums text-muted-foreground">
						{Number(i.discount_cap)}%
					</span>
				),
		},
		{
			key: "stock_status",
			header: "Stock Status",
			sortable: true,
			sortValue: (i) => i.stock_status ?? "",
			cell: (i) => {
				const s = (i.stock_status ?? "normal") as InventoryStockStatus;
				return (
					<span
						className={cn(
							"inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ring-inset",
							STATUS_PILL[s],
						)}
					>
						{INVENTORY_STOCK_STATUS_LABELS[s]}
					</span>
				);
			},
		},
		{
			key: "actions",
			header: "",
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
				searchKeys={["name", "sku", "barcode"]}
				searchPlaceholder="Search items…"
				emptyMessage="No inventory items yet. Click “Add item” to create one."
				minWidth={1900}
			/>
			{editing && (
				<ItemFormDialog
					open={!!editing}
					mode="edit"
					kind={editing.kind as InventoryKind}
					item={editing}
					uoms={uoms}
					brands={brands}
					categories={categories}
					suppliers={suppliers}
					onClose={() => setEditing(null)}
				/>
			)}
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete item?"
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
