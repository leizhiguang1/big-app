"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listActivePaymentMethodsAction } from "@/lib/actions/payment-methods";
import { issueRefundAction } from "@/lib/actions/sales";
import type { Tables } from "@/lib/supabase/types";

type PaymentMethod = Tables<"payment_methods">;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	salesOrderId: string;
	soNumber: string;
	orderTotal: number;
	onSuccess?: (result: { rnNumber: string; amount: number }) => void;
	onError?: (message: string) => void;
};

function money(n: number): string {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export function IssueRefundDialog({
	open,
	onOpenChange,
	salesOrderId,
	soNumber,
	orderTotal,
	onSuccess,
	onError,
}: Props) {
	const router = useRouter();
	const [amount, setAmount] = useState<string>("");
	const [refundMethod, setRefundMethod] = useState<string>("");
	const [notes, setNotes] = useState<string>("");
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!open) return;
		setAmount("");
		setRefundMethod("");
		setNotes("");
		setSubmitError(null);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		listActivePaymentMethodsAction()
			.then(setPaymentMethods)
			.catch(() => setPaymentMethods([]));
	}, [open]);

	const amountNum = Number.parseFloat(amount || "0") || 0;
	const amountValid = amountNum > 0 && amountNum <= orderTotal;
	const canSubmit =
		amountValid && refundMethod !== "" && !isPending;

	const submit = () => {
		if (!canSubmit) return;
		setSubmitError(null);
		startTransition(async () => {
			try {
				const result = await issueRefundAction(salesOrderId, {
					amount: amountNum,
					refund_method: refundMethod,
					notes: notes.trim() || undefined,
				});
				onOpenChange(false);
				onSuccess?.(result);
				router.refresh();
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Failed to issue refund";
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
					<DialogTitle className="font-semibold">
						Issue Refund for {soNumber}
					</DialogTitle>
					<DialogDescription className="text-xs">
						Records the refund for reconciliation. It does not cancel the order
						or move money.
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
						<Label htmlFor="refund-amount">
							Amount (MYR) <span className="text-red-500">*</span>
						</Label>
						<Input
							id="refund-amount"
							type="number"
							min="0.01"
							max={orderTotal}
							step="0.01"
							inputMode="decimal"
							placeholder="0.00"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							disabled={isPending}
							className="mt-1.5 w-40 tabular-nums"
						/>
						<p className="mt-1 text-[11px] text-muted-foreground">
							Up to MYR {money(orderTotal)} (order total).
						</p>
					</div>

					<div>
						<Label htmlFor="refund-method">
							Refund method <span className="text-red-500">*</span>
						</Label>
						<Select
							value={refundMethod}
							onValueChange={setRefundMethod}
							disabled={isPending}
						>
							<SelectTrigger id="refund-method" className="mt-1.5 w-full">
								<SelectValue placeholder="Select refund method" />
							</SelectTrigger>
							<SelectContent>
								{paymentMethods.map((pm) => (
									<SelectItem key={pm.code} value={pm.code}>
										{pm.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label htmlFor="refund-notes">Notes</Label>
						<Textarea
							id="refund-notes"
							placeholder="e.g. goodwill, overpayment, lab fee not rendered"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							disabled={isPending}
							rows={3}
							maxLength={500}
							className="mt-1.5"
						/>
					</div>
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
					<Button
						type="button"
						onClick={submit}
						disabled={!canSubmit}
						className="bg-amber-600 text-white hover:bg-amber-700"
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Issuing…
							</>
						) : (
							"Issue Refund"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
