"use client";

import { Package, Pencil } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	type InventoryKind,
	INVENTORY_KIND_LABELS,
} from "@/lib/schemas/inventory";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
import { cn } from "@/lib/utils";

const priceFormatter = new Intl.NumberFormat("en-MY", {
	style: "currency",
	currency: "MYR",
});

const KIND_PILL: Record<InventoryKind, string> = {
	product: "bg-blue-50 text-blue-700 ring-blue-200",
	consumable: "bg-emerald-50 text-emerald-700 ring-emerald-200",
	medication: "bg-violet-50 text-violet-700 ring-violet-200",
};

// Placeholder row shape. Phase 2 `inventory_movements` + outlet joins + staff
// join produce exactly this shape.
type MovementRow = {
	id: string;
	date: string;
	origin: string | null;
	target: string | null;
	transaction_no: string | null;
	batch_no: string | null;
	in_qty: number;
	out_qty: number;
	balance: number;
	reserved: number;
	staff_name: string | null;
};

type BatchRow = {
	id: string;
	date: string;
	batch_no: string | null;
	transaction_no: string | null;
	balance: number;
};

const dash = <span className="text-muted-foreground">—</span>;

const NO_BATCH = (
	<span className="font-semibold text-sky-600 text-xs uppercase">
		No Batch
	</span>
);

const movementColumns: DataTableColumn<MovementRow>[] = [
	{
		key: "date",
		header: "DATE",
		sortable: true,
		sortValue: (r) => r.date,
		cell: (r) => (
			<span className="whitespace-nowrap text-muted-foreground text-xs">
				{r.date}
			</span>
		),
	},
	{
		key: "origin",
		header: "ORIGIN",
		cell: (r) =>
			r.origin ? (
				<span className="font-medium text-xs uppercase">{r.origin}</span>
			) : (
				dash
			),
	},
	{
		key: "target",
		header: "TARGET",
		cell: (r) =>
			r.target ? (
				<span className="font-medium text-xs uppercase">{r.target}</span>
			) : (
				dash
			),
	},
	{
		key: "transaction_no",
		header: "TRANSACTION #",
		cell: (r) =>
			r.transaction_no ? (
				<span className="font-mono text-muted-foreground text-xs">
					{r.transaction_no}
				</span>
			) : (
				dash
			),
	},
	{
		key: "batch_no",
		header: "BATCH #",
		cell: (r) =>
			r.batch_no ? (
				<span className="font-mono text-xs">{r.batch_no}</span>
			) : (
				NO_BATCH
			),
	},
	{
		key: "in_qty",
		header: "IN",
		align: "right",
		cell: (r) => <span className="tabular-nums text-xs">{r.in_qty}</span>,
	},
	{
		key: "out_qty",
		header: "OUT",
		align: "right",
		cell: (r) => <span className="tabular-nums text-xs">{r.out_qty}</span>,
	},
	{
		key: "balance",
		header: "BALANCE",
		align: "right",
		cell: (r) => <span className="tabular-nums text-xs">{r.balance}</span>,
	},
	{
		key: "reserved",
		header: "RESERVED",
		align: "right",
		cell: (r) => <span className="tabular-nums text-xs">{r.reserved}</span>,
	},
	{
		key: "staff_name",
		header: "STAFF NAME",
		cell: (r) =>
			r.staff_name ? (
				<span className="text-muted-foreground text-xs uppercase">
					{r.staff_name}
				</span>
			) : (
				dash
			),
	},
];

const batchColumns: DataTableColumn<BatchRow>[] = [
	{
		key: "date",
		header: "DATE",
		sortable: true,
		sortValue: (r) => r.date,
		cell: (r) => (
			<span className="whitespace-nowrap text-muted-foreground text-xs">
				{r.date}
			</span>
		),
	},
	{
		key: "batch_no",
		header: "BATCH #",
		cell: (r) =>
			r.batch_no ? (
				<span className="font-mono text-xs">{r.batch_no}</span>
			) : (
				NO_BATCH
			),
	},
	{
		key: "transaction_no",
		header: "TRANSACTION #",
		cell: (r) =>
			r.transaction_no ? (
				<span className="font-mono text-muted-foreground text-xs">
					{r.transaction_no}
				</span>
			) : (
				dash
			),
	},
	{
		key: "balance",
		header: "BALANCE",
		align: "right",
		cell: (r) => <span className="tabular-nums text-xs">{r.balance}</span>,
	},
];

type Props = {
	open: boolean;
	item: InventoryItemWithRefs | null;
	onClose: () => void;
};

export function StockDetailsDialog({ open, item, onClose }: Props) {
	if (!item) return null;

	// Phase 2 `inventory_movements` fills these.
	const movements: MovementRow[] = [];
	const batches: BatchRow[] = [];

	const kind = item.kind as InventoryKind;
	const kindCode = kind.charAt(0).toUpperCase();
	const sellableCode = item.is_sellable ? "R" : "NR";

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[95vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1400px,95vw)]">
				<DialogHeader className="border-b bg-muted/30 px-6 py-3">
					<DialogTitle className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide">
						<span className="text-primary">
							{INVENTORY_KIND_LABELS[kind]}s
						</span>
						<span className="text-muted-foreground">/</span>
						<span className="text-primary">
							{kindCode} ({sellableCode})
						</span>
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-auto bg-muted/20 p-6">
					<div className="grid gap-6 lg:grid-cols-[340px_1fr]">
						{/* LEFT — item card + batches table */}
						<div className="flex flex-col gap-6">
							<ItemCard item={item} kind={kind} />
							<section className="rounded-lg border bg-background p-4 shadow-sm">
								<DataTable
									data={batches}
									columns={batchColumns}
									getRowKey={(b) => b.id}
									searchKeys={["batch_no", "transaction_no"]}
									searchPlaceholder="Search:"
									emptyMessage="No batches tracked yet."
									minWidth={320}
								/>
								<div className="mt-3 flex items-center justify-between text-muted-foreground text-xs">
									<span>
										Showing {batches.length} to {batches.length} of{" "}
										{batches.length} entries
									</span>
								</div>
							</section>
						</div>

						{/* RIGHT — brand/supplier/category + stock details table */}
						<div className="flex flex-col gap-6">
							<div className="grid gap-4 sm:grid-cols-3">
								<InfoTile label="Brand" value={item.brand?.name ?? null} />
								<InfoTile
									label="Supplier"
									value={item.supplier?.name ?? null}
								/>
								<InfoTile
									label="Category"
									value={item.category?.name ?? null}
								/>
							</div>

							<section className="rounded-lg border bg-background p-4 shadow-sm">
								<h3 className="mb-3 font-semibold text-sm">Stock Details</h3>
								<DataTable
									data={movements}
									columns={movementColumns}
									getRowKey={(m) => m.id}
									searchKeys={[
										"transaction_no",
										"batch_no",
										"origin",
										"target",
										"staff_name",
									]}
									searchPlaceholder="Search:"
									emptyMessage={
										<div className="px-6 py-12 text-sm">
											No stock movements yet. The movement ledger lights up
											when the Phase 2 inventory lifecycle ships (purchase
											orders, transfers, receiving, treatment consumption).
										</div>
									}
									minWidth={900}
								/>
								<div className="mt-3 flex items-center justify-between text-muted-foreground text-xs">
									<span>
										Showing {movements.length} to {movements.length} of{" "}
										{movements.length} entries
									</span>
								</div>
							</section>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function ItemCard({
	item,
	kind,
}: {
	item: InventoryItemWithRefs;
	kind: InventoryKind;
}) {
	const useUomName = item.use_uom?.name ?? item.stock_uom?.name ?? "";
	const factor =
		item.stock_to_use_factor != null
			? Number(item.stock_to_use_factor)
			: Number(item.purchasing_to_stock_factor);
	return (
		<section className="rounded-lg border bg-background p-5 shadow-sm">
			<div className="relative mx-auto flex size-32 items-center justify-center overflow-hidden rounded-md border-2 border-dashed bg-muted">
				{item.image_path ? (
					// biome-ignore lint/performance/noImgElement: placeholder, Storage upload lands later
					<img
						src={item.image_path}
						alt={item.name}
						className="size-full object-cover"
					/>
				) : (
					<Package className="size-10 text-muted-foreground" />
				)}
				<button
					type="button"
					className="absolute right-1 bottom-1 flex size-6 items-center justify-center rounded-full bg-background text-muted-foreground shadow ring-1 ring-border hover:text-foreground"
					aria-label="Edit image"
					disabled
				>
					<Pencil className="size-3" />
				</button>
			</div>
			<div className="mt-4 text-center">
				<div
					className={cn(
						"mb-2 inline-flex rounded-full px-2 py-0.5 font-mono text-xs ring-1 ring-inset",
						KIND_PILL[kind],
					)}
				>
					{factor} {useUomName}
				</div>
				<div className="font-semibold text-base leading-tight">{item.name}</div>
			</div>
			<div className="mt-4 border-t pt-3 text-center">
				<div className="text-muted-foreground text-xs">Selling Price</div>
				<div className="mt-1 font-bold text-2xl tabular-nums text-primary">
					{priceFormatter.format(Number(item.selling_price))}
				</div>
			</div>
		</section>
	);
}

function InfoTile({
	label,
	value,
}: {
	label: string;
	value: string | null;
}) {
	return (
		<div className="rounded-lg border bg-background p-4 shadow-sm">
			<div className="text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</div>
			<div className="mt-1 truncate font-semibold text-base uppercase">
				{value ?? <span className="text-muted-foreground">—</span>}
			</div>
		</div>
	);
}
