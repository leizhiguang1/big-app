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
import {
	createPaymentMethodAction,
	updatePaymentMethodAction,
} from "@/lib/actions/payment-methods";
import {
	type NewPaymentMethodInput,
	type PaymentMethodInput,
	newPaymentMethodInputSchema,
	paymentMethodInputSchema,
} from "@/lib/schemas/payment-methods";
import type { PaymentMethod } from "@/lib/services/payment-methods";

type EditProps = {
	open: boolean;
	method: PaymentMethod | null;
	onClose: () => void;
};

export function PaymentMethodFormDialog({ open, method, onClose }: EditProps) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<PaymentMethodInput>({
		resolver: zodResolver(paymentMethodInputSchema),
		defaultValues: { name: "", is_active: true, sort_order: 0 },
	});

	useEffect(() => {
		if (open && method) {
			form.reset({
				name: method.name,
				is_active: method.is_active,
				sort_order: method.sort_order,
			});
			setServerError(null);
		}
	}, [open, method, form]);

	const onSubmit = form.handleSubmit((values) => {
		if (!method) return;
		startTransition(async () => {
			try {
				await updatePaymentMethodAction(method.id, values);
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
					<DialogTitle>
						{method?.is_builtin
							? `Edit built-in: ${method?.name}`
							: "Edit payment method"}
					</DialogTitle>
					<DialogDescription>
						{method?.is_builtin
							? "Built-in methods: rename, reorder, or toggle active. Field requirements are fixed."
							: "Custom methods collect a remarks field when selected during payment."}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="pm-name" className="font-medium text-sm">
								Name
							</label>
							<Input
								id="pm-name"
								placeholder="e.g. Credit Card"
								{...form.register("name")}
							/>
							{form.formState.errors.name && (
								<p className="text-destructive text-xs">
									{form.formState.errors.name.message}
								</p>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="pm-sort" className="font-medium text-sm">
								Sort order
							</label>
							<Input
								id="pm-sort"
								type="number"
								min={0}
								{...form.register("sort_order", { valueAsNumber: true })}
							/>
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

type NewProps = {
	open: boolean;
	onClose: () => void;
};

function NewPaymentMethodDialog({ open, onClose }: NewProps) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<NewPaymentMethodInput>({
		resolver: zodResolver(newPaymentMethodInputSchema),
		defaultValues: { name: "" },
	});

	useEffect(() => {
		if (open) {
			form.reset({ name: "" });
			setServerError(null);
		}
	}, [open, form]);

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				await createPaymentMethodAction(values);
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
					<DialogTitle>New payment method</DialogTitle>
					<DialogDescription>
						Custom methods collect a Remarks field in Collect Payment. For card
						or online-transaction style methods (with bank, trace, etc.), use
						one of the built-ins.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="new-pm-name" className="font-medium text-sm">
								Name
							</label>
							<Input
								id="new-pm-name"
								placeholder="e.g. GrabPay"
								{...form.register("name")}
							/>
							{form.formState.errors.name && (
								<p className="text-destructive text-xs">
									{form.formState.errors.name.message}
								</p>
							)}
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
							{pending ? "Creating…" : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function NewPaymentMethodButton() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<CreateButton onClick={() => setOpen(true)}>
				New payment method
			</CreateButton>
			<NewPaymentMethodDialog open={open} onClose={() => setOpen(false)} />
		</>
	);
}
