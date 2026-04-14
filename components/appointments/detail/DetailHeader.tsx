"use client";

import {
	ArrowLeft,
	ChevronDown,
	ChevronUp,
	Pencil,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAppointmentAction } from "@/lib/actions/appointments";
import type { AppointmentWithRelations } from "@/lib/services/appointments";

type Props = {
	appointment: AppointmentWithRelations;
	onEdit: () => void;
	onToast: (message: string, variant?: Toast["variant"]) => void;
	summaryCollapsed?: boolean;
	onToggleSummaryCollapse?: () => void;
};

function appointmentLabel(a: AppointmentWithRelations): string {
	if (a.is_time_block) return a.block_title || "Time block";
	if (a.customer)
		return `${a.customer.first_name} ${a.customer.last_name ?? ""}`.trim();
	return a.lead_name ?? "Walk-in";
}

export function DetailHeader({
	appointment,
	onEdit,
	onToast,
	summaryCollapsed = false,
	onToggleSummaryCollapse,
}: Props) {
	const router = useRouter();
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [pending, startTransition] = useTransition();

	const handleBack = () => {
		if (window.history.length > 1) router.back();
		else router.push("/appointments");
	};

	const handleDelete = () => {
		startTransition(async () => {
			try {
				await deleteAppointmentAction(appointment.id);
				router.push("/appointments");
			} catch (err) {
				onToast(err instanceof Error ? err.message : "Delete failed", "error");
				setDeleteOpen(false);
			}
		});
	};

	const label = appointmentLabel(appointment);

	return (
		<>
			<div className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleBack}
						className="shrink-0 gap-1"
					>
						<ArrowLeft className="size-4" />
						Back
					</Button>
					<div className="flex min-w-0 items-center gap-1">
						<div className="min-w-0">
							<div className="truncate text-lg font-semibold leading-tight">
								{label}
							</div>
							<div className="text-muted-foreground text-xs tabular-nums">
								{appointment.booking_ref}
							</div>
						</div>
						{onToggleSummaryCollapse && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
								onClick={onToggleSummaryCollapse}
								title={summaryCollapsed ? "Expand" : "Collapse"}
								aria-label={
									summaryCollapsed
										? "Expand customer and appointment summary"
										: "Collapse customer and appointment summary"
								}
							>
								{summaryCollapsed ? (
									<ChevronDown className="size-4" />
								) : (
									<ChevronUp className="size-4" />
								)}
							</Button>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onEdit}
						className="gap-1"
					>
						<Pencil className="size-4" />
						Edit
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setDeleteOpen(true)}
						className="gap-1 text-red-600 hover:text-red-700"
					>
						<Trash2 className="size-4" />
						Delete
					</Button>
				</div>
			</div>

			<ConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={`Delete ${label}?`}
				description="This removes the appointment permanently. Billing entries attached to it will also be deleted."
				confirmLabel="Delete"
				pending={pending}
				onConfirm={handleDelete}
			/>
		</>
	);
}
