"use client";

import { HandMetal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
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

function employeeLabel(e: {
	first_name: string;
	last_name: string | null;
}): string {
	return `${e.first_name} ${e.last_name ?? ""}`.trim();
}

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

	const handleAdd = (lineItemId: string, employeeId: string) => {
		if (!employeeId) return;
		startTransition(async () => {
			try {
				await createLineItemIncentiveAction(appointmentId, {
					line_item_id: lineItemId,
					employee_id: employeeId,
				});
				onToast("Employee attributed", "success");
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Failed to attribute employee",
					"error",
				);
			}
		});
	};

	const handleDelete = (id: string) => {
		startTransition(async () => {
			try {
				await deleteLineItemIncentiveAction(appointmentId, id);
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Failed to remove attribution",
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
						const lineIncentives = incentives.filter(
							(i) => i.line_item_id === line.id,
						);
						const attributedIds = new Set(
							lineIncentives.map((i) => i.employee_id),
						);
						const available = allEmployees.filter(
							(e) => !attributedIds.has(e.id),
						);
						const isEmpty = lineIncentives.length === 0;
						return (
							<div key={line.id} className="flex flex-col gap-1 py-1.5">
								<div className="truncate font-medium text-[11px]">
									{line.description}
								</div>

								<div className="flex flex-wrap items-center gap-1">
									{lineIncentives.map((i) => (
										<span
											key={i.id}
											className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700"
										>
											{i.employee ? employeeLabel(i.employee) : "Unknown"}
											<button
												type="button"
												onClick={() => handleDelete(i.id)}
												disabled={pending}
												aria-label="Remove attribution"
												className="text-blue-400 transition hover:text-blue-700"
											>
												<X className="size-3" />
											</button>
										</span>
									))}

									{available.length > 0 && (
										<select
											key={`add-${line.id}-${lineIncentives.length}`}
											className={`h-6 rounded border border-input bg-background px-1.5 text-[10px] outline-none focus-visible:border-ring ${
												isEmpty
													? "border-amber-300 text-amber-700"
													: "text-muted-foreground"
											}`}
											defaultValue=""
											disabled={pending}
											onChange={(e) => handleAdd(line.id, e.target.value)}
										>
											<option value="" disabled>
												{isEmpty ? "Pick employee…" : "+ add another…"}
											</option>
											{available.map((e) => (
												<option key={e.id} value={e.id}>
													{employeeLabel(e)}
													{e.position?.name ? ` · ${e.position.name}` : ""}
												</option>
											))}
										</select>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
