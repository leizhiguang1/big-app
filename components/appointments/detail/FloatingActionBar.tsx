"use client";

import { Ban, Check, ListOrdered, Pencil, Plus, Ticket } from "lucide-react";
import { useState } from "react";
import { CollectPaymentDialog } from "@/components/appointments/detail/CollectPaymentDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { BillingEntry } from "@/lib/services/billing-entries";
import { cn } from "@/lib/utils";

type Props = {
	appointment: AppointmentWithRelations;
	billingEntries: BillingEntry[];
	onToast?: (
		message: string,
		variant?: "default" | "success" | "error",
	) => void;
};

const baseBtn =
	"flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

export function FloatingActionBar({
	appointment,
	billingEntries,
	onToast,
}: Props) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [collectOpen, setCollectOpen] = useState(false);

	const handleProceed = () => {
		setConfirmOpen(false);
		setCollectOpen(true);
	};

	return (
		<>
			<div className="pointer-events-none fixed right-4 bottom-4 z-40 flex items-center gap-2">
				<button
					type="button"
					title="Print queue ticket"
					className={cn(
						baseBtn,
						"pointer-events-auto border border-blue-300 bg-white text-blue-700",
					)}
				>
					<Ticket className="size-5" />
				</button>

				<button
					type="button"
					title="Create new appointment for this customer"
					className={cn(baseBtn, "pointer-events-auto bg-green-600 text-white")}
				>
					<Plus className="size-5" />
				</button>

				<button
					type="button"
					title="Cancel appointment"
					className={cn(baseBtn, "pointer-events-auto bg-red-600 text-white")}
				>
					<Ban className="size-5" />
				</button>

				<button
					type="button"
					title="Add to queue"
					className={cn(baseBtn, "pointer-events-auto bg-sky-600 text-white")}
				>
					<ListOrdered className="size-5" />
				</button>

				<button
					type="button"
					title="Edit appointment"
					className={cn(baseBtn, "pointer-events-auto bg-amber-400 text-white")}
				>
					<Pencil className="size-5" />
				</button>

				<button
					type="button"
					title="Complete appointment"
					onClick={() => setConfirmOpen(true)}
					className={cn(
						baseBtn,
						"pointer-events-auto bg-emerald-600 text-white",
					)}
				>
					<Check className="size-5" />
				</button>
			</div>

			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Complete appointment?"
				description="Are you sure you would like to complete the selected appointment?"
				confirmLabel="Proceed"
				cancelLabel="Cancel"
				variant="default"
				onConfirm={handleProceed}
			/>

			<CollectPaymentDialog
				open={collectOpen}
				onOpenChange={setCollectOpen}
				appointment={appointment}
				entries={billingEntries}
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
