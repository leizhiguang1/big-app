"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cancelSalesOrderAction } from "@/lib/actions/sales";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	salesOrderId: string;
	soNumber: string;
	onSuccess?: (cnNumber: string) => void;
	onError?: (message: string) => void;
};

export function CancelOrderDialog({
	open,
	onOpenChange,
	salesOrderId,
	soNumber,
	onSuccess,
	onError,
}: Props) {
	const router = useRouter();
	const [reason, setReason] = useState("");
	const [passcode, setPasscode] = useState("");
	const [isPending, startTransition] = useTransition();

	const canSubmit = reason.trim().length > 0 && /^\d{4}$/.test(passcode);

	const handleCancel = () => {
		if (!canSubmit) return;
		startTransition(async () => {
			try {
				const result = await cancelSalesOrderAction(salesOrderId, {
					reason: reason.trim(),
					passcode,
				});
				onOpenChange(false);
				setReason("");
				setPasscode("");
				onSuccess?.(result.cnNumber);
				router.refresh();
			} catch (e) {
				const msg =
					e instanceof Error ? e.message : "Failed to cancel sales order";
				onError?.(msg);
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex flex-col gap-0 p-0 sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Cancel sales order?</DialogTitle>
					<DialogDescription>
						This will create a cancellation record (CN) for{" "}
						<span className="font-mono font-medium">{soNumber}</span> and mark
						the order as cancelled. This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 px-6 py-4">
					<div>
						<label htmlFor="cancel-reason" className="text-sm font-medium">
							Reason <span className="text-red-500">*</span>
						</label>
						<textarea
							id="cancel-reason"
							placeholder="Reason for cancellation…"
							value={reason}
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
								setReason(e.target.value)
							}
							rows={3}
							className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
							disabled={isPending}
						/>
					</div>
					<div>
						<label htmlFor="cancel-passcode" className="text-sm font-medium">
							Passcode <span className="text-red-500">*</span>
						</label>
						<input
							id="cancel-passcode"
							type="text"
							inputMode="numeric"
							pattern="\d{4}"
							maxLength={4}
							autoComplete="off"
							placeholder="4-digit code"
							value={passcode}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setPasscode(e.target.value.replace(/\D/g, ""))
							}
							className="mt-1.5 w-32 rounded-md border bg-background px-3 py-2 text-center font-mono text-base tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
							disabled={isPending}
						/>
						<p className="mt-1.5 text-xs text-muted-foreground">
							Ask a manager to generate a passcode under{" "}
							<span className="font-medium">
								[VOID/REVERT] Sales Order/Invoice
							</span>{" "}
							on the Passcode screen.
						</p>
					</div>
				</div>
				<DialogFooter className="border-t">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Keep order
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={handleCancel}
						disabled={isPending || !canSubmit}
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Cancelling…
							</>
						) : (
							"Cancel order"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
