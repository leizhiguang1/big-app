"use client";

import { Check, RotateCcw, Wallet } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	collectAppointmentPaymentAction,
	setAppointmentPaymentRemarkAction,
	undoAppointmentPaymentAction,
} from "@/lib/actions/appointments";
import {
	APPOINTMENT_PAYMENT_MODE_LABEL,
	APPOINTMENT_PAYMENT_MODES,
	type AppointmentPaymentMode,
	PAYMENT_STATUS_LABEL,
	type PaymentStatus,
} from "@/lib/constants/appointment-status";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";

type Props = {
	appointment: AppointmentWithRelations;
	billingTotal: number;
	onToast: (message: string, variant?: Toast["variant"]) => void;
};

function formatMoney(n: number): string {
	return `RM ${n.toFixed(2)}`;
}

const PAYMENT_STATUS_STYLE: Record<PaymentStatus, string> = {
	unpaid: "bg-red-50 text-red-700 ring-red-200",
	partial: "bg-yellow-50 text-yellow-800 ring-yellow-200",
	paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function PaymentSection({ appointment, billingTotal, onToast }: Props) {
	const paymentStatus =
		(appointment.payment_status as PaymentStatus) ?? "unpaid";
	const isPaid = paymentStatus === "paid";
	const isBlock = appointment.is_time_block;
	const hasCustomer = !!appointment.customer_id;

	const [mode, setMode] = useState<AppointmentPaymentMode>(
		(appointment.paid_via as AppointmentPaymentMode | null) ??
			APPOINTMENT_PAYMENT_MODES[0],
	);
	const [undoOpen, setUndoOpen] = useState(false);
	const [remark, setRemark] = useState(appointment.payment_remark ?? "");
	const [remarkStatus, setRemarkStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);
	const [pending, startTransition] = useTransition();
	const debounceRef = useRef<number | null>(null);
	const lastSavedRemark = useRef(appointment.payment_remark ?? "");

	useEffect(() => {
		setRemark(appointment.payment_remark ?? "");
		lastSavedRemark.current = appointment.payment_remark ?? "";
	}, [appointment.payment_remark]);

	useEffect(() => {
		if (remark === lastSavedRemark.current) return;
		if (debounceRef.current) window.clearTimeout(debounceRef.current);
		setRemarkStatus("saving");
		debounceRef.current = window.setTimeout(() => {
			const payload = remark.trim() === "" ? null : remark.trim();
			setAppointmentPaymentRemarkAction(appointment.id, payload)
				.then(() => {
					lastSavedRemark.current = remark;
					setRemarkStatus("saved");
					window.setTimeout(() => setRemarkStatus("idle"), 1500);
				})
				.catch((err) => {
					setRemarkStatus("idle");
					onToast(
						err instanceof Error ? err.message : "Could not save remark",
						"error",
					);
				});
		}, 500);
		return () => {
			if (debounceRef.current) window.clearTimeout(debounceRef.current);
		};
	}, [remark, appointment.id, onToast]);

	const handleCollect = () => {
		startTransition(async () => {
			try {
				await collectAppointmentPaymentAction(appointment.id, mode);
				onToast(
					`Payment collected via ${APPOINTMENT_PAYMENT_MODE_LABEL[mode]}`,
					"success",
				);
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not collect payment",
					"error",
				);
			}
		});
	};

	const handleUndo = () => {
		startTransition(async () => {
			try {
				await undoAppointmentPaymentAction(appointment.id);
				onToast("Payment undone", "success");
				setUndoOpen(false);
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not undo payment",
					"error",
				);
			}
		});
	};

	if (isBlock) return null;

	const disabledReason = !hasCustomer
		? "Link a customer before collecting payment"
		: billingTotal === 0
			? "Add billing entries before collecting payment"
			: null;

	return (
		<div className="rounded-md border bg-card p-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
					<Wallet className="size-3.5" />
					Payment
				</div>
				<span
					className={cn(
						"rounded-full px-2.5 py-0.5 font-medium text-xs ring-1",
						PAYMENT_STATUS_STYLE[paymentStatus],
					)}
				>
					{PAYMENT_STATUS_LABEL[paymentStatus]}
				</span>
			</div>

			<div className="mt-3 flex items-baseline justify-between border-b pb-3">
				<div className="text-muted-foreground text-xs uppercase tracking-wide">
					Total
				</div>
				<div className="font-semibold text-xl tabular-nums">
					{formatMoney(billingTotal)}
				</div>
			</div>

			{isPaid ? (
				<div className="mt-3 flex items-center justify-between gap-3">
					<div className="text-sm">
						Paid via{" "}
						<span className="font-medium">
							{appointment.paid_via
								? (APPOINTMENT_PAYMENT_MODE_LABEL[
										appointment.paid_via as AppointmentPaymentMode
									] ?? appointment.paid_via)
								: "—"}
						</span>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setUndoOpen(true)}
						disabled={pending}
						className="gap-1"
					>
						<RotateCcw className="size-3.5" />
						Undo
					</Button>
				</div>
			) : (
				<div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
					<select
						value={mode}
						onChange={(e) => setMode(e.target.value as AppointmentPaymentMode)}
						disabled={pending || !!disabledReason}
						className="h-9 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					>
						{APPOINTMENT_PAYMENT_MODES.map((m) => (
							<option key={m} value={m}>
								{APPOINTMENT_PAYMENT_MODE_LABEL[m]}
							</option>
						))}
					</select>
					<Button
						type="button"
						size="sm"
						onClick={handleCollect}
						disabled={pending || !!disabledReason}
						title={disabledReason ?? undefined}
						className="gap-1"
					>
						<Check className="size-3.5" />
						Collect payment
					</Button>
				</div>
			)}

			{disabledReason && !isPaid && (
				<div className="mt-2 text-muted-foreground text-xs italic">
					{disabledReason}
				</div>
			)}

			<div className="mt-4">
				<div className="flex items-center justify-between">
					<label
						htmlFor="payment-remark"
						className="text-[10px] text-muted-foreground uppercase tracking-wide"
					>
						Payment remark
					</label>
					{remarkStatus === "saving" && (
						<span className="text-[10px] text-muted-foreground">Saving…</span>
					)}
					{remarkStatus === "saved" && (
						<span className="text-[10px] text-emerald-600">Saved</span>
					)}
				</div>
				<textarea
					id="payment-remark"
					value={remark}
					onChange={(e) => setRemark(e.target.value)}
					rows={2}
					placeholder="Transaction ID, card reference, partial notes…"
					className="mt-1 w-full resize-none rounded-md border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
				/>
			</div>

			<ConfirmDialog
				open={undoOpen}
				onOpenChange={setUndoOpen}
				title="Undo payment?"
				description="This reverts the appointment to unpaid. Any sales order linked later will need to be re-collected."
				confirmLabel="Undo payment"
				variant="destructive"
				pending={pending}
				onConfirm={handleUndo}
			/>
		</div>
	);
}
