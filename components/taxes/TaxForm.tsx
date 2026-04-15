"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
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
import { createTaxAction, updateTaxAction } from "@/lib/actions/taxes";
import { type TaxInput, taxInputSchema } from "@/lib/schemas/taxes";
import type { Tax } from "@/lib/services/taxes";

const EMPTY: TaxInput = {
	name: "",
	rate_pct: 0,
	is_active: true,
};

type Props = {
	open: boolean;
	tax: Tax | null;
	onClose: () => void;
};

export function TaxFormDialog({ open, tax, onClose }: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<TaxInput>({
		resolver: zodResolver(taxInputSchema),
		defaultValues: EMPTY,
	});

	useEffect(() => {
		if (open) {
			form.reset(
				tax
					? {
							name: tax.name,
							rate_pct: Number(tax.rate_pct),
							is_active: tax.is_active,
						}
					: EMPTY,
			);
			setServerError(null);
		}
	}, [open, tax, form]);

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				if (tax) await updateTaxAction(tax.id, values);
				else await createTaxAction(values);
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
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{tax ? "Edit tax" : "New tax"}</DialogTitle>
					<DialogDescription>
						Tax rate that can be attached to services and inventory items.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="tax-name" className="font-medium text-sm">
								Name
							</label>
							<Input
								id="tax-name"
								placeholder="e.g. Local, Foreigners, SST"
								{...form.register("name")}
							/>
							{form.formState.errors.name && (
								<p className="text-destructive text-xs">
									{form.formState.errors.name.message}
								</p>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="tax-rate" className="font-medium text-sm">
								Rate (%)
							</label>
							<Input
								id="tax-rate"
								type="number"
								min={0}
								max={100}
								step={0.01}
								{...form.register("rate_pct", { valueAsNumber: true })}
							/>
							{form.formState.errors.rate_pct && (
								<p className="text-destructive text-xs">
									{form.formState.errors.rate_pct.message}
								</p>
							)}
						</div>
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

export function NewTaxButton() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<CreateButton onClick={() => setOpen(true)}>New tax</CreateButton>
			<TaxFormDialog open={open} tax={null} onClose={() => setOpen(false)} />
		</>
	);
}
