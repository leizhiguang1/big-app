"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RawNumericInput } from "@/components/ui/numeric-input";
import { updatePaymentAllocationsAction } from "@/lib/actions/sales";
import type {
	PaymentAllocationForOrder,
	PaymentWithProcessedBy,
	SaleItem,
} from "@/lib/services/sales";
import { cn } from "@/lib/utils";

type Props = {
	salesOrderId: string;
	appointmentRef?: string | null;
	items: SaleItem[];
	payments: PaymentWithProcessedBy[];
	allocations: PaymentAllocationForOrder[];
	onCancel: () => void;
	onSuccess?: (message: string) => void;
	onError?: (message: string) => void;
};

function money(n: number): string {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function keyFor(paymentId: string, saleItemId: string) {
	return `${paymentId}::${saleItemId}`;
}

function parseAmount(raw: string | undefined): number {
	if (!raw) return 0;
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

export function ReallocatePaymentsEditor({
	salesOrderId,
	appointmentRef,
	items,
	payments,
	allocations,
	onCancel,
	onSuccess,
	onError,
}: Props) {
	const router = useRouter();
	const [grid, setGrid] = useState<Record<string, string>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		const next: Record<string, string> = {};
		for (const a of allocations) {
			next[keyFor(a.payment_id, a.sale_item_id)] = String(a.amount);
		}
		setGrid(next);
		setSubmitError(null);
	}, [allocations]);

	const set = (paymentId: string, saleItemId: string, raw: string) => {
		setGrid((prev) => ({ ...prev, [keyFor(paymentId, saleItemId)]: raw }));
	};

	const paymentSums = useMemo(() => {
		const out: Record<string, number> = {};
		for (const p of payments) out[p.id] = 0;
		for (const item of items) {
			for (const p of payments) {
				out[p.id] += parseAmount(grid[keyFor(p.id, item.id)]);
			}
		}
		return out;
	}, [grid, payments, items]);

	const itemSums = useMemo(() => {
		const out: Record<string, number> = {};
		for (const item of items) out[item.id] = 0;
		for (const p of payments) {
			for (const item of items) {
				out[item.id] += parseAmount(grid[keyFor(p.id, item.id)]);
			}
		}
		return out;
	}, [grid, payments, items]);

	const paymentsOk = payments.every(
		(p) => Math.abs(paymentSums[p.id] - Number(p.amount)) < 0.01,
	);
	const itemsOk = items.every(
		(i) => itemSums[i.id] - Number(i.total ?? 0) < 0.01,
	);
	const canSubmit = !isPending && paymentsOk && itemsOk;

	const submit = () => {
		if (!canSubmit) return;
		setSubmitError(null);
		const payload: {
			payment_id: string;
			sale_item_id: string;
			amount: number;
		}[] = [];
		for (const p of payments) {
			for (const item of items) {
				const amt = parseAmount(grid[keyFor(p.id, item.id)]);
				if (amt > 0) {
					payload.push({
						payment_id: p.id,
						sale_item_id: item.id,
						amount: Math.round(amt * 100) / 100,
					});
				}
			}
		}
		startTransition(async () => {
			try {
				await updatePaymentAllocationsAction(
					salesOrderId,
					{ allocations: payload },
					appointmentRef,
				);
				onSuccess?.("Allocations saved");
				router.refresh();
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Failed to save";
				setSubmitError(msg);
				onError?.(msg);
			}
		});
	};

	if (payments.length === 0) {
		return (
			<div className="rounded-md border border-amber-200 bg-amber-50/50 p-4 text-amber-800 text-sm">
				No payments on this sales order yet — nothing to reallocate.
				<div className="mt-2">
					<Button size="sm" variant="outline" onClick={onCancel}>
						Close
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4 rounded-md border border-blue-200 bg-blue-50/40 p-4">
			{submitError && (
				<div
					role="alert"
					className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 text-sm"
				>
					{submitError}
				</div>
			)}

			<div className="overflow-x-auto">
				<table className="w-full min-w-[720px] text-sm">
					<thead>
						<tr className="border-b bg-muted/50">
							<th className="px-3 py-2 text-left font-medium text-muted-foreground">
								Line
							</th>
							<th className="px-3 py-2 text-right font-medium text-muted-foreground">
								Total
							</th>
							{payments.map((p) => (
								<th
									key={p.id}
									className="px-3 py-2 text-right font-medium text-muted-foreground"
								>
									<div className="font-mono text-xs">{p.invoice_no}</div>
									<div className="text-[10px]">
										{p.method?.name ?? p.payment_mode}
									</div>
								</th>
							))}
							<th className="px-3 py-2 text-right font-medium text-muted-foreground">
								Allocated
							</th>
						</tr>
					</thead>
					<tbody>
						{items.map((item) => {
							const sum = itemSums[item.id] ?? 0;
							const total = Number(item.total ?? 0);
							const over = sum - total > 0.01;
							return (
								<tr key={item.id} className="border-b last:border-b-0">
									<td className="px-3 py-2 font-medium">{item.item_name}</td>
									<td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
										{money(total)}
									</td>
									{payments.map((p) => {
										const k = keyFor(p.id, item.id);
										return (
											<td key={p.id} className="px-2 py-1.5 text-right">
												<RawNumericInput
													value={grid[k] ?? ""}
													onChange={(v) => set(p.id, item.id, v)}
													decimals={2}
													min={0}
													placeholder="0.00"
													className="h-8 w-24 text-right text-xs tabular-nums"
												/>
											</td>
										);
									})}
									<td
										className={cn(
											"px-3 py-2 text-right font-medium tabular-nums",
											over && "text-red-600",
										)}
									>
										{money(sum)}
									</td>
								</tr>
							);
						})}
					</tbody>
					<tfoot>
						<tr className="border-t bg-muted/30">
							<td
								className="px-3 py-2 text-xs text-muted-foreground"
								colSpan={2}
							>
								Payment total
							</td>
							{payments.map((p) => {
								const sum = paymentSums[p.id] ?? 0;
								const target = Number(p.amount);
								const mismatch = Math.abs(sum - target) > 0.01;
								return (
									<td
										key={p.id}
										className={cn(
											"px-3 py-2 text-right font-medium tabular-nums",
											mismatch ? "text-red-600" : "text-emerald-700",
										)}
									>
										<div>{money(sum)}</div>
										<div className="text-[10px] text-muted-foreground">
											of {money(target)}
										</div>
									</td>
								);
							})}
							<td className="px-3 py-2" />
						</tr>
					</tfoot>
				</table>
			</div>

			<div className="flex items-center justify-between pt-1">
				<p className="text-muted-foreground text-xs">
					Each payment's allocations must equal its amount. Per-line total
					cannot exceed the line total.
				</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onCancel}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={submit}
						disabled={!canSubmit}
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Saving…
							</>
						) : (
							"Save reallocation"
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
