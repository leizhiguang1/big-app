"use client";

import {
	Ban,
	Check,
	ListOrdered,
	Loader2,
	Pencil,
	Plus,
	Ticket,
	Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CollectPaymentDialog } from "@/components/appointments/detail/CollectPaymentDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	markAppointmentCompletedAction,
	revertCompletedAppointmentAction,
} from "@/lib/actions/appointments";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";
import { cn } from "@/lib/utils";

type Props = {
	appointment: AppointmentWithRelations;
	lineItems: AppointmentLineItem[];
	services: ServiceWithCategory[];
	taxes: Tax[];
	onToast?: (
		message: string,
		variant?: "default" | "success" | "error",
	) => void;
};

const baseBtn =
	"flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

// Mark Complete branches on line items + payment state. See
// docs/modules/02-appointments.md §Complete appointment workflow.
type CompletionPath = "direct" | "collect-payment";

function pickCompletionPath(
	appointment: AppointmentWithRelations,
	lineItems: AppointmentLineItem[],
): CompletionPath {
	if (lineItems.length === 0) return "direct";
	if (appointment.payment_status === "paid") return "direct";
	return "collect-payment";
}

export function FloatingActionBar({
	appointment,
	lineItems,
	services,
	taxes,
	onToast,
}: Props) {
	const router = useRouter();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [collectOpen, setCollectOpen] = useState(false);
	const [revertOpen, setRevertOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	const isCompleted = appointment.status === "completed";
	const path = pickCompletionPath(appointment, lineItems);

	const handleCompleteConfirm = () => {
		setConfirmOpen(false);
		if (path === "collect-payment") {
			setCollectOpen(true);
			return;
		}
		startTransition(async () => {
			try {
				await markAppointmentCompletedAction(appointment.id);
				onToast?.("Appointment marked completed", "success");
				router.refresh();
			} catch (e) {
				const message = e instanceof Error ? e.message : "Failed to complete";
				onToast?.(message, "error");
			}
		});
	};

	const handleRevertConfirm = () => {
		setRevertOpen(false);
		startTransition(async () => {
			try {
				await revertCompletedAppointmentAction(appointment.id);
				onToast?.("Appointment reverted to pending", "success");
				router.refresh();
			} catch (e) {
				const message = e instanceof Error ? e.message : "Failed to revert";
				onToast?.(message, "error");
			}
		});
	};

	return (
		<>
			<div className="pointer-events-none fixed right-4 bottom-4 z-40 flex items-center gap-2">
				{isCompleted ? (
					<>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="Schedule next appointment for this customer"
									className={cn(
										baseBtn,
										"pointer-events-auto bg-green-600 text-white",
									)}
								>
									<Plus className="size-5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">
								Schedule next appointment
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="Revert to pending"
									onClick={() => setRevertOpen(true)}
									disabled={isPending}
									className={cn(
										baseBtn,
										"pointer-events-auto bg-slate-500 text-white",
									)}
								>
									{isPending ? (
										<Loader2 className="size-5 animate-spin" />
									) : (
										<Undo2 className="size-5" />
									)}
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">Revert to pending</TooltipContent>
						</Tooltip>
					</>
				) : (
					<>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="Print queue ticket"
									className={cn(
										baseBtn,
										"pointer-events-auto border border-blue-300 bg-white text-blue-700",
									)}
								>
									<Ticket className="size-5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">Print queue ticket</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="Create new appointment for this customer"
									className={cn(
										baseBtn,
										"pointer-events-auto bg-green-600 text-white",
									)}
								>
									<Plus className="size-5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">New appointment</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="Cancel appointment"
									className={cn(
										baseBtn,
										"pointer-events-auto bg-red-600 text-white",
									)}
								>
									<Ban className="size-5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">Cancel appointment</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="Add to queue"
									className={cn(
										baseBtn,
										"pointer-events-auto bg-sky-600 text-white",
									)}
								>
									<ListOrdered className="size-5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">Add to queue</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="Edit appointment"
									className={cn(
										baseBtn,
										"pointer-events-auto bg-amber-400 text-white",
									)}
								>
									<Pencil className="size-5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">Edit appointment</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="Complete appointment"
									onClick={() => setConfirmOpen(true)}
									disabled={isPending}
									className={cn(
										baseBtn,
										"pointer-events-auto bg-emerald-600 text-white",
									)}
								>
									{isPending ? (
										<Loader2 className="size-5 animate-spin" />
									) : (
										<Check className="size-5" />
									)}
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">Complete appointment</TooltipContent>
						</Tooltip>
					</>
				)}
			</div>

			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Complete appointment?"
				description={
					path === "collect-payment"
						? "There are billing items on this appointment. You'll collect payment next."
						: lineItems.length === 0
							? "No billing items on this appointment. It will be marked complete directly."
							: "This appointment is already paid. It will be marked complete directly."
				}
				confirmLabel="Proceed"
				cancelLabel="Cancel"
				variant="default"
				onConfirm={handleCompleteConfirm}
			/>

			<ConfirmDialog
				open={revertOpen}
				onOpenChange={setRevertOpen}
				title="Revert appointment?"
				description="This will reopen the appointment for edits. Payment, sales order, and inventory movements are not affected — revert is about unlocking the chart, not refunding."
				confirmLabel="Revert"
				cancelLabel="Cancel"
				variant="default"
				onConfirm={handleRevertConfirm}
			/>

			<CollectPaymentDialog
				open={collectOpen}
				onOpenChange={setCollectOpen}
				appointment={appointment}
				entries={lineItems}
				services={services}
				taxes={taxes}
				onSuccess={(r) =>
					onToast?.(
						`Payment collected · ${r.so_number} / ${r.invoice_no}`,
						"success",
					)
				}
				onError={(m) => onToast?.(m, "error")}
			/>
		</>
	);
}
