"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
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
	INVENTORY_TYPE_LABELS,
	INVENTORY_TYPES,
	type InventoryItemCreateInput,
	inventoryItemCreateSchema,
} from "@/lib/schemas/inventory";
import type { InventoryItem } from "@/lib/services/inventory";

type Props = {
	open: boolean;
	item: InventoryItem | null;
	onClose: () => void;
};

const EMPTY: InventoryItemCreateInput = {
	sku: "",
	name: "",
	type: "product_retail",
	barcode: null,
	uom: "PCS",
	price: 0,
	brand: null,
	category: null,
	supplier: null,
	stock: 0,
	in_transit: 0,
	locked: 0,
	low_alert_count: 0,
	discount_cap: null,
	is_active: true,
};

export function InventoryItemFormDialog({ open, item, onClose }: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<InventoryItemCreateInput>({
		resolver: zodResolver(inventoryItemCreateSchema),
		defaultValues: EMPTY,
	});

	useEffect(() => {
		if (open) {
			form.reset({
				sku: item?.sku ?? "",
				name: item?.name ?? "",
				type:
					(item?.type as InventoryItemCreateInput["type"]) ?? "product_retail",
				barcode: item?.barcode ?? null,
				uom: item?.uom ?? "PCS",
				price: item ? Number(item.price) : 0,
				brand: item?.brand ?? null,
				category: item?.category ?? null,
				supplier: item?.supplier ?? null,
				stock: item ? Number(item.stock) : 0,
				in_transit: item ? Number(item.in_transit) : 0,
				locked: item ? Number(item.locked) : 0,
				low_alert_count: item ? Number(item.low_alert_count) : 0,
				discount_cap:
					item?.discount_cap == null ? null : Number(item.discount_cap),
				is_active: item?.is_active ?? true,
			});
			setServerError(null);
		}
	}, [open, item, form]);

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				if (item) {
					const { sku: _omit, ...rest } = values;
					await updateInventoryItemAction(item.id, rest);
				} else {
					await createInventoryItemAction(values);
				}
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	});

	const nullText = (v: unknown) => (v === "" || v == null ? null : String(v));
	const nullNum = (v: unknown) =>
		v === "" || v === null || v === undefined ? null : Number(v);

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{item ? "Edit item" : "New inventory item"}</DialogTitle>
					<DialogDescription>
						Stockable goods — products, medications, consumables.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-sku" className="font-medium text-sm">
									SKU
								</label>
								<Input
									id="inv-sku"
									disabled={!!item}
									{...form.register("sku")}
								/>
								{form.formState.errors.sku && (
									<p className="text-destructive text-xs">
										{form.formState.errors.sku.message}
									</p>
								)}
								{item && (
									<p className="text-muted-foreground text-xs">
										SKU is immutable.
									</p>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-type" className="font-medium text-sm">
									Type
								</label>
								<select
									id="inv-type"
									className="h-9 rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
									{...form.register("type")}
								>
									{INVENTORY_TYPES.map((t) => (
										<option key={t} value={t}>
											{INVENTORY_TYPE_LABELS[t]}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="flex flex-col gap-1.5">
							<label htmlFor="inv-name" className="font-medium text-sm">
								Name
							</label>
							<Input id="inv-name" {...form.register("name")} />
							{form.formState.errors.name && (
								<p className="text-destructive text-xs">
									{form.formState.errors.name.message}
								</p>
							)}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-barcode" className="font-medium text-sm">
									Barcode
								</label>
								<Input
									id="inv-barcode"
									{...form.register("barcode", { setValueAs: nullText })}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-uom" className="font-medium text-sm">
									UoM
								</label>
								<Input
									id="inv-uom"
									placeholder="PCS / BOX / PACK / BOTTLE"
									{...form.register("uom")}
								/>
								{form.formState.errors.uom && (
									<p className="text-destructive text-xs">
										{form.formState.errors.uom.message}
									</p>
								)}
							</div>
						</div>

						<div className="grid grid-cols-3 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-brand" className="font-medium text-sm">
									Brand
								</label>
								<Input
									id="inv-brand"
									{...form.register("brand", { setValueAs: nullText })}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-category" className="font-medium text-sm">
									Category
								</label>
								<Input
									id="inv-category"
									placeholder="DENTAL PRODUCT / MEDICATION / CONSUMABLES"
									{...form.register("category", { setValueAs: nullText })}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-supplier" className="font-medium text-sm">
									Supplier
								</label>
								<Input
									id="inv-supplier"
									{...form.register("supplier", { setValueAs: nullText })}
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-price" className="font-medium text-sm">
									Price (MYR)
								</label>
								<Input
									id="inv-price"
									type="number"
									min={0}
									step={0.01}
									{...form.register("price", { valueAsNumber: true })}
								/>
								{form.formState.errors.price && (
									<p className="text-destructive text-xs">
										{form.formState.errors.price.message}
									</p>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="inv-discount-cap"
									className="font-medium text-sm"
								>
									Discount Cap (%)
								</label>
								<Input
									id="inv-discount-cap"
									type="number"
									min={0}
									max={100}
									step={1}
									{...form.register("discount_cap", { setValueAs: nullNum })}
								/>
							</div>
						</div>

						<div className="grid grid-cols-4 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-stock" className="font-medium text-sm">
									Stock
								</label>
								<Input
									id="inv-stock"
									type="number"
									min={0}
									step={1}
									{...form.register("stock", { valueAsNumber: true })}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-in-transit" className="font-medium text-sm">
									In Transit
								</label>
								<Input
									id="inv-in-transit"
									type="number"
									min={0}
									step={1}
									{...form.register("in_transit", { valueAsNumber: true })}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-locked" className="font-medium text-sm">
									Locked
								</label>
								<Input
									id="inv-locked"
									type="number"
									min={0}
									step={1}
									{...form.register("locked", { valueAsNumber: true })}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="inv-low-alert" className="font-medium text-sm">
									Low Alert
								</label>
								<Input
									id="inv-low-alert"
									type="number"
									min={0}
									step={1}
									{...form.register("low_alert_count", { valueAsNumber: true })}
								/>
							</div>
						</div>

						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								{...form.register("is_active")}
								className="size-4"
							/>
							Active
						</label>

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

export function NewInventoryItemButton() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button onClick={() => setOpen(true)}>New item</Button>
			<InventoryItemFormDialog
				open={open}
				item={null}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
