"use client";

import { CreditCard, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listActivePaymentMethodsAction } from "@/lib/actions/payment-methods";
import { recordAdditionalPaymentAction } from "@/lib/actions/sales";
import type { Tables } from "@/lib/supabase/types";

type PaymentMethod = Tables<"payment_methods">;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	salesOrderId: string;
	soNumber: string;
	outstanding: number;
	appointmentRef?: string | null;
	onSuccess?: (message: string) => void;
	onError?: (message: string) => void;
};

function money(n: number): string {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function emptyEntry(mode: string, amount: string): UIPaymentEntry {
	return {
		key: "record",
		mode,
		amount,
		remarks: "",
		bank: "",
		card_type: "",
		trace_no: "",
		approval_code: "",
		reference_no: "",
		months: "",
	};
}

export function RecordPaymentDialog({
	open,
	onOpenChange,
	salesOrderId,
	soNumber,
	outstanding,
	appointmentRef,
	onSuccess,
	onError,
}: Props) {
	const router = useRouter();
	const [methods, setMethods] = useState<PaymentMethod[]>([]);
	const [entry, setEntry] = useState<UIPaymentEntry>(() =>
		emptyEntry("cash", outstanding > 0 ? outstanding.toFixed(2) : ""),
	);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!open) return;
		setSubmitError(null);
		setEntry(
			emptyEntry("cash", outstanding > 0 ? outstanding.toFixed(2) : ""),
		);
		listActivePaymentMethodsAction()
			.then((pms) => {
				const filtered = pms.filter((m) => m.code !== "wallet");
				setMethods(filtered);
				if (filtered.length > 0 && !filtered.some((m) => m.code === "cash")) {
					setEntry((prev) => ({ ...prev, mode: filtered[0].code }));
				}
			})
			.catch(() => setMethods([]));
	}, [open, outstanding]);

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

	const amountNum = Number.parseFloat(entry.amount);
	const amountValid = Number.isFinite(amountNum) && amountNum > 0;
	const overpay = amountValid && amountNum > outstanding + 0.005;

	const canSubmit =
		!isPending &&
		selectedMethod != null &&
		amountValid &&
		!overpay &&
		!hasMissingRequiredFields(selectedMethod, entry);

	const submit = () => {
		if (!canSubmit || !selectedMethod) return;
		setSubmitError(null);
		startTransition(async () => {
			try {
				const result = await recordAdditionalPaymentAction(
					salesOrderId,
					{
						amount: amountNum,
						payment_mode: selectedMethod.code,
						bank: entry.bank || null,
						card_type: entry.card_type || null,
						trace_no: entry.trace_no || null,
						approval_code: entry.approval_code || null,
						reference_no: entry.reference_no || null,
						months: entry.months ? Number.parseInt(entry.months, 10) : null,
						remarks: entry.remarks || null,
					},
					appointmentRef,
				);
				onOpenChange(false);
				const tail =
					result.newOutstanding > 0.005
						? `Outstanding MYR ${money(result.newOutstanding)}`
						: "Fully paid";
				onSuccess?.(
					`${result.invoiceNo} · MYR ${money(result.amount)} · ${tail}`,
				);
				router.refresh();
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Failed to record payment";
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
						<CreditCard className="size-4" />
						Record payment
					</DialogTitle>
					<DialogDescription className="text-xs">
						{soNumber} · Outstanding MYR {money(outstanding)}
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
						<Label htmlFor="payment-amount">
							Amount (MYR) <span className="text-red-500">*</span>
						</Label>
						<Input
							id="payment-amount"
							type="number"
							inputMode="decimal"
							step="0.01"
							min="0"
							value={entry.amount}
							onChange={(e) => patch({ amount: e.target.value })}
							className="mt-1.5"
						/>
						{overpay && (
							<p className="mt-1 text-red-600 text-xs">
								Amount exceeds outstanding MYR {money(outstanding)}
							</p>
						)}
					</div>

					<div>
						<Label htmlFor="payment-method">
							Method <span className="text-red-500">*</span>
						</Label>
						<select
							id="payment-method"
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
								Recording…
							</>
						) : (
							"Record payment"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
