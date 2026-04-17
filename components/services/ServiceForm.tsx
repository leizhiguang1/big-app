"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { type Control, Controller, useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateButton } from "@/components/ui/create-button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	createServiceAction,
	updateServiceAction,
} from "@/lib/actions/services";
import {
	SERVICE_FORM_TOOLTIPS,
	type ServiceFormTooltipKey,
} from "@/lib/constants/service-form-tooltips";
import {
	type ServiceCreateInput,
	serviceCreateSchema,
} from "@/lib/schemas/services";
import type {
	ServiceCategory,
	ServiceWithCategory,
} from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";
import { cn } from "@/lib/utils";

export type InventoryItemChoice = {
	id: string;
	sku: string;
	name: string;
	kind: "product" | "consumable" | "medication";
};

type Props = {
	open: boolean;
	service: ServiceWithCategory | null;
	categories: ServiceCategory[];
	taxes: Tax[];
	inventoryItems: InventoryItemChoice[];
	onClose: () => void;
};

const emptyDefaults = (): ServiceCreateInput => ({
	id: crypto.randomUUID(),
	sku: "",
	name: "",
	category_id: null,
	type: "retail",
	duration_min: 30,
	external_code: null,
	image_url: null,
	price: 0,
	price_min: null,
	price_max: null,
	other_fees: 0,
	incentive_type: null,
	discount_cap: null,
	allow_redemption_without_payment: false,
	allow_cash_price_range: false,
	is_active: true,
	tax_ids: [],
	inventory_links: [],
});

const taxRateFormatter = new Intl.NumberFormat("en-MY", {
	maximumFractionDigits: 2,
});

export function ServiceFormDialog({
	open,
	service,
	categories,
	taxes,
	inventoryItems,
	onClose,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);
	const [discountCapEnabled, setDiscountCapEnabled] = useState(false);

	const form = useForm<ServiceCreateInput>({
		resolver: zodResolver(serviceCreateSchema),
		defaultValues: emptyDefaults(),
	});

	const priceRangeOn = form.watch("allow_cash_price_range");
	const priceMinWatch = form.watch("price_min");
	const typeWatch = form.watch("type");
	const isRetail = typeWatch === "retail";

	useEffect(() => {
		if (!priceRangeOn) {
			form.setValue("price_min", null, { shouldValidate: true });
			form.setValue("price_max", null, { shouldValidate: true });
		}
	}, [priceRangeOn, form]);

	useEffect(() => {
		if (priceRangeOn && priceMinWatch != null) {
			form.setValue("price", priceMinWatch, { shouldValidate: true });
		}
	}, [priceRangeOn, priceMinWatch, form]);

	useEffect(() => {
		if (open) {
			const nextCap =
				service?.discount_cap == null ? null : Number(service.discount_cap);
			const defaultTaxIds = taxes.filter((t) => t.is_active).map((t) => t.id);
			form.reset({
				id: service?.id ?? crypto.randomUUID(),
				sku: service?.sku ?? "",
				name: service?.name ?? "",
				category_id: service?.category_id ?? null,
				type: (service?.type as ServiceCreateInput["type"]) ?? "retail",
				duration_min: service?.duration_min ?? 30,
				external_code: service?.external_code ?? null,
				image_url: service?.image_url ?? null,
				price: service ? Number(service.price) : 0,
				price_min:
					service?.price_min == null ? null : Number(service.price_min),
				price_max:
					service?.price_max == null ? null : Number(service.price_max),
				other_fees: service ? Number(service.other_fees ?? 0) : 0,
				incentive_type: service?.incentive_type ?? null,
				discount_cap: nextCap,
				allow_redemption_without_payment:
					service?.allow_redemption_without_payment ?? false,
				allow_cash_price_range: service?.allow_cash_price_range ?? false,
				is_active: service?.is_active ?? true,
				tax_ids: service?.tax_ids ?? defaultTaxIds,
				inventory_links: (service?.inventory_links ?? []).map((l) => ({
					inventory_item_id: l.inventory_item_id,
					default_quantity: Number(l.default_quantity),
				})),
			});
			setDiscountCapEnabled(nextCap != null);
			setServerError(null);
		}
	}, [open, service, form, taxes]);

	const onSubmit = form.handleSubmit((values) => {
		const rangeOn = values.allow_cash_price_range;
		const sanitized: ServiceCreateInput = {
			...values,
			discount_cap: discountCapEnabled ? (values.discount_cap ?? 0) : null,
			price_min: rangeOn ? values.price_min : null,
			price_max: rangeOn ? values.price_max : null,
			price:
				rangeOn && values.price_min != null ? values.price_min : values.price,
		};
		startTransition(async () => {
			try {
				if (service) {
					const { id: _id, sku: _sku, ...rest } = sanitized;
					await updateServiceAction(service.id, rest);
				} else {
					await createServiceAction(sanitized);
				}
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	});

	const activeTaxes = useMemo(() => taxes.filter((t) => t.is_active), [taxes]);
	const imageEntityId = form.watch("id") ?? null;

	return (
		<TooltipProvider delayDuration={150}>
			<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
				<DialogContent className="flex max-h-[92vh] w-[96vw] flex-col gap-0 p-0 sm:max-w-6xl">
					<DialogHeader className="border-b px-6 py-4">
						<DialogTitle className="text-center font-medium text-base">
							{service ? "Edit Service" : "Create New Service"}
						</DialogTitle>
						<DialogDescription className="sr-only">
							Catalog entry used as a billing line item after a visit.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
						<div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
							<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
								{/* ─── LEFT COLUMN ──────────────────────────── */}
								<div className="flex flex-col gap-5">
									<Section title="General">
										<div className="flex flex-col items-center">
											<Controller
												control={form.control}
												name="image_url"
												render={({ field }) => (
													<ImageUpload
														value={field.value}
														onChange={field.onChange}
														entity="services"
														entityId={imageEntityId}
														shape="square"
														sizeClass="size-24"
														minimal
													/>
												)}
											/>
										</div>
										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
											<Field
												label="Service Name"
												required
												error={form.formState.errors.name?.message}
											>
												<Input
													placeholder="EG: BODY MASSAGE"
													{...form.register("name")}
												/>
											</Field>
											<Field
												label="SKU"
												required
												error={form.formState.errors.sku?.message}
												hint={service ? "SKU is immutable." : undefined}
											>
												<Input
													placeholder="EG: BME-0001"
													disabled={!!service}
													{...form.register("sku")}
												/>
											</Field>
											<Field label="Category" required tooltipKey="category">
												<div className="flex items-center gap-2">
													<select
														className="h-8 flex-1 rounded-lg border bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
														{...form.register("category_id", {
															setValueAs: (v) => (v === "" ? null : v),
														})}
													>
														<option value="">Please choose…</option>
														{categories.map((c) => (
															<option key={c.id} value={c.id}>
																{c.name}
															</option>
														))}
													</select>
												</div>
											</Field>
											<Field
												label="Duration"
												required
												tooltipKey="duration"
												error={form.formState.errors.duration_min?.message}
											>
												<Controller
													control={form.control}
													name="duration_min"
													render={({ field }) => (
														<DurationStepper
															value={field.value}
															onChange={field.onChange}
														/>
													)}
												/>
											</Field>
											<Field
												label="Case Note Template"
												phase2
												tooltipKey="caseNoteTemplate"
											>
												<select
													disabled
													className="h-8 w-full rounded-lg border bg-muted/30 px-2.5 text-muted-foreground text-sm"
												>
													<option>Please choose…</option>
												</select>
											</Field>
											<Field
												label="e-Invoice Classification Code"
												phase2
												tooltipKey="eInvoiceCode"
											>
												<select
													disabled
													className="h-8 w-full rounded-lg border bg-muted/30 px-2.5 text-muted-foreground text-sm"
												>
													<option>Please choose…</option>
												</select>
											</Field>
										</div>
										<div className="flex flex-col gap-2 pt-1">
											<div className="flex items-center gap-2 text-sm">
												<Checkbox
													id="svc-is-retail"
													checked={isRetail}
													onCheckedChange={(checked) =>
														form.setValue(
															"type",
															checked === true ? "retail" : "non_retail",
															{ shouldDirty: true },
														)
													}
												/>
												<label
													htmlFor="svc-is-retail"
													className="flex cursor-pointer items-center gap-1.5"
												>
													This is a Service Retail item,{" "}
													<Badge
														variant="info"
														className="px-1.5 py-0 text-[10px]"
													>
														S (R)
													</Badge>{" "}
													<span className="text-muted-foreground">
														(sellable on its own)
													</span>
												</label>
												<InfoTip tooltipKey="retailItem" />
											</div>
											{!isRetail && (
												<p className="pl-6 text-muted-foreground text-xs leading-snug">
													This service is assumed to only be sold as part of a
													promotion or package and will be tagged as{" "}
													<Badge
														variant="secondary"
														className="px-1.5 py-0 text-[10px]"
													>
														S (NR)
													</Badge>{" "}
													Services (Non-Retail).
												</p>
											)}
											<div className="flex items-center gap-2 text-sm">
												<Controller
													control={form.control}
													name="allow_redemption_without_payment"
													render={({ field }) => (
														<Checkbox
															id="svc-allow-redemption"
															checked={!!field.value}
															onCheckedChange={(c) =>
																field.onChange(c === true)
															}
														/>
													)}
												/>
												<label
													htmlFor="svc-allow-redemption"
													className="cursor-pointer"
												>
													Allow Redemption Without Payment
												</label>
												<InfoTip tooltipKey="allowRedemptionWithoutPayment" />
											</div>
										</div>
									</Section>

									<InventoryLinksSection
										control={form.control}
										inventoryItems={inventoryItems}
									/>
								</div>

								{/* ─── RIGHT COLUMN ─────────────────────────── */}
								<div className="flex flex-col gap-5">
									<Section title="Pricing">
										<div className="flex items-center gap-2 text-sm">
											<Controller
												control={form.control}
												name="allow_cash_price_range"
												render={({ field }) => (
													<Checkbox
														id="svc-allow-range"
														checked={!!field.value}
														onCheckedChange={(c) => field.onChange(c === true)}
													/>
												)}
											/>
											<label
												htmlFor="svc-allow-range"
												className="cursor-pointer text-muted-foreground"
											>
												Allow cash selling price range for this service
											</label>
											<InfoTip tooltipKey="allowCashPriceRange" />
										</div>
										<div className="flex flex-col gap-4">
											<Field
												label="Selling Price"
												required
												error={
													form.formState.errors.price?.message ??
													form.formState.errors.price_min?.message ??
													form.formState.errors.price_max?.message
												}
											>
												{priceRangeOn ? (
													<div className="flex items-center gap-3">
														<MyrInput
															placeholder="0.00"
															{...form.register("price_min", {
																setValueAs: (v) =>
																	v === "" || v == null ? null : Number(v),
															})}
														/>
														<span className="text-muted-foreground text-xs">
															to
														</span>
														<MyrInput
															placeholder="0.00"
															{...form.register("price_max", {
																setValueAs: (v) =>
																	v === "" || v == null ? null : Number(v),
															})}
														/>
													</div>
												) : (
													<MyrInput
														placeholder="0.00"
														{...form.register("price", {
															valueAsNumber: true,
														})}
													/>
												)}
											</Field>
											<Field
												label="Other Fees"
												tooltipKey="otherFees"
												error={form.formState.errors.other_fees?.message}
											>
												<MyrInput
													placeholder="0.00"
													{...form.register("other_fees", {
														valueAsNumber: true,
													})}
												/>
											</Field>
										</div>
										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
											<div className="flex flex-col gap-1.5">
												<div className="flex items-center gap-2 text-sm">
													<Checkbox
														id="svc-discount-cap"
														checked={discountCapEnabled}
														onCheckedChange={(c) =>
															setDiscountCapEnabled(c === true)
														}
													/>
													<label
														htmlFor="svc-discount-cap"
														className="cursor-pointer"
													>
														Individual Discount Capping
													</label>
													<InfoTip tooltipKey="individualDiscountCapping" />
												</div>
												{discountCapEnabled && (
													<Field
														label="Discount Cap Amount (%)"
														required
														error={form.formState.errors.discount_cap?.message}
													>
														<Input
															type="number"
															min={0}
															max={100}
															step={1}
															placeholder="0.00"
															{...form.register("discount_cap", {
																setValueAs: (v) =>
																	v === "" || v === null || v === undefined
																		? 0
																		: Number(v),
															})}
														/>
													</Field>
												)}
											</div>
											<div className="flex flex-col gap-1.5">
												<div className="flex items-baseline justify-between">
													<span className="text-muted-foreground text-xs">
														Taxes
													</span>
												</div>
												<p className="text-[11px] text-muted-foreground">
													When enabled, the Selling Price is exclusive of the
													selected tax percentages.
												</p>
												<Controller
													control={form.control}
													name="tax_ids"
													render={({ field }) => (
														<TaxChipSelector
															taxes={activeTaxes}
															value={field.value ?? []}
															onChange={field.onChange}
														/>
													)}
												/>
											</div>
										</div>
									</Section>

									<PlaceholderSection title="Outlets">
										<p className="text-muted-foreground text-xs">
											Per-outlet pricing overrides are coming soon. For now, the
											Pricing above applies to every outlet.
										</p>
									</PlaceholderSection>

									<PlaceholderSection
										title="Coverage Payor"
										tooltipKey="coveragePayor"
									>
										<p className="text-muted-foreground text-xs">
											No coverage panels created. Insurance / corporate panel
											billing arrives in a later phase.
										</p>
									</PlaceholderSection>

									<PlaceholderSection
										title="Hands-On Incentive"
										tooltipKey="handsOnIncentive"
									>
										<p className="text-muted-foreground text-xs">
											Commission rules will be configurable here once the
											incentive engine ships.
										</p>
									</PlaceholderSection>
								</div>
							</div>

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
		</TooltipProvider>
	);
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4 rounded-lg border bg-card p-4">
			<h3 className="font-medium text-foreground text-sm">{title}</h3>
			{children}
		</section>
	);
}

function PlaceholderSection({
	title,
	tooltipKey,
	children,
}: {
	title: string;
	tooltipKey?: ServiceFormTooltipKey;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/20 p-4">
			<div className="flex items-center gap-2">
				<h3 className="font-medium text-muted-foreground text-sm">{title}</h3>
				<Badge variant="secondary" className="text-[9px]">
					Phase 2
				</Badge>
				{tooltipKey && <InfoTip tooltipKey={tooltipKey} />}
			</div>
			{children}
		</section>
	);
}

const KIND_LABEL: Record<InventoryItemChoice["kind"], string> = {
	product: "Product",
	consumable: "Consumable",
	medication: "Medication",
};

const KIND_BADGE: Record<
	InventoryItemChoice["kind"],
	"info" | "secondary" | "outline"
> = {
	consumable: "info",
	medication: "secondary",
	product: "outline",
};

function InventoryLinksSection({
	control,
	inventoryItems,
}: {
	control: Control<ServiceCreateInput>;
	inventoryItems: InventoryItemChoice[];
}) {
	const itemsById = useMemo(
		() => new Map(inventoryItems.map((i) => [i.id, i])),
		[inventoryItems],
	);
	const [pickerOpen, setPickerOpen] = useState(false);

	return (
		<Controller
			control={control}
			name="inventory_links"
			render={({ field }) => {
				const selectedIds = new Set(
					field.value.map((l) => l.inventory_item_id),
				);
				const available = inventoryItems.filter((i) => !selectedIds.has(i.id));
				return (
					<section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<h3 className="font-medium text-foreground text-sm">
									Consumables &amp; Medications
								</h3>
								<InfoTip tooltipKey="consumables" />
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setPickerOpen(true)}
								disabled={available.length === 0}
							>
								<Plus className="mr-1 size-3.5" /> Add item
							</Button>
						</div>

						{field.value.length === 0 ? (
							<p className="rounded-md border border-dashed py-3 text-center text-muted-foreground text-xs">
								No items linked. Add consumables or medications used when this
								service is performed — they'll auto-deduct from stock on Collect
								Payment.
							</p>
						) : (
							<ul className="flex flex-col divide-y divide-border/60">
								{field.value.map((link, idx) => {
									const item = itemsById.get(link.inventory_item_id);
									return (
										<li
											key={link.inventory_item_id}
											className="flex items-center gap-2 py-2"
										>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<Badge
														variant={item ? KIND_BADGE[item.kind] : "outline"}
														className="px-1.5 py-0 text-[9px]"
													>
														{item ? KIND_LABEL[item.kind] : "Unknown"}
													</Badge>
													<span className="truncate font-medium text-sm">
														{item?.name ?? "Item removed"}
													</span>
												</div>
												<span className="font-mono text-muted-foreground text-xs">
													{item?.sku ?? link.inventory_item_id.slice(0, 8)}
												</span>
											</div>
											<div className="flex items-center gap-1">
												<span className="text-muted-foreground text-xs">
													Qty
												</span>
												<Input
													type="number"
													min={0}
													step="any"
													className="h-8 w-20"
													value={link.default_quantity}
													onChange={(e) => {
														const next = [...field.value];
														const raw = e.target.value;
														next[idx] = {
															...next[idx],
															default_quantity: raw === "" ? 0 : Number(raw),
														};
														field.onChange(next);
													}}
												/>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												aria-label="Remove"
												onClick={() =>
													field.onChange(
														field.value.filter((_, i) => i !== idx),
													)
												}
											>
												<Trash2 className="size-3.5" />
											</Button>
										</li>
									);
								})}
							</ul>
						)}

						<InventoryItemPicker
							open={pickerOpen}
							items={available}
							onClose={() => setPickerOpen(false)}
							onPick={(item) => {
								field.onChange([
									...field.value,
									{ inventory_item_id: item.id, default_quantity: 1 },
								]);
								setPickerOpen(false);
							}}
						/>
					</section>
				);
			}}
		/>
	);
}

function InventoryItemPicker({
	open,
	items,
	onClose,
	onPick,
}: {
	open: boolean;
	items: InventoryItemChoice[];
	onClose: () => void;
	onPick: (item: InventoryItemChoice) => void;
}) {
	const [query, setQuery] = useState("");

	useEffect(() => {
		if (!open) setQuery("");
	}, [open]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return items;
		return items.filter(
			(i) =>
				i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q),
		);
	}, [items, query]);

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[70vh] flex-col gap-0 p-0 sm:max-w-md">
				<DialogHeader className="border-b px-4 py-3">
					<DialogTitle className="text-sm">Pick an inventory item</DialogTitle>
					<DialogDescription className="sr-only">
						Inventory item picker
					</DialogDescription>
				</DialogHeader>
				<div className="border-b p-3">
					<Input
						autoFocus
						placeholder="Search by name or SKU…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto">
					{filtered.length === 0 ? (
						<p className="p-6 text-center text-muted-foreground text-xs">
							{items.length === 0
								? "All matching inventory items are already linked."
								: "No items match."}
						</p>
					) : (
						<ul className="divide-y divide-border/60">
							{filtered.map((i) => (
								<li key={i.id}>
									<button
										type="button"
										onClick={() => onPick(i)}
										className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
									>
										<Badge
											variant={KIND_BADGE[i.kind]}
											className="px-1.5 py-0 text-[9px]"
										>
											{KIND_LABEL[i.kind]}
										</Badge>
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm">{i.name}</div>
											<div className="font-mono text-muted-foreground text-xs">
												{i.sku}
											</div>
										</div>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function Field({
	label,
	required,
	phase2,
	tooltipKey,
	hint,
	error,
	children,
}: {
	label: string;
	required?: boolean;
	phase2?: boolean;
	tooltipKey?: ServiceFormTooltipKey;
	hint?: string;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
				<span>
					{label}
					{required && <span className="text-destructive"> *</span>}
				</span>
				{tooltipKey && <InfoTip tooltipKey={tooltipKey} />}
				{phase2 && (
					<Badge variant="secondary" className="text-[9px]">
						Phase 2
					</Badge>
				)}
			</div>
			{children}
			{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
}

function InfoTip({ tooltipKey }: { tooltipKey: ServiceFormTooltipKey }) {
	const paragraphs = SERVICE_FORM_TOOLTIPS[tooltipKey];
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label="More info"
					className="inline-flex size-3.5 items-center justify-center rounded-full text-muted-foreground/80 hover:text-foreground"
				>
					<Info className="size-3.5" />
				</button>
			</TooltipTrigger>
			<TooltipContent
				side="top"
				className="max-w-sm whitespace-normal text-left leading-snug"
			>
				<div className="flex flex-col gap-1.5">
					{paragraphs.map((p) => (
						<p key={p}>{p}</p>
					))}
				</div>
			</TooltipContent>
		</Tooltip>
	);
}

function MyrInput(
	props: React.InputHTMLAttributes<HTMLInputElement> & {
		inputClassName?: string;
	},
) {
	const { inputClassName, className, ...rest } = props;
	return (
		<div className={cn("relative flex-1", className)}>
			<Input
				type="number"
				min={0}
				step={0.01}
				{...rest}
				className={cn("pr-14", inputClassName)}
			/>
			<Badge
				variant="info"
				className="-translate-y-1/2 absolute top-1/2 right-1 h-5 px-1.5 font-mono text-[10px]"
			>
				MYR
			</Badge>
		</div>
	);
}

function DurationStepper({
	value,
	onChange,
}: {
	value: number;
	onChange: (n: number) => void;
}) {
	return (
		<div className="flex items-center gap-1">
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onClick={() => onChange(Math.max(5, value - 5))}
				aria-label="Decrease duration"
			>
				<Minus className="size-3.5" />
			</Button>
			<div className="flex h-8 flex-1 items-center justify-center rounded-lg border bg-background text-sm">
				{value} minutes
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onClick={() => onChange(value + 5)}
				aria-label="Increase duration"
			>
				<Plus className="size-3.5" />
			</Button>
		</div>
	);
}

function TaxChipSelector({
	taxes,
	value,
	onChange,
}: {
	taxes: Tax[];
	value: string[];
	onChange: (next: string[]) => void;
}) {
	const selected = new Set(value);
	const selectedTaxes = taxes.filter((t) => selected.has(t.id));
	const unselectedTaxes = taxes.filter((t) => !selected.has(t.id));

	const add = (id: string) => onChange([...value, id]);
	const remove = (id: string) => onChange(value.filter((v) => v !== id));

	if (taxes.length === 0) {
		return (
			<p className="text-muted-foreground text-xs">
				No taxes configured. Add taxes under Config → Taxes.
			</p>
		);
	}
	return (
		<div className="flex flex-col gap-2">
			<div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background p-1.5">
				{selectedTaxes.length === 0 && (
					<span className="px-1 text-muted-foreground text-xs">
						No taxes selected
					</span>
				)}
				{selectedTaxes.map((t) => (
					<Badge
						key={t.id}
						variant="info"
						className="gap-1 pl-2 pr-1 font-medium"
					>
						{t.name} {taxRateFormatter.format(Number(t.rate_pct))}%
						<button
							type="button"
							onClick={() => remove(t.id)}
							aria-label={`Remove ${t.name}`}
							className="flex size-3.5 items-center justify-center rounded-full hover:bg-background/30"
						>
							<X className="size-3" />
						</button>
					</Badge>
				))}
			</div>
			{unselectedTaxes.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{unselectedTaxes.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => add(t.id)}
							className="rounded-full border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
						>
							+ {t.name} {taxRateFormatter.format(Number(t.rate_pct))}%
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export function NewServiceButton({
	categories,
	taxes,
	inventoryItems,
}: {
	categories: ServiceCategory[];
	taxes: Tax[];
	inventoryItems: InventoryItemChoice[];
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<CreateButton onClick={() => setOpen(true)}>New service</CreateButton>
			<ServiceFormDialog
				open={open}
				service={null}
				categories={categories}
				taxes={taxes}
				inventoryItems={inventoryItems}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
