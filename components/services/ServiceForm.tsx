"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CreateButton } from "@/components/ui/create-button";
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
	createServiceAction,
	updateServiceAction,
} from "@/lib/actions/services";
import {
	SERVICE_TYPE_LABELS,
	SERVICE_TYPES,
	type ServiceCreateInput,
	serviceCreateSchema,
} from "@/lib/schemas/services";
import type {
	ServiceCategory,
	ServiceWithCategory,
} from "@/lib/services/services";
import { DurationInput } from "./DurationInput";
import { PhaseTwoSection } from "./PhaseTwoSection";

type Props = {
	open: boolean;
	service: ServiceWithCategory | null;
	categories: ServiceCategory[];
	onClose: () => void;
};

const EMPTY: ServiceCreateInput = {
	sku: "",
	name: "",
	category_id: null,
	type: "retail",
	duration_min: 30,
	external_code: null,
	image_url: null,
	price: 0,
	other_fees: 0,
	incentive_type: null,
	consumables: null,
	discount_cap: null,
	full_payment: false,
	allow_redemption_without_payment: true,
	allow_cash_price_range: false,
	is_active: true,
};

export function ServiceFormDialog({
	open,
	service,
	categories,
	onClose,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);
	const [discountCapEnabled, setDiscountCapEnabled] = useState(false);

	const form = useForm<ServiceCreateInput>({
		resolver: zodResolver(serviceCreateSchema),
		defaultValues: EMPTY,
	});

	useEffect(() => {
		if (open) {
			const nextCap =
				service?.discount_cap == null ? null : Number(service.discount_cap);
			form.reset({
				sku: service?.sku ?? "",
				name: service?.name ?? "",
				category_id: service?.category_id ?? null,
				type: (service?.type as ServiceCreateInput["type"]) ?? "retail",
				duration_min: service?.duration_min ?? 30,
				external_code: service?.external_code ?? null,
				image_url: service?.image_url ?? null,
				price: service ? Number(service.price) : 0,
				other_fees: service ? Number(service.other_fees ?? 0) : 0,
				incentive_type: service?.incentive_type ?? null,
				consumables: service?.consumables ?? null,
				discount_cap: nextCap,
				full_payment: service?.full_payment ?? false,
				allow_redemption_without_payment:
					service?.allow_redemption_without_payment ?? true,
				allow_cash_price_range: service?.allow_cash_price_range ?? false,
				is_active: service?.is_active ?? true,
			});
			setDiscountCapEnabled(nextCap != null);
			setServerError(null);
		}
	}, [open, service, form]);

	const onSubmit = form.handleSubmit((values) => {
		const sanitized: ServiceCreateInput = {
			...values,
			discount_cap: discountCapEnabled ? (values.discount_cap ?? 0) : null,
		};
		startTransition(async () => {
			try {
				if (service) {
					const { sku: _omit, ...rest } = sanitized;
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

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[92vh] w-full flex-col gap-0 p-0 sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle>
					<DialogDescription>
						Catalog entry used as a billing line item after a visit.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
						{/* ── General ───────────────────────────────────────────── */}
						<section className="flex flex-col gap-3 rounded-md border p-4">
							<h3 className="font-medium text-sm">General</h3>
							<div className="grid grid-cols-[auto_1fr] gap-4">
								<div className="flex flex-col items-center gap-2">
									<div className="flex size-24 items-center justify-center rounded-md border border-dashed bg-muted/30 text-muted-foreground">
										<ImageIcon className="size-8 opacity-40" />
									</div>
									<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
										Image (Phase 2)
									</span>
								</div>
								<div className="flex flex-col gap-3">
									<div className="grid grid-cols-2 gap-3">
										<div className="flex flex-col gap-1.5">
											<label
												htmlFor="service-name"
												className="font-medium text-sm"
											>
												Description
											</label>
											<Input
												id="service-name"
												placeholder="EG: SCALING & POLISHING"
												{...form.register("name")}
											/>
											{form.formState.errors.name && (
												<p className="text-destructive text-xs">
													{form.formState.errors.name.message}
												</p>
											)}
										</div>
										<div className="flex flex-col gap-1.5">
											<label
												htmlFor="service-sku"
												className="font-medium text-sm"
											>
												SKU
											</label>
											<Input
												id="service-sku"
												placeholder="TRT-01"
												disabled={!!service}
												{...form.register("sku")}
											/>
											{form.formState.errors.sku && (
												<p className="text-destructive text-xs">
													{form.formState.errors.sku.message}
												</p>
											)}
											{service && (
												<p className="text-muted-foreground text-xs">
													SKU is immutable.
												</p>
											)}
										</div>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="flex flex-col gap-1.5">
											<label
												htmlFor="service-category"
												className="font-medium text-sm"
											>
												Category
											</label>
											<select
												id="service-category"
												className="h-9 rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
												{...form.register("category_id", {
													setValueAs: (v) => (v === "" ? null : v),
												})}
											>
												<option value="">— None —</option>
												{categories.map((c) => (
													<option key={c.id} value={c.id}>
														{c.name}
													</option>
												))}
											</select>
										</div>
										<div className="flex flex-col gap-1.5">
											<label
												htmlFor="service-type"
												className="font-medium text-sm"
											>
												Type
											</label>
											<select
												id="service-type"
												className="h-9 rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
												{...form.register("type")}
											>
												{SERVICE_TYPES.map((t) => (
													<option key={t} value={t}>
														{SERVICE_TYPE_LABELS[t]}
													</option>
												))}
											</select>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="flex flex-col gap-1.5">
											<label className="font-medium text-sm">Duration</label>
											<Controller
												control={form.control}
												name="duration_min"
												render={({ field }) => (
													<DurationInput
														value={field.value}
														onChange={field.onChange}
													/>
												)}
											/>
											{form.formState.errors.duration_min && (
												<p className="text-destructive text-xs">
													{form.formState.errors.duration_min.message}
												</p>
											)}
										</div>
										<div className="flex flex-col gap-1.5">
											<label
												htmlFor="service-external-code"
												className="font-medium text-sm"
											>
												External Code
											</label>
											<Input
												id="service-external-code"
												placeholder="Optional"
												{...form.register("external_code", {
													setValueAs: (v) =>
														v === "" || v == null ? null : String(v),
												})}
											/>
										</div>
									</div>
								</div>
							</div>
						</section>

						<PhaseTwoSection
							title="Case Note Template"
							hint="Attach a clinical case-note template per service."
						>
							<select
								disabled
								className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
							>
								<option>Please choose…</option>
							</select>
						</PhaseTwoSection>

						<PhaseTwoSection
							title="e-Invoice Classification Code"
							hint="Malaysian LHDN e-invoicing classification. Wired up when invoicing ships."
						>
							<select
								disabled
								className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
							>
								<option>Please choose…</option>
							</select>
						</PhaseTwoSection>

						{/* ── Pricing ──────────────────────────────────────────── */}
						<section className="flex flex-col gap-3 rounded-md border p-4">
							<h3 className="font-medium text-sm">Pricing</h3>
							<div className="grid grid-cols-2 gap-3">
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor="service-price"
										className="font-medium text-sm"
									>
										Selling Price (MYR)
									</label>
									<Input
										id="service-price"
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
										htmlFor="service-other-fees"
										className="font-medium text-sm"
									>
										Other Fees (MYR)
									</label>
									<Input
										id="service-other-fees"
										type="number"
										min={0}
										step={0.01}
										{...form.register("other_fees", { valueAsNumber: true })}
									/>
									{form.formState.errors.other_fees && (
										<p className="text-destructive text-xs">
											{form.formState.errors.other_fees.message}
										</p>
									)}
								</div>
							</div>

							<div className="flex flex-col gap-1.5">
								<label className="flex items-center gap-2 font-medium text-sm">
									<input
										type="checkbox"
										className="size-4"
										checked={discountCapEnabled}
										onChange={(e) => setDiscountCapEnabled(e.target.checked)}
									/>
									Individual Discount Capping
								</label>
								{discountCapEnabled && (
									<div className="flex items-center gap-2">
										<Input
											type="number"
											min={0}
											max={100}
											step={1}
											className="max-w-32"
											{...form.register("discount_cap", {
												setValueAs: (v) =>
													v === "" || v === null || v === undefined
														? 0
														: Number(v),
											})}
										/>
										<span className="text-muted-foreground text-xs">
											% maximum discount
										</span>
									</div>
								)}
								{form.formState.errors.discount_cap && (
									<p className="text-destructive text-xs">
										{form.formState.errors.discount_cap.message}
									</p>
								)}
							</div>

							<div className="flex flex-col gap-2">
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										className="size-4"
										{...form.register("full_payment")}
									/>
									Full payment required
								</label>
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										className="size-4"
										{...form.register("allow_redemption_without_payment")}
									/>
									Allow redemption without payment
								</label>
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										className="size-4"
										{...form.register("allow_cash_price_range")}
									/>
									Allow cash selling price range
								</label>
							</div>
						</section>

						<PhaseTwoSection
							title="Loyalty Points Pricing"
							hint="Selling Points + Beauti Points (BP) value — lands with the loyalty module."
						>
							<div className="grid grid-cols-2 gap-3">
								<div className="flex flex-col gap-1.5">
									<label className="text-xs">Selling Points</label>
									<Input disabled type="number" value={0} readOnly />
								</div>
								<div className="flex flex-col gap-1.5">
									<label className="text-xs">Beauti Points Price</label>
									<Input disabled type="number" value={0} readOnly />
								</div>
							</div>
						</PhaseTwoSection>

						<PhaseTwoSection
							title="Taxes"
							hint="Per-outlet tax rules. Wired up with the tax module."
						>
							<select
								disabled
								className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
							>
								<option>— no tax —</option>
							</select>
						</PhaseTwoSection>

						<PhaseTwoSection
							title="Per-Outlet Pricing Overrides"
							hint="Override price, fees, availability and taxes per outlet. Currently one price for all outlets."
						>
							<div className="flex items-center gap-2 text-xs">
								<input type="checkbox" disabled checked readOnly />
								<span>Apply above prices to all outlets</span>
							</div>
							<div className="mt-2 overflow-hidden rounded-md border">
								<table className="w-full text-xs">
									<thead className="bg-muted/50">
										<tr>
											<th className="px-2 py-1 text-left">Outlet</th>
											<th className="px-2 py-1 text-right">Price</th>
											<th className="px-2 py-1 text-right">Other Fees</th>
											<th className="px-2 py-1 text-center">Available</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td className="px-2 py-1 text-muted-foreground">
												(all outlets)
											</td>
											<td className="px-2 py-1 text-right tabular-nums">—</td>
											<td className="px-2 py-1 text-right tabular-nums">—</td>
											<td className="px-2 py-1 text-center">—</td>
										</tr>
									</tbody>
								</table>
							</div>
						</PhaseTwoSection>

						<PhaseTwoSection
							title="Consumables"
							hint="Structured list of materials used per procedure — replaces the free-text column when inventory ships."
						>
							<div className="flex items-center justify-between">
								<span className="text-xs">No entries</span>
								<Button type="button" variant="outline" size="sm" disabled>
									Add
								</Button>
							</div>
						</PhaseTwoSection>

						<PhaseTwoSection
							title="Medications"
							hint="Linked prescription items dispensed with this service."
						>
							<div className="flex items-center justify-between">
								<span className="text-xs">No entries</span>
								<Button type="button" variant="outline" size="sm" disabled>
									Add
								</Button>
							</div>
						</PhaseTwoSection>

						<PhaseTwoSection
							title="Coverage Payor"
							hint="Insurance or third-party payer linkage."
						>
							<span className="text-xs">
								No coverage payor set for this service.
							</span>
						</PhaseTwoSection>

						<PhaseTwoSection
							title="Hands-On Incentive"
							hint="Commission rule — Positions, Points, or both, with per-position rates."
						>
							<div className="flex items-center gap-4 text-xs">
								<label className="flex items-center gap-1.5">
									<input type="radio" disabled checked readOnly /> Positions
								</label>
								<label className="flex items-center gap-1.5">
									<input type="radio" disabled /> Points
								</label>
								<label className="flex items-center gap-1.5">
									<input type="radio" disabled /> Position & Points
								</label>
							</div>
						</PhaseTwoSection>

						{/* ── Active ───────────────────────────────────────────── */}
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								className="size-4"
								{...form.register("is_active")}
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

export function NewServiceButton({
	categories,
}: {
	categories: ServiceCategory[];
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<CreateButton onClick={() => setOpen(true)}>New service</CreateButton>
			<ServiceFormDialog
				open={open}
				service={null}
				categories={categories}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
