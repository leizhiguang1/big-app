"use client";

import { HandMetal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { EmployeePicker } from "@/components/employees/EmployeePicker";
import {
	createLineItemIncentiveAction,
	deleteLineItemIncentiveAction,
} from "@/lib/actions/appointments";
import type {
	AppointmentLineItem,
	IncentiveWithEmployee,
} from "@/lib/services/appointment-line-items";
import type { EmployeeWithRelations } from "@/lib/services/employees";

type Props = {
	appointmentId: string;
	lineItems: AppointmentLineItem[];
	incentives: IncentiveWithEmployee[];
	allEmployees: EmployeeWithRelations[];
	onToast: (message: string, variant?: Toast["variant"]) => void;
};

export function HandsOnIncentivesCard({
	appointmentId,
	lineItems,
	incentives,
	allEmployees,
	onToast,
}: Props) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	const serviceLines = lineItems.filter((i) => i.item_type === "service");

	const handleChange = (
		lineItemId: string,
		currentIncentiveId: string | null,
		nextEmployeeId: string | null,
	) => {
		startTransition(async () => {
			try {
				if (currentIncentiveId) {
					await deleteLineItemIncentiveAction(
						appointmentId,
						currentIncentiveId,
					);
				}
				if (nextEmployeeId) {
					await createLineItemIncentiveAction(appointmentId, {
						line_item_id: lineItemId,
						employee_id: nextEmployeeId,
					});
					onToast("Employee attributed", "success");
				} else {
					onToast("Attribution cleared", "success");
				}
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Failed to update attribution",
					"error",
				);
			}
		});
	};

	return (
		<div className="flex flex-col gap-2 rounded-xl border bg-card p-2.5 text-[11px] shadow-sm">
			<div className="flex items-center gap-1.5 font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
				<HandMetal className="size-3" />
				Hands-on incentives
			</div>

			{serviceLines.length === 0 ? (
				<div className="py-3 text-center text-[10px] text-muted-foreground italic">
					Add services in the Billing tab first
				</div>
			) : (
				<div className="flex flex-col divide-y divide-border/60">
					{serviceLines.map((line) => {
						const current =
							incentives.find((i) => i.line_item_id === line.id) ?? null;
						return (
							<div
								key={line.id}
								className="flex flex-wrap items-center justify-between gap-2 py-1.5"
							>
								<div className="min-w-0 flex-1 truncate font-medium text-[11px]">
									{line.description}
								</div>
								<EmployeePicker
									employees={allEmployees}
									value={current?.employee_id ?? null}
									onChange={(nextId) =>
										handleChange(line.id, current?.id ?? null, nextId)
									}
									placeholder="Pick employee"
									title={`Attribute employee for ${line.description}`}
									description="Choose which staff member performed this service."
									size="sm"
									disabled={pending}
									highlightEmpty={!current}
								/>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
