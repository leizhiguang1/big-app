"use client";

import { Check, Loader2, Plus, Save, Search, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
	BillingItemPickerDialog,
	type BillingItemSelection,
} from "@/components/appointments/BillingItemPickerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	createLineItemsBulkAction,
	deleteLineItemAction,
	saveFrontdeskMessageAction,
	updateLineItemAction,
} from "@/lib/actions/appointments";
import type { LineItemType } from "@/lib/schemas/appointments";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { BillingSettings } from "@/lib/services/billing-settings";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";
import {
	isForeignCustomer,
	resolveDefaultTaxId,
} from "@/lib/utils/resolve-default-tax";

type Props = {
	appointmentId: string;
	entries: AppointmentLineItem[];
	services: ServiceWithCategory[];
	products: InventoryItemWithRefs[];
	taxes: Tax[];
	frontdeskMessage?: string | null;
	customer?: AppointmentWithRelations["customer"];
	billingSettings?: BillingSettings | null;
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

// Pick the default tax for a newly added line item.
// 1. If billing_settings has auto-foreign-tax on and the customer is foreign,
//    prefer the configured foreign_tax_id (even if the parent service/product
//    doesn't list it — the config is a clinic-wide override).
// 2. Else if billing_settings.local_tax_id is set, prefer it when it appears
//    in the parent's tax_ids.
// 3. Else fall back to the legacy heuristic: prefer a tax named "Local" in the
//    parent's tax_ids, otherwise the first active tax in that list.
function defaultTaxForParent(
	parentTaxIds: string[],
	taxes: Tax[],
	customer: AppointmentWithRelations["customer"] | undefined,
	billingSettings: BillingSettings | null | undefined,
): string | null {
	const configured = resolveDefaultTaxId(
		customer ?? null,
		billingSettings ?? null,
	);
	if (
		configured &&
		billingSettings?.auto_foreign_tax_enabled &&
		isForeignCustomer(customer ?? null) &&
		configured === billingSettings.foreign_tax_id
	) {
		return configured;
	}
	if (parentTaxIds.length === 0) return configured ?? null;
	const available = taxes.filter(
		(t) => t.is_active && parentTaxIds.includes(t.id),
	);
	if (available.length === 0) return configured ?? null;
	if (configured && available.some((t) => t.id === configured)) {
		return configured;
	}
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

const COL = "md:grid-cols-[1fr_56px_100px_100px_130px_100px_28px]" as const;

export function BillingSection({
	appointmentId,
	entries,
	services,
	products,
	taxes,
	frontdeskMessage,
	customer,
	billingSettings,
	onChange,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [items, setItems] = useState<Item[]>(() => entries.map(toItem));
	const initialMessage = frontdeskMessage ?? "";
	const [message, setMessage] = useState(initialMessage);
	const savedMessageRef = useRef(initialMessage);
	const [error, setError] = useState<string | null>(null);
	const [pickerKey, setPickerKey] = useState<string | null>(null);
	const [savingKeys, setSavingKeys] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	const savingKeysRef = useRef<ReadonlySet<string>>(new Set());
	savingKeysRef.current = savingKeys;
	const [justSaved, setJustSaved] = useState(false);
	const justSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
		};
	}, []);

	// Re-sync local message after a server refresh, but only when the user
	// hasn't diverged locally — never stomp in-progress typing.
	useEffect(() => {
		const incoming = frontdeskMessage ?? "";
		if (incoming === savedMessageRef.current) return;
		if (message === savedMessageRef.current) {
			setMessage(incoming);
		}
		savedMessageRef.current = incoming;
	}, [frontdeskMessage, message]);

	useEffect(() => {
		setItems((prev) => {
			const saving = savingKeysRef.current;
			const keptDrafts = prev.filter(
				(i) => i.id === null && !saving.has(i.key),
			);
			return [...entries.map(toItem), ...keptDrafts];
		});
		if (savingKeysRef.current.size > 0) setSavingKeys(new Set());
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
				tax_id: defaultTaxForParent(
					svc.tax_ids ?? [],
					taxes,
					customer,
					billingSettings,
				),
			});
		} else {
			const prod = selection.product;
			update(key, {
				item_type: "product",
				product_id: prod.id,
				service_id: null,
				description: prod.name,
				unit_price: Number(prod.selling_price ?? 0),
				tax_id: defaultTaxForParent(
					prod.tax_ids ?? [],
					taxes,
					customer,
					billingSettings,
				),
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
	const messageDirty = message !== savedMessageRef.current;
	const canSave =
		(newCreates.length > 0 || dirtyEdits.length > 0 || messageDirty) &&
		!pending;

	const onSave = () => {
		setError(null);
		const createdKeys = new Set(newCreates.map((i) => i.key));
		const creates = newCreates.map((i) => ({
			appointment_id: appointmentId,
			item_type: i.item_type,
			service_id: i.item_type === "service" ? i.service_id : null,
			product_id: i.item_type === "product" ? i.product_id : null,
			description: i.description || fallbackDescription(i),
			quantity: i.quantity,
			unit_price: i.unit_price,
			tax_id: i.tax_id,
			notes: i.notes || null,
		}));

		if (createdKeys.size > 0) setSavingKeys(createdKeys);
		if (justSavedTimerRef.current) {
			clearTimeout(justSavedTimerRef.current);
			justSavedTimerRef.current = null;
		}
		setJustSaved(false);

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
				if (messageDirty) {
					const trimmed = message.trim();
					await saveFrontdeskMessageAction(
						appointmentId,
						trimmed.length > 0 ? trimmed : null,
					);
					savedMessageRef.current = message;
				}
				setJustSaved(true);
				justSavedTimerRef.current = setTimeout(() => {
					setJustSaved(false);
					justSavedTimerRef.current = null;
				}, 2000);
				onChange();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Save failed");
				setSavingKeys(new Set());
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
		<div className="flex flex-col gap-3 rounded-md border bg-card p-4">
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

			{items.length === 0 ? (
				<div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
					No billing items yet. Click <b>Add item</b> to start.
				</div>
			) : (
				<div className="-mx-4 overflow-x-auto px-4">
					{/* Column headers — desktop only */}
					<div
						className={`hidden border-b pb-1.5 text-[10px] text-muted-foreground uppercase tracking-wide md:grid ${COL} md:items-end md:gap-2 md:px-2`}
					>
						<span>Item</span>
						<span className="text-right">Qty</span>
						<span className="text-right">Price (RM)</span>
						<span className="text-right">Discount (RM)</span>
						<span>Tax</span>
						<span className="text-right">Total (RM)</span>
						<span />
					</div>

					<div className="flex flex-col divide-y divide-border/60">
						{items.map((item) => {
							const svc =
								item.item_type === "service" && item.service_id
									? serviceById.get(item.service_id)
									: null;
							const prod =
								item.item_type === "product" && item.product_id
									? productById.get(item.product_id)
									: null;
							const lineAmount =
								item.quantity * item.unit_price - item.discount;
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
							const isSaving = savingKeys.has(item.key);

							return (
								<div
									key={item.key}
									className={`py-3 transition-opacity first:pt-1 last:pb-1 ${isSaving ? "pointer-events-none opacity-60" : ""}`}
								>
									{/* ── Desktop row ── */}
									<div
										className={`hidden md:grid ${COL} md:items-center md:gap-2 md:px-2`}
									>
										<button
											type="button"
											onClick={() => setPickerKey(item.key)}
											className="flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left transition hover:bg-muted/60"
										>
											{svc ? (
												<>
													<span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-[9px] text-primary uppercase">
														Service
													</span>
													<span className="truncate text-sm">{svc.name}</span>
													{!svc.allow_redemption_without_payment && (
														<span
															className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 uppercase"
															title="Requires full payment at Collection — no partial pay"
														>
															Full pay
														</span>
													)}
												</>
											) : prod ? (
												<>
													<span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-[9px] text-emerald-600 uppercase dark:text-emerald-400">
														Product
													</span>
													<span className="truncate text-sm">{prod.name}</span>
												</>
											) : (
												<span className="flex items-center gap-1 text-muted-foreground text-sm">
													<Search className="size-3" />
													Select item…
												</span>
											)}
										</button>

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
											className="h-7 text-right text-xs tabular-nums"
											aria-label="Quantity"
										/>
										<Input
											type="number"
											step="0.01"
											value={item.unit_price}
											onChange={(e) =>
												update(item.key, {
													unit_price: Number(e.target.value) || 0,
												})
											}
											className="h-7 text-right text-xs tabular-nums"
											aria-label="Unit price"
										/>
										<Input
											type="number"
											step="0.01"
											value={item.discount}
											onChange={(e) =>
												update(item.key, {
													discount: Number(e.target.value) || 0,
												})
											}
											className="h-7 text-right text-xs tabular-nums"
											aria-label="Discount"
										/>

										<select
											value={item.tax_id ?? ""}
											onChange={(e) =>
												update(item.key, {
													tax_id: e.target.value === "" ? null : e.target.value,
												})
											}
											disabled={lineTaxes.length === 0}
											className="h-7 rounded border bg-background px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
											aria-label="Tax for this line item"
										>
											<option value="">No tax</option>
											{lineTaxes.map((t) => (
												<option key={t.id} value={t.id}>
													{t.name} {Number(t.rate_pct).toFixed(0)}%
												</option>
											))}
										</select>

										<div className="text-right font-semibold text-sm tabular-nums">
											{lineTotal.toFixed(2)}
											{currentTax && (
												<div className="font-normal text-[10px] text-muted-foreground">
													+RM {lineTaxAmount.toFixed(2)} tax
												</div>
											)}
										</div>

										<button
											type="button"
											onClick={() => onRemove(item)}
											disabled={pending}
											className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
											aria-label="Remove line"
										>
											<X className="size-3.5" />
										</button>
									</div>

									{/* Desktop: details sub-row */}
									<div className="hidden md:flex md:items-center md:gap-2 md:px-2 md:pt-1 text-[11px] text-muted-foreground">
										{svc && (
											<>
												<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
													{svc.sku}
												</span>
												{svc.category?.name && <span>{svc.category.name}</span>}
												<span>{svc.duration_min} min</span>
											</>
										)}
										{prod && (
											<>
												<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
													{prod.sku}
												</span>
												{prod.brand?.name && <span>{prod.brand.name}</span>}
												{prod.category?.name && (
													<span>{prod.category.name}</span>
												)}
											</>
										)}
										{!svc && !prod && (
											<span className="italic text-muted-foreground/50">
												No item selected
											</span>
										)}
										<Input
											type="text"
											placeholder="Remarks…"
											value={item.notes}
											onChange={(e) =>
												update(item.key, { notes: e.target.value })
											}
											className="ml-auto h-6 w-48 border-transparent bg-transparent px-1.5 text-[11px] text-muted-foreground shadow-none placeholder:text-muted-foreground/40 hover:border-input focus-visible:border-ring focus-visible:text-foreground"
											aria-label="Remarks"
										/>
									</div>

									{/* ── Mobile layout ── */}
									<div className="flex flex-col gap-2 px-1 md:hidden">
										<div className="flex items-start justify-between gap-2">
											<button
												type="button"
												onClick={() => setPickerKey(item.key)}
												className="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left transition hover:bg-muted/60"
											>
												{svc ? (
													<>
														<span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-[9px] text-primary uppercase">
															Service
														</span>
														<span className="truncate text-sm">{svc.name}</span>
														{!svc.allow_redemption_without_payment && (
															<span
																className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 uppercase"
																title="Requires full payment at Collection"
															>
																Full pay
															</span>
														)}
													</>
												) : prod ? (
													<>
														<span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-[9px] text-emerald-600 uppercase dark:text-emerald-400">
															Product
														</span>
														<span className="truncate text-sm">
															{prod.name}
														</span>
													</>
												) : (
													<span className="flex items-center gap-1 text-muted-foreground text-sm">
														<Search className="size-3" />
														Select item…
													</span>
												)}
											</button>
											<button
												type="button"
												onClick={() => onRemove(item)}
												disabled={pending}
												className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
												aria-label="Remove line"
											>
												<X className="size-3.5" />
											</button>
										</div>
										<div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
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
													className="h-7 text-right text-xs tabular-nums"
													aria-label="Quantity"
												/>
											</Field>
											<Field label="Price (RM)">
												<Input
													type="number"
													step="0.01"
													value={item.unit_price}
													onChange={(e) =>
														update(item.key, {
															unit_price: Number(e.target.value) || 0,
														})
													}
													className="h-7 text-right text-xs tabular-nums"
													aria-label="Unit price"
												/>
											</Field>
											<Field label="Discount (RM)">
												<Input
													type="number"
													step="0.01"
													value={item.discount}
													onChange={(e) =>
														update(item.key, {
															discount: Number(e.target.value) || 0,
														})
													}
													className="h-7 text-right text-xs tabular-nums"
													aria-label="Discount"
												/>
											</Field>
											<div className="pb-0.5 text-right font-semibold text-sm tabular-nums">
												{lineTotal.toFixed(2)}
											</div>
										</div>
										<div className="flex items-center gap-2 text-xs">
											<select
												value={item.tax_id ?? ""}
												onChange={(e) =>
													update(item.key, {
														tax_id:
															e.target.value === "" ? null : e.target.value,
													})
												}
												disabled={lineTaxes.length === 0}
												className="h-6 rounded border bg-background px-1.5 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50"
												aria-label="Tax"
											>
												<option value="">No tax</option>
												{lineTaxes.map((t) => (
													<option key={t.id} value={t.id}>
														{t.name} {Number(t.rate_pct).toFixed(0)}%
													</option>
												))}
											</select>
											{currentTax && (
												<span className="tabular-nums text-[11px] text-muted-foreground">
													+RM {lineTaxAmount.toFixed(2)} tax
												</span>
											)}
											<Input
												type="text"
												placeholder="Remarks…"
												value={item.notes}
												onChange={(e) =>
													update(item.key, { notes: e.target.value })
												}
												className="ml-auto h-6 max-w-[140px] border-transparent bg-transparent px-1.5 text-[11px] text-muted-foreground shadow-none placeholder:text-muted-foreground/40 hover:border-input focus-visible:border-ring focus-visible:text-foreground"
												aria-label="Remarks"
											/>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Footer: frontdesk message + summary */}
			<div className="flex flex-col gap-3 border-t pt-3 md:flex-row md:items-start md:justify-between md:gap-6">
				<div className="flex w-full flex-col gap-1 md:max-w-[260px]">
					<label
						htmlFor="billing-frontdesk-message"
						className="text-muted-foreground text-xs"
					>
						Message to frontdesk
					</label>
					<textarea
						id="billing-frontdesk-message"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						rows={2}
						className="w-full resize-y rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					/>
				</div>

				<div className="flex min-w-[240px] flex-col gap-1 text-xs md:ml-auto">
					<SummaryRow label="Subtotal">
						<span className="tabular-nums">RM {subtotal.toFixed(2)}</span>
					</SummaryRow>
					{totalDiscount > 0 && (
						<SummaryRow label="Discount">
							<span className="tabular-nums text-destructive">
								- RM {totalDiscount.toFixed(2)}
							</span>
						</SummaryRow>
					)}
					{totalTax > 0 && (
						<SummaryRow label="Tax">
							<span className="tabular-nums">RM {totalTax.toFixed(2)}</span>
						</SummaryRow>
					)}
					<div className="mt-1 flex items-center justify-between border-t pt-2 font-semibold text-sm text-foreground">
						<span>Total</span>
						<span className="tabular-nums">RM {total.toFixed(2)}</span>
					</div>
					<div className="mt-2 flex items-center justify-end gap-2">
						{justSaved && !pending && (
							<span className="flex items-center gap-1 text-emerald-600 text-xs dark:text-emerald-400">
								<Check className="size-3.5" />
								Saved
							</span>
						)}
						<Button
							type="button"
							size="sm"
							onClick={onSave}
							disabled={!canSave}
						>
							{pending ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : justSaved ? (
								<Check className="size-3.5" />
							) : (
								<Save className="size-3.5" />
							)}
							{pending ? "Saving…" : justSaved ? "Saved" : "Save billing"}
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
