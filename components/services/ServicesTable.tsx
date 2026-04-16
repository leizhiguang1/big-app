"use client";

import { Check, ImageIcon, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { deleteServiceAction } from "@/lib/actions/services";
import type { ServiceType } from "@/lib/schemas/services";
import type {
	ServiceCategory,
	ServiceWithCategory,
} from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";
import { type InventoryItemChoice, ServiceFormDialog } from "./ServiceForm";

const priceFormatter = new Intl.NumberFormat("en-MY", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const dash = <span className="text-muted-foreground">—</span>;

const TYPE_SHORT: Record<ServiceType, string> = {
	retail: "S (R)",
	non_retail: "S (NR)",
};

function formatDuration(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${String(h).padStart(2, "0")} Hour(s) ${String(m).padStart(2, "0")} Minute(s)`;
}

export function ServicesTable({
	services,
	categories,
	taxes,
	inventoryItems,
}: {
	services: ServiceWithCategory[];
	categories: ServiceCategory[];
	taxes: Tax[];
	inventoryItems: InventoryItemChoice[];
}) {
	const [editing, setEditing] = useState<ServiceWithCategory | null>(null);
	const [deleting, setDeleting] = useState<ServiceWithCategory | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<ServiceWithCategory>[] = [
		{
			key: "image",
			header: "",
			headerClassName: "w-12",
			cell: (s) => (
				<div className="flex size-10 items-center justify-center rounded-md border bg-muted/30">
					{s.image_url ? (
						// biome-ignore lint/performance/noImgElement: avatar thumbnail
						<img
							src={s.image_url}
							alt=""
							className="size-full rounded-md object-cover"
						/>
					) : (
						<ImageIcon className="size-4 text-muted-foreground/50" />
					)}
				</div>
			),
		},
		{
			key: "name",
			header: "Description",
			sortable: true,
			sortValue: (s) => s.name,
			cell: (s) => (
				<button
					type="button"
					className="text-left font-medium text-primary hover:underline"
					onClick={() => setEditing(s)}
				>
					{s.name}
				</button>
			),
		},
		{
			key: "sku",
			header: "SKU",
			sortable: true,
			sortValue: (s) => s.sku,
			cell: (s) => (
				<span className="font-mono text-muted-foreground text-xs">{s.sku}</span>
			),
		},
		{
			key: "type",
			header: "Type",
			sortable: true,
			sortValue: (s) => s.type,
			cell: (s) => (
				<span className="text-muted-foreground">
					{TYPE_SHORT[s.type as ServiceType] ?? s.type}
				</span>
			),
		},
		{
			key: "category",
			header: "Category",
			sortable: true,
			sortValue: (s) => s.category?.name ?? "",
			cell: (s) => (
				<span className="text-muted-foreground uppercase">
					{s.category?.name ?? dash}
				</span>
			),
		},
		{
			key: "duration_min",
			header: "Duration",
			sortable: true,
			sortValue: (s) => s.duration_min,
			cell: (s) => (
				<span className="text-muted-foreground text-xs tabular-nums">
					{formatDuration(s.duration_min)}
				</span>
			),
		},
		{
			key: "incentive_type",
			header: "Incentive Type",
			sortable: true,
			sortValue: (s) => s.incentive_type ?? "",
			cell: (s) => (
				<span className="text-muted-foreground">
					{s.incentive_type ?? dash}
				</span>
			),
		},
		{
			key: "inventory_links",
			header: "Consumables",
			align: "center",
			cell: (s) => {
				const n = s.inventory_links?.length ?? 0;
				if (n === 0) return dash;
				return (
					<span className="text-muted-foreground text-xs">
						{n} item{n === 1 ? "" : "s"}
					</span>
				);
			},
		},
		{
			key: "discount_cap",
			header: "Discount Cap",
			sortable: true,
			align: "right",
			sortValue: (s) => s.discount_cap ?? -1,
			cell: (s) =>
				s.discount_cap == null ? (
					dash
				) : (
					<span className="text-muted-foreground tabular-nums">
						{Number(s.discount_cap)}%
					</span>
				),
		},
		{
			key: "price",
			header: "Price",
			sortable: true,
			align: "right",
			sortValue: (s) => Number(s.price),
			cell: (s) => {
				const hasRange =
					s.allow_cash_price_range &&
					s.price_min != null &&
					s.price_max != null;
				return (
					<span
						className="tabular-nums"
						title={
							hasRange
								? `Range ${priceFormatter.format(Number(s.price_min))} – ${priceFormatter.format(Number(s.price_max))}`
								: undefined
						}
					>
						{priceFormatter.format(Number(s.price))}
					</span>
				);
			},
		},
		{
			key: "full_payment",
			header: "Full Payment?",
			align: "center",
			cell: (s) =>
				s.full_payment ? (
					<Check className="mx-auto size-4 text-primary" />
				) : (
					dash
				),
		},
		{
			key: "actions",
			header: "",
			align: "right",
			cell: (s) => (
				<div className="inline-flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setEditing(s)}
						aria-label="Edit"
					>
						<Pencil />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => {
							setDeleteError(null);
							setDeleting(s);
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
				data={services}
				columns={columns}
				getRowKey={(s) => s.id}
				searchKeys={["name", "sku"]}
				searchPlaceholder="Search services…"
				emptyMessage="No services yet. Click “New service” to create one."
				minWidth={1400}
			/>
			<ServiceFormDialog
				open={!!editing}
				service={editing}
				categories={categories}
				taxes={taxes}
				inventoryItems={inventoryItems}
				onClose={() => setEditing(null)}
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete service?"
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
							await deleteServiceAction(target.id);
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
