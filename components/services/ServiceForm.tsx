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
	createServiceAction,
	updateServiceAction,
} from "@/lib/actions/services";
import {
	type ServiceCreateInput,
	SERVICE_TYPES,
	SERVICE_TYPE_LABELS,
	serviceCreateSchema,
} from "@/lib/schemas/services";
import type {
	ServiceCategory,
	ServiceWithCategory,
} from "@/lib/services/services";

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
	price: 0,
	incentive_type: null,
	consumables: null,
	discount_cap: null,
	full_payment: false,
	is_active: true,
};

export function ServiceFormDialog({ open, service, categories, onClose }: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<ServiceCreateInput>({
		resolver: zodResolver(serviceCreateSchema),
		defaultValues: EMPTY,
	});

	useEffect(() => {
		if (open) {
			form.reset({
				sku: service?.sku ?? "",
				name: service?.name ?? "",
				category_id: service?.category_id ?? null,
				type: (service?.type as ServiceCreateInput["type"]) ?? "retail",
				duration_min: service?.duration_min ?? 30,
				price: service ? Number(service.price) : 0,
				incentive_type: service?.incentive_type ?? null,
				consumables: service?.consumables ?? null,
				discount_cap:
					service?.discount_cap == null ? null : Number(service.discount_cap),
				full_payment: service?.full_payment ?? false,
				is_active: service?.is_active ?? true,
			});
			setServerError(null);
		}
	}, [open, service, form]);

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				if (service) {
					const { sku: _omit, ...rest } = values;
					await updateServiceAction(service.id, rest);
				} else {
					await createServiceAction(values);
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
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle>
					<DialogDescription>
						Catalog entry used as a billing line item after a visit.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={onSubmit}
					className="flex min-h-0 flex-1 flex-col"
				>
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="service-sku" className="font-medium text-sm">
								SKU
							</label>
							<Input
								id="service-sku"
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
						<div className="flex flex-col gap-1.5">
							<label htmlFor="service-type" className="font-medium text-sm">
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

					<div className="flex flex-col gap-1.5">
						<label htmlFor="service-name" className="font-medium text-sm">
							Name
						</label>
						<Input id="service-name" {...form.register("name")} />
						{form.formState.errors.name && (
							<p className="text-destructive text-xs">
								{form.formState.errors.name.message}
							</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<label htmlFor="service-category" className="font-medium text-sm">
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

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="service-duration" className="font-medium text-sm">
								Duration (minutes)
							</label>
							<Input
								id="service-duration"
								type="number"
								min={5}
								max={600}
								step={5}
								{...form.register("duration_min", { valueAsNumber: true })}
							/>
							{form.formState.errors.duration_min && (
								<p className="text-destructive text-xs">
									{form.formState.errors.duration_min.message}
								</p>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="service-price" className="font-medium text-sm">
								Price (MYR)
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
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="service-incentive"
								className="font-medium text-sm"
							>
								Incentive Type
							</label>
							<Input
								id="service-incentive"
								placeholder="e.g. Positions"
								{...form.register("incentive_type", {
									setValueAs: (v) => (v === "" || v == null ? null : String(v)),
								})}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="service-discount-cap"
								className="font-medium text-sm"
							>
								Discount Cap (%)
							</label>
							<Input
								id="service-discount-cap"
								type="number"
								min={0}
								max={100}
								step={1}
								{...form.register("discount_cap", {
									setValueAs: (v) =>
										v === "" || v === null || v === undefined
											? null
											: Number(v),
								})}
							/>
							{form.formState.errors.discount_cap && (
								<p className="text-destructive text-xs">
									{form.formState.errors.discount_cap.message}
								</p>
							)}
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<label htmlFor="service-consumables" className="font-medium text-sm">
							Consumables
						</label>
						<textarea
							id="service-consumables"
							rows={2}
							className="min-h-16 rounded-md border bg-background px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							{...form.register("consumables", {
								setValueAs: (v) => (v === "" || v == null ? null : String(v)),
							})}
						/>
					</div>

					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							{...form.register("full_payment")}
							className="size-4"
						/>
						Full Payment required
					</label>

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

export function NewServiceButton({
	categories,
}: {
	categories: ServiceCategory[];
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button onClick={() => setOpen(true)}>New service</Button>
			<ServiceFormDialog
				open={open}
				service={null}
				categories={categories}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
