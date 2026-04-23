"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listActiveBrandConfigItemsAction } from "@/lib/actions/brand-config";
import { cancelAppointmentAction } from "@/lib/actions/appointments";
import type { BrandConfigItem } from "@/lib/services/brand-config";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appointmentId: string;
	bookingRef?: string;
	onSuccess?: () => void;
	onError?: (message: string) => void;
	onReschedule?: () => void;
};

export function CancelAppointmentDialog({
	open,
	onOpenChange,
	appointmentId,
	bookingRef,
	onSuccess,
	onError,
	onReschedule,
}: Props) {
	const router = useRouter();
	const [presets, setPresets] = useState<BrandConfigItem[]>([]);
	const [reason, setReason] = useState("");
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!open) return;
		setReason("");
		setSubmitError(null);
		listActiveBrandConfigItemsAction("reason.appointment_cancel")
			.then((items) => setPresets(items))
			.catch(() => setPresets([]));
	}, [open]);

	const trimmed = reason.trim();
	const canSubmit = trimmed.length > 0 && !isPending;

	const submit = () => {
		if (!canSubmit) return;
		setSubmitError(null);
		startTransition(async () => {
			try {
				await cancelAppointmentAction(appointmentId, trimmed);
				onOpenChange(false);
				onSuccess?.();
				router.refresh();
			} catch (e) {
				const msg =
					e instanceof Error ? e.message : "Failed to cancel appointment";
				setSubmitError(msg);
				onError?.(msg);
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-md flex-col gap-0 p-0 sm:max-w-md">
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle className="font-semibold text-red-700">
						Cancel appointment{bookingRef ? ` ${bookingRef}` : ""}?
					</DialogTitle>
					<DialogDescription className="text-xs">
						The appointment stays on the customer's timeline for audit.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto px-6 py-5">
					{submitError && (
						<div
							role="alert"
							className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 text-sm"
						>
							<AlertTriangle className="mt-0.5 size-4 shrink-0" />
							<span>{submitError}</span>
						</div>
					)}

					<Label htmlFor="cancel-reason">
						Cancellation reason <span className="text-red-500">*</span>
					</Label>
					<Textarea
						id="cancel-reason"
						className="mt-1.5"
						placeholder="e.g. Customer rescheduled to next week"
						rows={3}
						maxLength={200}
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						disabled={isPending}
						autoFocus
					/>

					{presets.length > 0 && (
						<div className="mt-3 flex flex-col gap-1.5">
							<span className="text-[11px] text-muted-foreground uppercase tracking-wide">
								Quick pick
							</span>
							<div className="flex flex-wrap gap-1.5">
								{presets.map((p) => (
									<button
										key={p.code}
										type="button"
										onClick={() => setReason(p.label)}
										disabled={isPending}
										className="rounded-full border bg-background px-2.5 py-1 text-[11px] hover:bg-muted disabled:opacity-60"
									>
										{p.label}
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				<DialogFooter className="gap-2 border-t px-6 py-3">
					{onReschedule && (
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								onOpenChange(false);
								onReschedule();
							}}
							disabled={isPending}
						>
							Reschedule instead
						</Button>
					)}
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Back
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={submit}
						disabled={!canSubmit}
					>
						{isPending ? (
							<>
								<Loader2 className="size-3.5 animate-spin" />
								Cancelling…
							</>
						) : (
							"Cancel appointment"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
