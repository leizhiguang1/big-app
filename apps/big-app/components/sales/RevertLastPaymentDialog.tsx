"use client";

import { Loader2, Undo2 } from "lucide-react";
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
import { revertLastPaymentAction } from "@/lib/actions/sales";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	salesOrderId: string;
	appointmentRef?: string | null;
	payment: {
		invoiceNo: string;
		amount: number;
		methodName: string;
	} | null;
	onSuccess?: (message: string) => void;
	onError?: (message: string) => void;
};

function money(n: number): string {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export function RevertLastPaymentDialog({
	open,
	onOpenChange,
	salesOrderId,
	appointmentRef,
	payment,
	onSuccess,
	onError,
}: Props) {
	const router = useRouter();
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!open) setSubmitError(null);
	}, [open]);

	const submit = () => {
		if (!payment) return;
		setSubmitError(null);
		startTransition(async () => {
			try {
				const result = await revertLastPaymentAction(
					salesOrderId,
					appointmentRef,
				);
				onOpenChange(false);
				onSuccess?.(
					`Reverted ${result.invoiceNo} · MYR ${money(result.amount)} returned to outstanding`,
				);
				router.refresh();
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Failed to revert payment";
				setSubmitError(msg);
				onError?.(msg);
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				preventOutsideClose
				className="flex w-[calc(100vw-2rem)] max-w-md flex-col gap-0 p-0 sm:max-w-md"
			>
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle className="flex items-center gap-2 font-semibold">
						<Undo2 className="size-4" />
						Revert last payment
					</DialogTitle>
					<DialogDescription className="text-xs">
						The payment row will be removed and the sales order returns to
						outstanding. Inventory is not touched.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 px-6 py-5 text-sm">
					{submitError && (
						<div
							role="alert"
							className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 text-xs"
						>
							{submitError}
						</div>
					)}
					{payment && (
						<div className="rounded-md border bg-muted/30 p-3 text-sm">
							<div className="flex items-center justify-between">
								<span className="font-mono font-medium">
									{payment.invoiceNo}
								</span>
								<span className="tabular-nums">
									MYR {money(payment.amount)}
								</span>
							</div>
							<p className="mt-1 text-muted-foreground text-xs">
								Paid by {payment.methodName}
							</p>
						</div>
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
					<Button
						type="button"
						onClick={submit}
						disabled={!payment || isPending}
						className="bg-red-600 text-white hover:bg-red-700"
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Reverting…
							</>
						) : (
							"Revert"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
