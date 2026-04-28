"use client";

import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
	hasMissingRequiredFields,
	PaymentMethodFields,
} from "@/components/appointments/detail/collect-payment/PaymentMethodFields";
import type { PaymentEntry as UIPaymentEntry } from "@/components/appointments/detail/collect-payment/types";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { listActivePaymentMethodsAction } from "@/lib/actions/payment-methods";
import { updatePaymentMethodAction } from "@/lib/actions/sales";
import type { PaymentWithProcessedBy } from "@/lib/services/sales";
import type { Tables } from "@/lib/supabase/types";

type PaymentMethod = Tables<"payment_methods">;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	salesOrderId: string;
	appointmentRef?: string | null;
	payment: PaymentWithProcessedBy | null;
	onSuccess?: (message: string) => void;
	onError?: (message: string) => void;
};

function money(n: number): string {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function emptyEntry(mode: string): UIPaymentEntry {
	return {
		key: "edit",
		mode,
		amount: "",
		remarks: "",
		bank: "",
		card_type: "",
		trace_no: "",
		approval_code: "",
		reference_no: "",
		months: "",
	};
}

export function ChangePaymentMethodDialog({
	open,
	onOpenChange,
	salesOrderId,
	appointmentRef,
	payment,
	onSuccess,
	onError,
}: Props) {
	const router = useRouter();
	const [methods, setMethods] = useState<PaymentMethod[]>([]);
	const [entry, setEntry] = useState<UIPaymentEntry>(() => emptyEntry("cash"));
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!open) return;
		listActivePaymentMethodsAction()
			.then((pms) => setMethods(pms.filter((m) => m.code !== "wallet")))
			.catch(() => setMethods([]));
	}, [open]);

	useEffect(() => {
		if (!open || !payment) return;
		setEntry({
			key: payment.id,
			mode: payment.payment_mode,
			amount: String(payment.amount ?? ""),
			remarks: payment.remarks ?? "",
			bank: payment.bank ?? "",
			card_type: payment.card_type ?? "",
			trace_no: payment.trace_no ?? "",
			approval_code: payment.approval_code ?? "",
			reference_no: payment.reference_no ?? "",
			months: payment.months != null ? String(payment.months) : "",
		});
		setSubmitError(null);
	}, [open, payment]);

	const selectedMethod = useMemo(
		() => methods.find((m) => m.code === entry.mode) ?? null,
		[methods, entry.mode],
	);

	const onChangeMethod = (mode: string) => {
		setEntry((prev) => ({
			...prev,
			mode,
			bank: "",
			card_type: "",
			trace_no: "",
			approval_code: "",
			reference_no: "",
			months: "",
		}));
	};

	const patch = (p: Partial<UIPaymentEntry>) =>
		setEntry((prev) => ({ ...prev, ...p }));

	const canSubmit =
		!isPending &&
		payment != null &&
		selectedMethod != null &&
		!hasMissingRequiredFields(selectedMethod, entry);

	const submit = () => {
		if (!canSubmit || !payment || !selectedMethod) return;
		setSubmitError(null);
		startTransition(async () => {
			try {
				await updatePaymentMethodAction(
					payment.id,
					salesOrderId,
					{
						payment_mode: selectedMethod.code,
						bank: entry.bank || null,
						card_type: entry.card_type || null,
						trace_no: entry.trace_no || null,
						approval_code: entry.approval_code || null,
						reference_no: entry.reference_no || null,
						months: entry.months ? Number.parseInt(entry.months, 10) : null,
					},
					appointmentRef,
				);
				onOpenChange(false);
				onSuccess?.(`${payment.invoice_no} updated to ${selectedMethod.name}`);
				router.refresh();
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Failed to change method";
				setSubmitError(msg);
				onError?.(msg);
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				preventOutsideClose
				className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-md flex-col gap-0 p-0 sm:max-w-md"
			>
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle className="flex items-center gap-2 font-semibold">
						<Pencil className="size-4" />
						Change payment method
					</DialogTitle>
					<DialogDescription className="text-xs">
						{payment ? (
							<>
								{payment.invoice_no} · MYR {money(Number(payment.amount))}
							</>
						) : null}
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
					{submitError && (
						<div
							role="alert"
							className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 text-sm"
						>
							{submitError}
						</div>
					)}

					<div>
						<Label htmlFor="method-select">
							Method <span className="text-red-500">*</span>
						</Label>
						<select
							id="method-select"
							className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring"
							value={entry.mode}
							onChange={(e) => onChangeMethod(e.target.value)}
							disabled={isPending}
						>
							{methods.map((m) => (
								<option key={m.code} value={m.code}>
									{m.name}
								</option>
							))}
							{selectedMethod == null && (
								<option value={entry.mode}>{entry.mode}</option>
							)}
						</select>
					</div>

					{selectedMethod && (
						<PaymentMethodFields
							method={selectedMethod}
							entry={entry}
							onChange={patch}
						/>
					)}
				</div>

				<DialogFooter className="border-t px-6 py-3">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button type="button" onClick={submit} disabled={!canSubmit}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Saving…
							</>
						) : (
							"Save"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
