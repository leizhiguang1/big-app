"use client";

import { Plus, Save, Search, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
	BillingItemPickerDialog,
	type BillingItemSelection,
} from "@/components/appointments/BillingItemPickerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	createLineItemsBulkAction,
	deleteLineItemAction,
	updateLineItemAction,
} from "@/lib/actions/appointments";
import type { LineItemType } from "@/lib/schemas/appointments";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";

type Props = {
	appointmentId: string;
	entries: AppointmentLineItem[];
	services: ServiceWithCategory[];
	products: InventoryItemWithRefs[];
	taxes: Tax[];
	onChange: () => void;
};

type Item = {
	key: string;
	id: string | null;
	item_type: LineItemType;
	service_id: string | null;
	product_id: string | null;
	description: string;
	quantity: number;
	unit_price: number;
	discount: number;
	tax_id: string | null;
	notes: string;
};

function toItem(e: AppointmentLineItem): Item {
	return {
		key: e.id,
		id: e.id,
		item_type: (e.item_type as LineItemType) ?? "service",
		service_id: e.service_id ?? null,
		product_id: e.product_id ?? null,
		description: e.description,
		quantity: Number(e.quantity),
		unit_price: Number(e.unit_price),
		discount: 0,
		tax_id: e.tax_id ?? null,
		notes: e.notes ?? "",
	};
}

function newDraft(): Item {
	return {
		key: crypto.randomUUID(),
		id: null,
		item_type: "service",
		service_id: null,
		product_id: null,
		description: "",
		quantity: 1,
		unit_price: 0,
		discount: 0,
		tax_id: null,
		notes: "",
	};
}

// Pick the default tax for a newly added line item: prefer "Local" when it's
// in the parent's available list, otherwise the first available active tax.
function defaultTaxForParent(
	parentTaxIds: string[],
	taxes: Tax[],
): string | null {
	if (parentTaxIds.length === 0) return null;
	const available = taxes.filter(
		(t) => t.is_active && parentTaxIds.includes(t.id),
	);
	if (available.length === 0) return null;
	const local = available.find((t) => t.name.toLowerCase() === "local");
	return (local ?? available[0]).id;
}

function computeLineTax(
	lineAmount: number,
	taxId: string | null,
	taxes: Tax[],
): { rate: number; amount: number } {
	if (!taxId) return { rate: 0, amount: 0 };
	const tax = taxes.find((t) => t.id === taxId);
	if (!tax) return { rate: 0, amount: 0 };
	const rate = Number(tax.rate_pct);
	const safe = Math.max(0, lineAmount);
	return { rate, amount: Math.round(safe * rate) / 100 };
}

function isReady(item: Item): boolean {
	if (item.quantity <= 0) return false;
	if (item.item_type === "service") return !!item.service_id;
	if (item.item_type === "product") return !!item.product_id;
	return false;
}

function isDirty(item: Item, entries: AppointmentLineItem[]): boolean {
	if (!item.id) return false;
	const orig = entries.find((e) => e.id === item.id);
	if (!orig) return false;
	return (
		Number(orig.quantity) !== item.quantity ||
		Number(orig.unit_price) !== item.unit_price ||
		(orig.notes ?? "") !== item.notes ||
		(orig.service_id ?? null) !== item.service_id ||
		(orig.product_id ?? null) !== item.product_id ||
		(orig.item_type ?? "service") !== item.item_type ||
		(orig.tax_id ?? null) !== item.tax_id
	);
}

export function BillingSection({
	appointmentId,
	entries,
	services,
	products,
	taxes,
	onChange,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [items, setItems] = useState<Item[]>(() => entries.map(toItem));
	const [batchNote, setBatchNote] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pickerKey, setPickerKey] = useState<string | null>(null);

	useEffect(() => {
		setItems((prev) => {
			const keptDrafts = prev.filter((i) => i.id === null);
			return [...entries.map(toItem), ...keptDrafts];
		});
	}, [entries]);

	const serviceById = new Map(services.map((s) => [s.id, s]));
	const productById = new Map(products.map((p) => [p.id, p]));

	function parentTaxIdsFor(item: Item): string[] {
		if (item.item_type === "service" && item.service_id) {
			return serviceById.get(item.service_id)?.tax_ids ?? [];
		}
		if (item.item_type === "product" && item.product_id) {
			return productById.get(item.product_id)?.tax_ids ?? [];
		}
		return [];
	}

	const totalQty = items.reduce((s, i) => s + i.quantity, 0);
	const totalDiscount = items.reduce((s, i) => s + i.discount, 0);
	const subtotal = items.reduce(
		(s, i) => s + Math.max(0, i.quantity * i.unit_price - i.discount),
		0,
	);
	const totalTax = items.reduce((s, i) => {
		const lineAmount = i.quantity * i.unit_price - i.discount;
		return s + computeLineTax(lineAmount, i.tax_id, taxes).amount;
	}, 0);
	const total = subtotal + totalTax;

	const update = (key: string, patch: Partial<Item>) =>
		setItems((rows) =>
			rows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
		);

	const onPick = (key: string, selection: BillingItemSelection) => {
		if (selection.type === "service") {
			const svc = selection.service;
			update(key, {
				item_type: "service",
				service_id: svc.id,
				product_id: null,
				description: svc.name,
				unit_price: Number(svc.price),
				tax_id: defaultTaxForParent(svc.tax_ids ?? [], taxes),
			});
		} else {
			const prod = selection.product;
			update(key, {
				item_type: "product",
				product_id: prod.id,
				service_id: null,
				description: prod.name,
				unit_price: Number(prod.selling_price ?? 0),
				tax_id: defaultTaxForParent(prod.tax_ids ?? [], taxes),
			});
		}
	};

	const onAddRow = () => {
		const draft = newDraft();
		setItems((rows) => [...rows, draft]);
		setPickerKey(draft.key);
	};

	const onRemove = (item: Item) => {
		if (item.id === null) {
			setItems((rows) => rows.filter((r) => r.key !== item.key));
			return;
		}
		const id = item.id;
		setItems((rows) => rows.filter((r) => r.id !== id));
		startTransition(async () => {
			try {
				await deleteLineItemAction(appointmentId, id);
				onChange();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Delete failed");
				onChange();
			}
		});
	};

	const newCreates = items.filter((i) => i.id === null && isReady(i));
	const dirtyEdits = items.filter((i) => isDirty(i, entries));
	const canSave = (newCreates.length > 0 || dirtyEdits.length > 0) && !pending;

	const onSave = () => {
		setError(null);
		const sharedNote = batchNote.trim() || null;
		const creates = newCreates.map((i) => ({
			appointment_id: appointmentId,
			item_type: i.item_type,
			service_id: i.item_type === "service" ? i.service_id : null,
			product_id: i.item_type === "product" ? i.product_id : null,
			description: i.description || fallbackDescription(i),
			quantity: i.quantity,
			unit_price: i.unit_price,
			tax_id: i.tax_id,
			notes: i.notes || sharedNote,
		}));

		startTransition(async () => {
			try {
				for (const i of dirtyEdits) {
					await updateLineItemAction(appointmentId, i.id!, {
						appointment_id: appointmentId,
						item_type: i.item_type,
						service_id: i.item_type === "service" ? i.service_id : null,
						product_id: i.item_type === "product" ? i.product_id : null,
						description: i.description || fallbackDescription(i),
						quantity: i.quantity,
						unit_price: i.unit_price,
						tax_id: i.tax_id,
						notes: i.notes || null,
					});
				}
				if (creates.length > 0) {
					await createLineItemsBulkAction(appointmentId, creates);
				}
				setBatchNote("");
				onChange();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Save failed");
				onChange();
			}
		});
	};

	const activePickerItem = items.find((i) => i.key === pickerKey) ?? null;
	const activePickerSelected: React.ComponentProps<
		typeof BillingItemPickerDialog
	>["selected"] = activePickerItem
		? activePickerItem.item_type === "service" && activePickerItem.service_id
			? { type: "service", id: activePickerItem.service_id }
			: activePickerItem.item_type === "product" && activePickerItem.product_id
				? { type: "product", id: activePickerItem.product_id }
				: null
		: null;

	return (
		<div className="flex flex-col gap-4 rounded-md border bg-card p-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="font-semibold text-sm">Billing</h3>
					<p className="text-muted-foreground text-xs">
						{items.length} {items.length === 1 ? "item" : "items"}
					</p>
				</div>
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={onAddRow}
					disabled={pending}
				>
					<Plus className="size-3.5" />
					Add item
				</Button>
			</div>

			<div className="flex flex-col gap-2.5">
				{items.length === 0 && (
					<div className="rounded-md border border-dashed p-8 text-center text-muted-foreground text-sm">
						No billing items yet. Click <b>Add item</b> to start.
					</div>
				)}

				{items.map((item) => {
					const svc =
						item.item_type === "service" && item.service_id
							? serviceById.get(item.service_id)
							: null;
					const prod =
						item.item_type === "product" && item.product_id
							? productById.get(item.product_id)
							: null;
					const lineAmount = item.quantity * item.unit_price - item.discount;
					const lineTotal = Math.max(0, lineAmount);
					const lineTaxIds = parentTaxIdsFor(item);
					const lineTaxes = taxes.filter(
						(t) => t.is_active && lineTaxIds.includes(t.id),
					);
					const currentTax =
						lineTaxes.find((t) => t.id === item.tax_id) ?? null;
					const lineTaxAmount = computeLineTax(
						lineAmount,
						item.tax_id,
						taxes,
					).amount;
					return (
						<div
							key={item.key}
							className="flex flex-col gap-3 rounded-md border bg-background p-3"
						>
							<div className="flex items-start justify-between gap-3">
								<button
									type="button"
									onClick={() => setPickerKey(item.key)}
									className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left transition hover:bg-muted/60"
								>
									{svc ? (
										<div className="flex min-w-0 flex-col">
											<div className="flex items-center gap-2">
												<span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-[10px] text-primary uppercase">
													Service
												</span>
												<span className="truncate font-semibold text-sm">
													{svc.name}
												</span>
												<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
													{svc.sku}
												</span>
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-xs">
												{svc.category?.name && <span>{svc.category.name}</span>}
												<span>·</span>
												<span>{svc.duration_min} min</span>
											</div>
										</div>
									) : prod ? (
										<div className="flex min-w-0 flex-col">
											<div className="flex items-center gap-2">
												<span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-[10px] text-emerald-600 uppercase dark:text-emerald-400">
													Product
												</span>
												<span className="truncate font-semibold text-sm">
													{prod.name}
												</span>
												<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
													{prod.sku}
												</span>
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-xs">
												{prod.brand?.name && <span>{prod.brand.name}</span>}
												{prod.category?.name && (
													<>
														<span>·</span>
														<span>{prod.category.name}</span>
													</>
												)}
											</div>
										</div>
									) : (
										<span className="flex items-center gap-1.5 text-muted-foreground text-sm">
											<Search className="size-3.5" />
											Pick a service or product…
										</span>
									)}
								</button>
								<button
									type="button"
									onClick={() => onRemove(item)}
									disabled={pending}
									className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:opacity-50"
									aria-label="Remove line"
								>
									<X className="size-3.5" />
								</button>
							</div>

							<div className="grid grid-cols-2 gap-3 md:grid-cols-[80px_120px_120px_1fr]">
								<Field label="Qty">
									<Input
										type="number"
										min={1}
										step="1"
										value={item.quantity}
										onChange={(e) =>
											update(item.key, {
												quantity: Number(e.target.value) || 0,
											})
										}
										className="h-8 text-right text-sm tabular-nums"
										aria-label="Quantity"
									/>
								</Field>
								<Field label="Unit Price (MYR)">
									<Input
										type="number"
										step="0.01"
										value={item.unit_price}
										onChange={(e) =>
											update(item.key, {
												unit_price: Number(e.target.value) || 0,
											})
										}
										className="h-8 text-right text-sm tabular-nums"
										aria-label="Unit price"
									/>
								</Field>
								<Field label="Discount (MYR)">
									<Input
										type="number"
										step="0.01"
										value={item.discount}
										onChange={(e) =>
											update(item.key, {
												discount: Number(e.target.value) || 0,
											})
										}
										className="h-8 text-right text-sm tabular-nums"
										aria-label="Discount"
									/>
								</Field>
								<Field label="Line Total (MYR)">
									<div className="flex h-8 items-center justify-end rounded-md border border-transparent bg-muted/40 px-2 font-semibold text-sm tabular-nums">
										{lineTotal.toFixed(2)}
									</div>
								</Field>
							</div>

							<div className="flex flex-wrap items-center gap-2 text-xs">
								<span className="text-muted-foreground">Tax</span>
								{lineTaxes.length === 0 ? (
									<span className="text-muted-foreground italic">
										No taxes configured for this item
									</span>
								) : (
									<select
										value={item.tax_id ?? ""}
										onChange={(e) =>
											update(item.key, {
												tax_id: e.target.value === "" ? null : e.target.value,
											})
										}
										className="h-7 rounded-full border bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
										aria-label="Tax for this line item"
									>
										<option value="">— No tax —</option>
										{lineTaxes.map((t) => (
											<option key={t.id} value={t.id}>
												({t.name.toUpperCase()}) {Number(t.rate_pct).toFixed(2)}
												%
											</option>
										))}
									</select>
								)}
								{currentTax && (
									<span className="text-muted-foreground tabular-nums">
										Tax Amount (MYR): {lineTaxAmount.toFixed(2)}
									</span>
								)}
							</div>

							<Field label="Remarks">
								<Input
									type="text"
									placeholder="Optional — e.g. left upper molar, numbing cream applied"
									value={item.notes}
									onChange={(e) => update(item.key, { notes: e.target.value })}
									className="h-8 text-sm"
									aria-label="Remarks"
								/>
							</Field>
						</div>
					);
				})}
			</div>

			<div className="flex flex-col gap-4 border-t pt-4 md:flex-row md:items-start md:justify-between md:gap-8">
				<div className="flex w-full flex-col gap-1 md:max-w-[280px]">
					<label
						htmlFor="billing-batch-note"
						className="text-muted-foreground text-xs"
					>
						Message to frontdesk
					</label>
					<textarea
						id="billing-batch-note"
						placeholder="Optional — e.g. waive deposit, follow-up call needed"
						value={batchNote}
						onChange={(e) => setBatchNote(e.target.value)}
						rows={3}
						className="w-full resize-y rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					/>
				</div>

				<div className="flex min-w-[260px] flex-col gap-1.5 text-sm md:ml-auto">
					<SummaryRow label="Total Qty">
						<span className="font-semibold text-foreground tabular-nums">
							{totalQty.toFixed(2)}
						</span>
					</SummaryRow>
					<SummaryRow label="Total Tax Amount (MYR)">
						<span className="tabular-nums">{totalTax.toFixed(2)}</span>
					</SummaryRow>
					<SummaryRow label="Discount">
						<span className="tabular-nums">({totalDiscount.toFixed(2)})</span>
					</SummaryRow>
					<div className="mt-1 flex items-center justify-between border-t pt-1.5 font-semibold text-foreground">
						<span>Total (MYR)</span>
						<span className="text-base tabular-nums">{total.toFixed(2)}</span>
					</div>
					<div className="mt-3 flex justify-end">
						<Button
							type="button"
							size="sm"
							onClick={onSave}
							disabled={!canSave}
						>
							<Save className="size-3.5" />
							Save billing
						</Button>
					</div>
				</div>
			</div>

			{error && <p className="text-destructive text-xs">{error}</p>}

			<BillingItemPickerDialog
				open={pickerKey !== null}
				onOpenChange={(o) => !o && setPickerKey(null)}
				services={services}
				products={products}
				selected={activePickerSelected}
				onSelect={(sel) => {
					if (pickerKey) onPick(pickerKey, sel);
				}}
			/>
		</div>
	);
}

function fallbackDescription(i: Item): string {
	if (i.item_type === "service") return "Service";
	if (i.item_type === "product") return "Product";
	return "Charge";
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<label className="flex flex-col gap-1">
			<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
				{label}
			</span>
			{children}
		</label>
	);
}

function SummaryRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between text-muted-foreground">
			<span>{label}</span>
			{children}
		</div>
	);
}
