"use client";

import { Plus, Save, Search, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { ServicePickerDialog } from "@/components/appointments/ServicePickerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	createBillingEntriesBulkAction,
	deleteBillingEntryAction,
	updateBillingEntryAction,
} from "@/lib/actions/appointments";
import type { BillingEntry } from "@/lib/services/billing-entries";
import type { ServiceWithCategory } from "@/lib/services/services";
import { cn } from "@/lib/utils";

type Props = {
	appointmentId: string;
	entries: BillingEntry[];
	services: ServiceWithCategory[];
	onChange: () => void;
};

type Item = {
	key: string;
	id: string | null;
	service_id: string;
	description: string;
	quantity: number;
	unit_price: number;
	discount: number;
	notes: string;
};

function toItem(e: BillingEntry): Item {
	return {
		key: e.id,
		id: e.id,
		service_id: e.service_id ?? "",
		description: e.description,
		quantity: Number(e.quantity),
		unit_price: Number(e.unit_price),
		discount: 0,
		notes: e.notes ?? "",
	};
}

function newDraft(): Item {
	return {
		key: crypto.randomUUID(),
		id: null,
		service_id: "",
		description: "",
		quantity: 1,
		unit_price: 0,
		discount: 0,
		notes: "",
	};
}

function isDirty(item: Item, entries: BillingEntry[]): boolean {
	if (!item.id) return false;
	const orig = entries.find((e) => e.id === item.id);
	if (!orig) return false;
	return (
		Number(orig.quantity) !== item.quantity ||
		Number(orig.unit_price) !== item.unit_price ||
		(orig.notes ?? "") !== item.notes ||
		(orig.service_id ?? "") !== item.service_id
	);
}

export function BillingSection({
	appointmentId,
	entries,
	services,
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

	const totalQty = items.reduce((s, i) => s + i.quantity, 0);
	const totalDiscount = items.reduce((s, i) => s + i.discount, 0);
	const subtotal = items.reduce(
		(s, i) => s + i.quantity * i.unit_price - i.discount,
		0,
	);
	const totalTax = 0;
	const total = subtotal + totalTax;

	const update = (key: string, patch: Partial<Item>) =>
		setItems((rows) =>
			rows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
		);

	const onPickService = (key: string, svc: ServiceWithCategory) => {
		update(key, {
			service_id: svc.id,
			description: svc.name,
			unit_price: Number(svc.price),
		});
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
		startTransition(async () => {
			try {
				await deleteBillingEntryAction(id);
				onChange();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Delete failed");
			}
		});
	};

	const newCreates = items.filter(
		(i) => i.id === null && i.service_id && i.quantity > 0,
	);
	const dirtyEdits = items.filter((i) => isDirty(i, entries));
	const canSave = (newCreates.length > 0 || dirtyEdits.length > 0) && !pending;

	const onSave = () => {
		setError(null);
		const sharedNote = batchNote.trim() || null;
		const creates = newCreates.map((i) => {
			const svc = serviceById.get(i.service_id);
			return {
				appointment_id: appointmentId,
				item_type: "service" as const,
				service_id: i.service_id,
				description: svc?.name ?? i.description ?? "Service",
				quantity: i.quantity,
				unit_price: i.unit_price,
				notes: i.notes || sharedNote,
			};
		});

		startTransition(async () => {
			try {
				for (const i of dirtyEdits) {
					await updateBillingEntryAction(i.id!, {
						appointment_id: appointmentId,
						item_type: "service",
						service_id: i.service_id,
						description: i.description || "Service",
						quantity: i.quantity,
						unit_price: i.unit_price,
						notes: i.notes || null,
					});
				}
				if (creates.length > 0) {
					await createBillingEntriesBulkAction(creates);
				}
				setBatchNote("");
				onChange();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Save failed");
			}
		});
	};

	const activePickerItem = items.find((i) => i.key === pickerKey) ?? null;

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
					Add service
				</Button>
			</div>

			<div className={cn("flex flex-col gap-2.5", pending && "opacity-70")}>
				{items.length === 0 && (
					<div className="rounded-md border border-dashed p-8 text-center text-muted-foreground text-sm">
						No billing items yet. Click <b>Add service</b> to start.
					</div>
				)}

				{items.map((item) => {
					const svc = item.service_id
						? serviceById.get(item.service_id)
						: null;
					const lineTotal = item.quantity * item.unit_price - item.discount;
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
										<>
											<div className="flex min-w-0 flex-col">
												<div className="flex items-center gap-2">
													<span className="truncate font-semibold text-sm">
														{svc.name}
													</span>
													<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
														{svc.sku}
													</span>
												</div>
												<div className="flex items-center gap-2 text-muted-foreground text-xs">
													{svc.category?.name && (
														<span>{svc.category.name}</span>
													)}
													<span>·</span>
													<span>{svc.duration_min} min</span>
												</div>
											</div>
										</>
									) : (
										<span className="flex items-center gap-1.5 text-muted-foreground text-sm">
											<Search className="size-3.5" />
											Pick a service…
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

			<ServicePickerDialog
				open={pickerKey !== null}
				onOpenChange={(o) => !o && setPickerKey(null)}
				services={services}
				selectedId={activePickerItem?.service_id ?? null}
				onSelect={(svc) => {
					if (pickerKey) onPickService(pickerKey, svc);
				}}
			/>
		</div>
	);
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
