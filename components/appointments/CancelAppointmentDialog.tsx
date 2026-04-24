"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
	const [reasonCode, setReasonCode] = useState<string>("");
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!open) return;
		setReasonCode("");
		setSubmitError(null);
		listActiveBrandConfigItemsAction("reason.appointment_cancel")
			.then((items) => setPresets(items))
			.catch(() => setPresets([]));
	}, [open]);

	const selected = presets.find((p) => p.code === reasonCode);
	const canSubmit = !!selected && !isPending;

	const submit = () => {
		if (!canSubmit || !selected) return;
		setSubmitError(null);
		startTransition(async () => {
			try {
				await cancelAppointmentAction(appointmentId, selected.label);
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
			<DialogContent
				preventOutsideClose
				className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-md flex-col gap-0 p-0 sm:max-w-md"
			>
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle className="font-semibold text-red-700">
						Cancel appointment{bookingRef ? ` ${bookingRef}` : ""}?
					</DialogTitle>
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
					<Select
						value={reasonCode}
						onValueChange={setReasonCode}
						disabled={isPending || presets.length === 0}
					>
						<SelectTrigger id="cancel-reason" className="mt-1.5 w-full">
							<SelectValue
								placeholder={
									presets.length === 0
										? "No reasons configured"
										: "Select a reason"
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{presets.map((p) => (
								<SelectItem key={p.code} value={p.code}>
									{p.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
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
