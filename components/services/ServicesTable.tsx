"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { deleteServiceAction } from "@/lib/actions/services";
import { SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/schemas/services";
import type {
	ServiceCategory,
	ServiceWithCategory,
} from "@/lib/services/services";
import { ServiceFormDialog } from "./ServiceForm";

const priceFormatter = new Intl.NumberFormat("en-MY", {
	style: "currency",
	currency: "MYR",
	minimumFractionDigits: 2,
});

const dash = <span className="text-muted-foreground">—</span>;

export function ServicesTable({
	services,
	categories,
}: {
	services: ServiceWithCategory[];
	categories: ServiceCategory[];
}) {
	const [editing, setEditing] = useState<ServiceWithCategory | null>(null);
	const [deleting, setDeleting] = useState<ServiceWithCategory | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<ServiceWithCategory>[] = [
		{
			key: "name",
			header: "Name",
			sortable: true,
			sortValue: (s) => s.name,
			cell: (s) => (
				<>
					<div className="font-medium">{s.name}</div>
					<div className="font-mono text-muted-foreground text-xs">{s.sku}</div>
				</>
			),
		},
		{
			key: "type",
			header: "Type",
			sortable: true,
			sortValue: (s) => s.type,
			cell: (s) => (
				<span className="text-muted-foreground">
					{SERVICE_TYPE_LABELS[s.type as ServiceType] ?? s.type}
				</span>
			),
		},
		{
			key: "category",
			header: "Category",
			sortable: true,
			sortValue: (s) => s.category?.name ?? "",
			cell: (s) => (
				<span className="text-muted-foreground">
					{s.category?.name ?? dash}
				</span>
			),
		},
		{
			key: "duration_min",
			header: "Duration",
			sortable: true,
			align: "right",
			cell: (s) => (
				<span className="text-muted-foreground tabular-nums">
					{s.duration_min} min
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
			key: "consumables",
			header: "Consumables",
			cell: (s) => (
				<span className="text-muted-foreground">{s.consumables ?? dash}</span>
			),
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
			cell: (s) => (
				<span className="tabular-nums">
					{priceFormatter.format(Number(s.price))}
				</span>
			),
		},
		{
			key: "full_payment",
			header: "Full Payment?",
			align: "center",
			cell: (s) =>
				s.full_payment ? (
					<span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
						Yes
					</span>
				) : (
					dash
				),
		},
		{
			key: "actions",
			header: "Actions",
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
				minWidth={1300}
			/>
			<ServiceFormDialog
				open={!!editing}
				service={editing}
				categories={categories}
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
