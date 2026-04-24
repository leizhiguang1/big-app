"use client";

import { Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { EmployeePicker } from "@/components/employees/EmployeePicker";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { PercentInput } from "@/components/ui/numeric-input";
import { replaceSaleItemIncentivesAction } from "@/lib/actions/sales";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import { cn } from "@/lib/utils";

type Slot = { employeeId: string; percent: number };

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	salesOrderId: string;
	appointmentRef?: string | null;
	saleItemId: string;
	itemName: string;
	initialSlots: Slot[];
	employees: EmployeeWithRelations[];
	onSuccess?: (message: string) => void;
	onError?: (message: string) => void;
};

const EMPTY_SLOT: Slot = { employeeId: "", percent: 0 };

function padToThree(slots: Slot[]): Slot[] {
	const out: Slot[] = [];
	for (let i = 0; i < 3; i++) out.push(slots[i] ?? { ...EMPTY_SLOT });
	return out;
}

export function SaleItemEmployeeAllocationDialog({
	open,
	onOpenChange,
	salesOrderId,
	appointmentRef,
	saleItemId,
	itemName,
	initialSlots,
	employees,
	onSuccess,
	onError,
}: Props) {
	const router = useRouter();
	const [slots, setSlots] = useState<Slot[]>(() => padToThree(initialSlots));
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!open) return;
		setSlots(padToThree(initialSlots));
		setSubmitError(null);
	}, [open, initialSlots]);

	const setEmployee = (idx: number, id: string | null) => {
		setSlots((prev) =>
			prev.map((s, i) => (i === idx ? { ...s, employeeId: id ?? "" } : s)),
		);
	};

	const setPercent = (idx: number, pct: number) => {
		setSlots((prev) =>
			prev.map((s, i) => (i === idx ? { ...s, percent: pct } : s)),
		);
	};

	const balance = () => {
		setSlots((prev) => {
			const filledIdx = prev.findIndex((s) => s.employeeId);
			if (filledIdx === -1) return prev;
			const sum = prev
				.filter((s) => s.employeeId)
				.reduce((s, a) => s + (a.percent || 0), 0);
			const delta = 100 - sum;
			return prev.map((s, i) =>
				i === filledIdx
					? {
							...s,
							percent: Math.max(0, Math.min(100, (s.percent || 0) + delta)),
						}
					: s,
			);
		});
	};

	const filled = slots.filter((s) => s.employeeId);
	const percentSum = filled.reduce((s, a) => s + (a.percent || 0), 0);
	const percentInvalid = filled.length > 0 && Math.abs(percentSum - 100) > 0.01;
	const duplicates =
		new Set(filled.map((s) => s.employeeId)).size !== filled.length;

	const canSubmit = !isPending && !percentInvalid && !duplicates;

	const submit = () => {
		if (!canSubmit) return;
		setSubmitError(null);
		const employeesPayload = filled.map((s) => ({
			employee_id: s.employeeId,
			percent: s.percent,
		}));
		startTransition(async () => {
			try {
				await replaceSaleItemIncentivesAction(
					salesOrderId,
					{
						sale_item_id: saleItemId,
						employees: employeesPayload,
					},
					appointmentRef,
				);
				onOpenChange(false);
				onSuccess?.(
					employeesPayload.length === 0
						? `Cleared allocation for ${itemName}`
						: `Updated allocation for ${itemName}`,
				);
				router.refresh();
			} catch (e) {
				const msg =
					e instanceof Error ? e.message : "Failed to save allocation";
				setSubmitError(msg);
				onError?.(msg);
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				preventOutsideClose
				className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg flex-col gap-0 p-0 sm:max-w-lg"
			>
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle className="flex items-center gap-2 font-semibold">
						<Users className="size-4" />
						Sales order allocation
					</DialogTitle>
					<DialogDescription className="text-xs">
						{itemName} · up to 3 employees, total must equal 100%.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
					{submitError && (
						<div
							role="alert"
							className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 text-sm"
						>
							{submitError}
						</div>
					)}

					<div className="space-y-3">
						{slots.map((slot, idx) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed 3-slot UI
								key={`slot-${idx}`}
								className="flex items-center gap-3"
							>
								<div className="w-6 text-muted-foreground text-xs">
									{idx + 1}
								</div>
								<EmployeePicker
									employees={employees}
									value={slot.employeeId || null}
									onChange={(id) => setEmployee(idx, id)}
									placeholder={`Employee ${idx + 1}`}
									size="md"
									className="min-w-0 flex-1"
								/>
								<div className="flex items-center gap-1">
									<PercentInput
										value={slot.percent}
										onChange={(n) => setPercent(idx, n)}
										className={cn(
											"h-8 w-20 px-2 text-center text-xs tabular-nums",
											!slot.employeeId && "opacity-50",
										)}
										aria-label={`Employee ${idx + 1} percent`}
										disabled={!slot.employeeId}
									/>
									<span className="text-muted-foreground text-xs">%</span>
								</div>
							</div>
						))}
					</div>

					<div className="flex items-center justify-between border-t pt-3 text-xs">
						<div className="flex items-center gap-2 tabular-nums">
							<span
								className={cn(
									"font-medium",
									percentInvalid ? "text-red-600" : "text-emerald-700",
								)}
							>
								{filled.length === 0 ? "—" : `${percentSum.toFixed(0)}%`}
							</span>
							{percentInvalid && (
								<button
									type="button"
									onClick={balance}
									className="text-blue-600 hover:underline"
								>
									Balance
								</button>
							)}
						</div>
						{duplicates && (
							<span className="text-red-600">Duplicate employee selected</span>
						)}
					</div>

					<p className="text-muted-foreground text-[11px]">
						Leave all slots empty and save to clear the allocation for this
						line.
					</p>
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
					<Button type="button" onClick={submit} disabled={!canSubmit}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Saving…
							</>
						) : (
							"Save"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
