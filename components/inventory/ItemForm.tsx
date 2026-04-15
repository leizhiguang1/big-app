"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	createInventoryItemAction,
	updateInventoryItemAction,
} from "@/lib/actions/inventory";
import {
	consumableCreateSchema,
	type InventoryKind,
	INVENTORY_KIND_LABELS,
	medicationCreateSchema,
	productCreateSchema,
} from "@/lib/schemas/inventory";
import type {
	InventoryBrand,
	InventoryCategory,
	InventoryItemWithRefs,
	InventoryUom,
	Supplier,
} from "@/lib/services/inventory";

type FormState = {
	sku: string;
	name: string;
	barcode: string;
	is_sellable: boolean;
	is_active: boolean;
	brand_id: string;
	category_id: string;
	supplier_id: string;
	purchasing_uom_id: string;
	stock_uom_id: string;
	use_uom_id: string;
	purchasing_to_stock_factor: string;
	stock_to_use_factor: string;
	cost_price: string;
	selling_price: string;
	stock: string;
	in_transit: string;
	locked: string;
	stock_alert_count: string;
	discount_cap: string;
	location: string;
	is_controlled: boolean;
	needs_replenish_reminder: boolean;
	prescription_dosage: string;
	prescription_dosage_uom_id: string;
	prescription_frequency: string;
	prescription_duration: string;
	prescription_reason: string;
	prescription_notes: string;
	prescription_default_billing_qty: string;
};

const EMPTY: FormState = {
	sku: "",
	name: "",
	barcode: "",
	is_sellable: true,
	is_active: true,
	brand_id: "",
	category_id: "",
	supplier_id: "",
	purchasing_uom_id: "",
	stock_uom_id: "",
	use_uom_id: "",
	purchasing_to_stock_factor: "1",
	stock_to_use_factor: "1",
	cost_price: "0",
	selling_price: "0",
	stock: "0",
	in_transit: "0",
	locked: "0",
	stock_alert_count: "0",
	discount_cap: "",
	location: "",
	is_controlled: false,
	needs_replenish_reminder: false,
	prescription_dosage: "1",
	prescription_dosage_uom_id: "",
	prescription_frequency: "",
	prescription_duration: "",
	prescription_reason: "",
	prescription_notes: "",
	prescription_default_billing_qty: "1",
};

function fromItem(item: InventoryItemWithRefs): FormState {
	return {
		sku: item.sku,
		name: item.name,
		barcode: item.barcode ?? "",
		is_sellable: item.is_sellable,
		is_active: item.is_active,
		brand_id: item.brand_id ?? "",
		category_id: item.category_id ?? "",
		supplier_id: item.supplier_id ?? "",
		purchasing_uom_id: item.purchasing_uom_id,
		stock_uom_id: item.stock_uom_id,
		use_uom_id: item.use_uom_id ?? "",
		purchasing_to_stock_factor: String(item.purchasing_to_stock_factor),
		stock_to_use_factor:
			item.stock_to_use_factor != null ? String(item.stock_to_use_factor) : "1",
		cost_price: String(item.cost_price),
		selling_price: String(item.selling_price),
		stock: String(item.stock),
		in_transit: String(item.in_transit),
		locked: String(item.locked),
		stock_alert_count: String(item.stock_alert_count),
		discount_cap: item.discount_cap != null ? String(item.discount_cap) : "",
		location: item.location ?? "",
		is_controlled: item.is_controlled ?? false,
		needs_replenish_reminder: item.needs_replenish_reminder ?? false,
		prescription_dosage:
			item.prescription_dosage != null ? String(item.prescription_dosage) : "1",
		prescription_dosage_uom_id: item.prescription_dosage_uom_id ?? "",
		prescription_frequency: item.prescription_frequency ?? "",
		prescription_duration: item.prescription_duration ?? "",
		prescription_reason: item.prescription_reason ?? "",
		prescription_notes: item.prescription_notes ?? "",
		prescription_default_billing_qty:
			item.prescription_default_billing_qty != null
				? String(item.prescription_default_billing_qty)
				: "1",
	};
}

function num(v: string): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

function nullableStr(v: string): string | null {
	const t = v.trim();
	return t.length === 0 ? null : t;
}

function nullableUuid(v: string): string | null {
	return v && v.length > 0 ? v : null;
}

function nullableNum(v: string): number | null {
	if (v.trim() === "") return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

type Props = {
	open: boolean;
	mode: "create" | "edit";
	kind: InventoryKind;
	item: InventoryItemWithRefs | null;
	uoms: InventoryUom[];
	brands: InventoryBrand[];
	categories: InventoryCategory[];
	suppliers: Supplier[];
	onClose: () => void;
};

export function ItemFormDialog({
	open,
	mode,
	kind,
	item,
	uoms,
	brands,
	categories,
	suppliers,
	onClose,
}: Props) {
	const [state, setState] = useState<FormState>(EMPTY);
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (open) {
			setState(item ? fromItem(item) : EMPTY);
			setServerError(null);
			setFieldErrors({});
		}
	}, [open, item]);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
		setState((s) => ({ ...s, [key]: value }));
	};

	const buildPayload = () => {
		const base = {
			sku: state.sku.trim(),
			name: state.name.trim(),
			barcode: nullableStr(state.barcode),
			is_sellable: state.is_sellable,
			is_active: state.is_active,
			brand_id: nullableUuid(state.brand_id),
			category_id: nullableUuid(state.category_id),
			supplier_id: nullableUuid(state.supplier_id),
			purchasing_uom_id: state.purchasing_uom_id,
			stock_uom_id: state.stock_uom_id,
			purchasing_to_stock_factor: num(state.purchasing_to_stock_factor),
			cost_price: num(state.cost_price),
			selling_price: num(state.selling_price),
			stock: num(state.stock),
			in_transit: num(state.in_transit),
			locked: num(state.locked),
			stock_alert_count: num(state.stock_alert_count),
			discount_cap: nullableNum(state.discount_cap),
			location: nullableStr(state.location),
		};

		if (kind === "product") {
			return { ...base, kind: "product" as const };
		}

		if (kind === "consumable") {
			return {
				...base,
				kind: "consumable" as const,
				use_uom_id: state.use_uom_id,
				stock_to_use_factor: num(state.stock_to_use_factor),
			};
		}

		return {
			...base,
			kind: "medication" as const,
			use_uom_id: state.use_uom_id,
			stock_to_use_factor: num(state.stock_to_use_factor),
			is_controlled: state.is_controlled,
			needs_replenish_reminder: state.needs_replenish_reminder,
			prescription_dosage: num(state.prescription_dosage),
			prescription_dosage_uom_id: state.prescription_dosage_uom_id,
			prescription_frequency: state.prescription_frequency.trim(),
			prescription_duration: state.prescription_duration.trim(),
			prescription_reason: state.prescription_reason.trim(),
			prescription_notes: nullableStr(state.prescription_notes),
			prescription_default_billing_qty: num(
				state.prescription_default_billing_qty,
			),
		};
	};

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setServerError(null);
		setFieldErrors({});

		const payload = buildPayload();
		const schema =
			kind === "product"
				? productCreateSchema
				: kind === "consumable"
					? consumableCreateSchema
					: medicationCreateSchema;
		const result = schema.safeParse(payload);
		if (!result.success) {
			const errs: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const path = issue.path.join(".");
				errs[path] = issue.message;
			}
			setFieldErrors(errs);
			return;
		}

		startTransition(async () => {
			try {
				if (mode === "edit" && item) {
					const { sku: _omit, kind: _k, ...rest } = result.data;
					await updateInventoryItemAction(item.id, kind, rest);
				} else {
					await createInventoryItemAction(result.data);
				}
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	};

	const stockUomLabel =
		kind === "medication" ? "Storage UoM" : "Sales UoM";
	const useUomLabel =
		kind === "medication" ? "Dispensing UoM" : "Use UoM";

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{mode === "edit" ? "Edit" : "New"} {INVENTORY_KIND_LABELS[kind]}
					</DialogTitle>
					<DialogDescription>
						{kind === "product" &&
							"Off-the-shelf product. Two-tier UoM (purchasing → sales)."}
						{kind === "consumable" &&
							"Linked to services or sold off-the-shelf. Three-tier UoM (purchasing → sales → use)."}
						{kind === "medication" &&
							"Prescription drug. Three-tier UoM (purchasing → storage → dispensing) with prescription metadata."}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
						<Section title="General">
							<Two>
								<Field label="Name" error={fieldErrors.name}>
									<Input
										value={state.name}
										onChange={(e) => set("name", e.target.value)}
										placeholder="EG: AMOXICILLIN"
									/>
								</Field>
								<Field label="SKU" error={fieldErrors.sku}>
									<Input
										value={state.sku}
										onChange={(e) => set("sku", e.target.value)}
										disabled={mode === "edit"}
										placeholder="EG: MED-05"
									/>
									{mode === "edit" && (
										<p className="text-muted-foreground text-xs">
											SKU is immutable.
										</p>
									)}
								</Field>
							</Two>
							<Two>
								<Field label="Barcode" error={fieldErrors.barcode}>
									<Input
										value={state.barcode}
										onChange={(e) => set("barcode", e.target.value)}
										placeholder="EG: 9012345888886"
									/>
								</Field>
								<Field label="Location">
									<Input
										value={state.location}
										onChange={(e) => set("location", e.target.value)}
										placeholder="EG: RACK 2 ROW 3"
									/>
								</Field>
							</Two>
							<div className="flex gap-6">
								<Check
									label="Sellable"
									checked={state.is_sellable}
									onChange={(v) => set("is_sellable", v)}
								/>
								<Check
									label="Active"
									checked={state.is_active}
									onChange={(v) => set("is_active", v)}
								/>
							</div>
						</Section>

						<Section title="Tags">
							<Two>
								<Field label="Brand">
									<SelectInput
										value={state.brand_id}
										onChange={(v) => set("brand_id", v)}
										placeholder="— None —"
										options={brands.map((b) => ({ value: b.id, label: b.name }))}
									/>
								</Field>
								<Field label="Category">
									<SelectInput
										value={state.category_id}
										onChange={(v) => set("category_id", v)}
										placeholder="— None —"
										options={categories.map((c) => ({
											value: c.id,
											label: c.name,
										}))}
									/>
								</Field>
							</Two>
							<Field label="Supplier">
								<SelectInput
									value={state.supplier_id}
									onChange={(v) => set("supplier_id", v)}
									placeholder="— None —"
									options={suppliers.map((s) => ({
										value: s.id,
										label: s.name,
									}))}
								/>
							</Field>
						</Section>

						<Section title="Unit of Measurement">
							<Two>
								<Field
									label="Purchasing UoM"
									error={fieldErrors.purchasing_uom_id}
								>
									<SelectInput
										value={state.purchasing_uom_id}
										onChange={(v) => set("purchasing_uom_id", v)}
										placeholder="Choose…"
										options={uoms.map((u) => ({ value: u.id, label: u.name }))}
									/>
								</Field>
								<Field label={stockUomLabel} error={fieldErrors.stock_uom_id}>
									<SelectInput
										value={state.stock_uom_id}
										onChange={(v) => set("stock_uom_id", v)}
										placeholder="Choose…"
										options={uoms.map((u) => ({ value: u.id, label: u.name }))}
									/>
								</Field>
							</Two>
							<Field
								label={`Conversion (1 Purchasing = N ${stockUomLabel.split(" ")[0]})`}
								error={fieldErrors.purchasing_to_stock_factor}
							>
								<Input
									type="number"
									min={1}
									step="0.01"
									value={state.purchasing_to_stock_factor}
									onChange={(e) =>
										set("purchasing_to_stock_factor", e.target.value)
									}
								/>
							</Field>
							{kind !== "product" && (
								<>
									<Field
										label={useUomLabel}
										error={fieldErrors.use_uom_id}
									>
										<SelectInput
											value={state.use_uom_id}
											onChange={(v) => set("use_uom_id", v)}
											placeholder="Choose…"
											options={uoms.map((u) => ({
												value: u.id,
												label: u.name,
											}))}
										/>
									</Field>
									<Field
										label={`Conversion (1 ${stockUomLabel.split(" ")[0]} = N ${useUomLabel.split(" ")[0]})`}
										error={fieldErrors.stock_to_use_factor}
									>
										<Input
											type="number"
											min={0.01}
											step="0.01"
											value={state.stock_to_use_factor}
											onChange={(e) =>
												set("stock_to_use_factor", e.target.value)
											}
										/>
									</Field>
								</>
							)}
						</Section>

						<Section title="Pricing & Stock">
							<Two>
								<Field label="Cost Price" error={fieldErrors.cost_price}>
									<Input
										type="number"
										min={0}
										step="0.0001"
										value={state.cost_price}
										onChange={(e) => set("cost_price", e.target.value)}
									/>
								</Field>
								<Field
									label="Selling Price (MYR)"
									error={fieldErrors.selling_price}
								>
									<Input
										type="number"
										min={0}
										step="0.01"
										value={state.selling_price}
										onChange={(e) => set("selling_price", e.target.value)}
									/>
								</Field>
							</Two>
							<Two>
								<Field label="Stock Quantity" error={fieldErrors.stock}>
									<Input
										type="number"
										min={0}
										step="0.01"
										value={state.stock}
										onChange={(e) => set("stock", e.target.value)}
									/>
								</Field>
								<Field
									label="Low Alert Count"
									error={fieldErrors.stock_alert_count}
								>
									<Input
										type="number"
										min={0}
										step="0.01"
										value={state.stock_alert_count}
										onChange={(e) => set("stock_alert_count", e.target.value)}
									/>
								</Field>
							</Two>
							<Two>
								<Field label="In Transit" error={fieldErrors.in_transit}>
									<Input
										type="number"
										min={0}
										step="0.01"
										value={state.in_transit}
										onChange={(e) => set("in_transit", e.target.value)}
									/>
								</Field>
								<Field label="Locked" error={fieldErrors.locked}>
									<Input
										type="number"
										min={0}
										step="0.01"
										value={state.locked}
										onChange={(e) => set("locked", e.target.value)}
									/>
								</Field>
							</Two>
							<Field
								label="Discount Cap (%) — optional"
								error={fieldErrors.discount_cap}
							>
								<Input
									type="number"
									min={0}
									max={100}
									step="0.01"
									value={state.discount_cap}
									onChange={(e) => set("discount_cap", e.target.value)}
								/>
							</Field>
						</Section>

						{kind === "medication" && (
							<Section title="Prescription">
								<div className="flex gap-6">
									<Check
										label="Controlled medication"
										checked={state.is_controlled}
										onChange={(v) => set("is_controlled", v)}
									/>
									<Check
										label="Needs replenish reminder"
										checked={state.needs_replenish_reminder}
										onChange={(v) => set("needs_replenish_reminder", v)}
									/>
								</div>
								<Two>
									<Field
										label="Dosage"
										error={fieldErrors.prescription_dosage}
									>
										<Input
											type="number"
											min={0.01}
											step="0.01"
											value={state.prescription_dosage}
											onChange={(e) =>
												set("prescription_dosage", e.target.value)
											}
										/>
									</Field>
									<Field
										label="Dosage UoM"
										error={fieldErrors.prescription_dosage_uom_id}
									>
										<SelectInput
											value={state.prescription_dosage_uom_id}
											onChange={(v) => set("prescription_dosage_uom_id", v)}
											placeholder="Choose…"
											options={uoms.map((u) => ({
												value: u.id,
												label: u.name,
											}))}
										/>
									</Field>
								</Two>
								<Two>
									<Field
										label="Frequency"
										error={fieldErrors.prescription_frequency}
									>
										<Input
											value={state.prescription_frequency}
											onChange={(e) =>
												set("prescription_frequency", e.target.value)
											}
											placeholder="EG: 3 TIMES A DAY"
										/>
									</Field>
									<Field
										label="Duration"
										error={fieldErrors.prescription_duration}
									>
										<Input
											value={state.prescription_duration}
											onChange={(e) =>
												set("prescription_duration", e.target.value)
											}
											placeholder="EG: 5 DAY(S)"
										/>
									</Field>
								</Two>
								<Field
									label="Reason"
									error={fieldErrors.prescription_reason}
								>
									<Input
										value={state.prescription_reason}
										onChange={(e) =>
											set("prescription_reason", e.target.value)
										}
										placeholder="EG: ANTIBIOTICS"
									/>
								</Field>
								<Field label="Notes">
									<Input
										value={state.prescription_notes}
										onChange={(e) =>
											set("prescription_notes", e.target.value)
										}
									/>
								</Field>
								<Field
									label="Default Billing Quantity"
									error={fieldErrors.prescription_default_billing_qty}
								>
									<Input
										type="number"
										min={0}
										step="0.01"
										value={state.prescription_default_billing_qty}
										onChange={(e) =>
											set(
												"prescription_default_billing_qty",
												e.target.value,
											)
										}
									/>
								</Field>
							</Section>
						)}

						{serverError && (
							<p className="text-destructive text-sm">{serverError}</p>
						)}
					</div>
					<DialogFooter className="border-t">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={pending}>
							{pending ? "Saving…" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<fieldset className="flex flex-col gap-3 rounded-lg border p-3">
			<legend className="px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				{title}
			</legend>
			{children}
		</fieldset>
	);
}

function Two({ children }: { children: React.ReactNode }) {
	return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({
	label,
	error,
	children,
}: {
	label: string;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label className="font-medium text-sm">{label}</label>
			{children}
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
}

function Check({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label className="flex items-center gap-2 text-sm">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="size-4"
			/>
			{label}
		</label>
	);
}

function SelectInput({
	value,
	onChange,
	options,
	placeholder,
}: {
	value: string;
	onChange: (v: string) => void;
	options: Array<{ value: string; label: string }>;
	placeholder?: string;
}) {
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className="h-9 rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
		>
			<option value="">{placeholder ?? "Choose…"}</option>
			{options.map((o) => (
				<option key={o.value} value={o.value}>
					{o.label}
				</option>
			))}
		</select>
	);
}
