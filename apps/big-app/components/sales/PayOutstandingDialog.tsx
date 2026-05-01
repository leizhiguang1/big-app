"use client";

import { Check, Info, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
	hasMissingRequiredFields,
	PaymentMethodFields,
} from "@/components/appointments/detail/collect-payment/PaymentMethodFields";
import { Toggle } from "@/components/appointments/detail/collect-payment/ui-primitives";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { listActivePaymentMethodsAction } from "@/lib/actions/payment-methods";
import { recordAdditionalPaymentAction } from "@/lib/actions/sales";
import type { PaymentMethod } from "@/lib/services/payment-methods";
import type {
	SaleItem,
	SaleItemIncentiveRow,
} from "@/lib/services/sales";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	salesOrderId: string;
	soNumber: string;
	outstanding: number;
	total: number;
	amountPaid: number;
	items: SaleItem[];
	existingPayments: unknown[];
	incentives: SaleItemIncentiveRow[];
	outletName: string | null;
	appointmentRef?: string | null;
	onSuccess?: (message: string) => void;
	onError?: (message: string) => void;
};

function money(n: number | string | null | undefined): string {
	const v = typeof n === "string" ? Number(n) : (n ?? 0);
	return Number.isFinite(v)
		? v.toLocaleString("en-MY", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})
		: "0.00";
}

function fullName(
	first: string | null | undefined,
	last: string | null | undefined,
) {
	return [first, last].filter(Boolean).join(" ").trim() || "—";
}

function usePaymentMethods() {
	const [methods, setMethods] = useState<PaymentMethod[]>([]);
	const fetchedRef = useRef(false);
	useEffect(() => {
		if (fetchedRef.current) return;
		fetchedRef.current = true;
		listActivePaymentMethodsAction()
			.then((pms) => setMethods(pms.filter((m) => m.code !== "wallet")))
			.catch(() => setMethods([]));
	}, []);
	return methods;
}

// PaymentEntry shape required by PaymentMethodFields
type PayEntry = {
	key: string;
	mode: string;
	amount: string;
	// remarks here = payment-method-specific remarks (shown by PaymentMethodFields
	// only when method.requires_remarks). NOT the general payment remarks.
	remarks: string;
	bank: string;
	card_type: string;
	trace_no: string;
	approval_code: string;
	reference_no: string;
	months: string;
};

function emptyEntry(mode: string, outstanding: number): PayEntry {
	return {
		key: "pay-outstanding",
		mode,
		amount: outstanding > 0 ? outstanding.toFixed(2) : "",
		remarks: "",
		bank: "",
		card_type: "",
		trace_no: "",
		approval_code: "",
		reference_no: "",
		months: "",
	};
}

// Distribute `amount` proportionally across items based on each item's
// outstanding balance. Each item's share is rounded to the nearest whole
// number so the UI stays clean. The last item absorbs the rounded residual.
function distributeAmount(
	amount: number,
	items: SaleItem[],
	paidRatio: number,
): Map<string, string> {
	const outstandings = items.map((item) => {
		const t = Number(item.total ?? 0);
		return Math.max(0, t - t * paidRatio);
	});
	const totalOs = outstandings.reduce((s, n) => s + n, 0);
	const result = new Map<string, string>();

	if (totalOs <= 0 || amount <= 0) {
		for (const item of items) result.set(item.id, "0");
		return result;
	}

	const cap = Math.min(amount, totalOs);
	let remaining = cap;

	for (let i = 0; i < items.length; i++) {
		const os = outstandings[i];
		let take: number;
		if (i === items.length - 1) {
			// Last item gets the rounded residual; may be up to 0.5 over its
			// outstanding due to rounding — the over-alloc guard uses 0.5 tolerance.
			take = Math.round(Math.max(0, remaining));
		} else {
			const share = totalOs > 0 ? (cap * os) / totalOs : 0;
			take = Math.round(Math.min(os, share));
			remaining -= take;
		}
		result.set(items[i].id, take.toString());
	}
	return result;
}

export function PayOutstandingDialog({
	open,
	onOpenChange,
	salesOrderId,
	soNumber,
	outstanding,
	total,
	amountPaid,
	items,
	incentives,
	outletName,
	appointmentRef,
	onSuccess,
	onError,
}: Props) {
	const allMethods = usePaymentMethods();

	const [entry, setEntry] = useState<PayEntry>(() =>
		emptyEntry("cash", outstanding),
	);
	// General payment remarks — always visible, stored separately from
	// entry.remarks which is reserved for payment-method-specific remarks
	// rendered by PaymentMethodFields (shown only when method.requires_remarks).
	const [generalRemarks, setGeneralRemarks] = useState("");
	const [backdate, setBackdate] = useState(false);
	const [backdateValue, setBackdateValue] = useState("");
	// Per-item allocation amounts (itemId → amount string)
	const [itemAllocations, setItemAllocations] = useState<Map<string, string>>(
		() => new Map(),
	);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const paidRatio = total > 0 ? amountPaid / total : 0;

	const incentivesByLine = useMemo(() => {
		const m = new Map<string, SaleItemIncentiveRow[]>();
		for (const i of incentives) {
			const arr = m.get(i.sale_item_id) ?? [];
			arr.push(i);
			m.set(i.sale_item_id, arr);
		}
		return m;
	}, [incentives]);

	// Reset form when dialog opens
	useEffect(() => {
		if (!open) return;
		const defaultMode =
			allMethods.length > 0 ? allMethods[0].code : "cash";
		const initial = emptyEntry(defaultMode, outstanding);
		setEntry(initial);
		setGeneralRemarks("");
		setBackdate(false);
		setBackdateValue("");
		setSubmitError(null);
		if (items.length > 0) {
			setItemAllocations(distributeAmount(outstanding, items, paidRatio));
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const selectedMethod = useMemo(
		() => allMethods.find((m) => m.code === entry.mode) ?? null,
		[allMethods, entry.mode],
	);

	const patch = (p: Partial<PayEntry>) =>
		setEntry((prev) => ({ ...prev, ...p }));

	const onChangeMethod = (mode: string) =>
		patch({
			mode,
			bank: "",
			card_type: "",
			trace_no: "",
			approval_code: "",
			reference_no: "",
			months: "",
		});

	// When the tendered amount changes, auto-distribute to items
	const onChangeAmount = (v: string) => {
		patch({ amount: v });
		const num = Number.parseFloat(v);
		if (Number.isFinite(num) && num > 0 && items.length > 0) {
			setItemAllocations(distributeAmount(num, items, paidRatio));
		}
	};

	const setItemAlloc = (itemId: string, val: string) =>
		setItemAllocations((prev) => new Map(prev).set(itemId, val));

	const amountNum = Number.parseFloat(entry.amount);
	const amountValid = Number.isFinite(amountNum) && amountNum > 0;
	const overpay = amountValid && amountNum > outstanding + 0.005;

	const allocNums = useMemo(
		() =>
			items.map((item) => {
				const raw = Number(itemAllocations.get(item.id) ?? "0");
				return Number.isFinite(raw) && raw > 0 ? raw : 0;
			}),
		[items, itemAllocations],
	);
	const allocSum = useMemo(
		() => allocNums.reduce((s, n) => s + n, 0),
		[allocNums],
	);
	// Tolerance of 0.5: auto-distribution rounds to whole numbers, so a per-item
	// share may land up to 0.50 above the item's exact outstanding or the total.
	const allocMismatch =
		amountValid && items.length > 0 && Math.abs(allocSum - amountNum) > 0.5;

	const itemOutstandings = useMemo(
		() =>
			items.map((item) => {
				const t = Number(item.total ?? 0);
				return Math.max(0, t - t * paidRatio);
			}),
		[items, paidRatio],
	);
	const anyItemOverAlloc = useMemo(
		() => items.some((_, i) => allocNums[i] > itemOutstandings[i] + 0.5),
		[items, allocNums, itemOutstandings],
	);

	const canSubmit =
		!isPending &&
		selectedMethod != null &&
		amountValid &&
		!overpay &&
		!allocMismatch &&
		!anyItemOverAlloc &&
		!hasMissingRequiredFields(selectedMethod, entry);

	// Backdate constraints (current month only)
	const today = new Date();
	const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
	const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

	const submit = () => {
		if (!canSubmit || !selectedMethod) return;
		setSubmitError(null);
		startTransition(async () => {
			try {
				const allocations = items
					.map((item, i) => ({
						sale_item_id: item.id,
						amount: allocNums[i],
					}))
					.filter((a) => a.amount > 0);

				const result = await recordAdditionalPaymentAction(
					salesOrderId,
					{
						amount: amountNum,
						payment_mode: selectedMethod.code,
						bank: entry.bank || null,
						card_type: entry.card_type || null,
						trace_no: entry.trace_no || null,
						approval_code: entry.approval_code || null,
						reference_no: entry.reference_no || null,
						months: entry.months ? Number.parseInt(entry.months, 10) : null,
						remarks: generalRemarks || entry.remarks || null,
						allocations: allocations.length > 0 ? allocations : null,
					},
					appointmentRef,
				);
				onOpenChange(false);
				const tail =
					result.newOutstanding > 0.005
						? `Outstanding MYR ${money(result.newOutstanding)}`
						: "Fully paid";
				onSuccess?.(
					`${result.invoiceNo} · MYR ${money(result.amount)} · ${tail}`,
				);
			} catch (e) {
				const msg =
					e instanceof Error ? e.message : "Failed to record payment";
				setSubmitError(msg);
				onError?.(msg);
			}
		});
	};

	const reset = () => {
		const defaultMode =
			allMethods.length > 0 ? allMethods[0].code : "cash";
		setEntry(emptyEntry(defaultMode, outstanding));
		setGeneralRemarks("");
		setBackdate(false);
		setBackdateValue("");
		setSubmitError(null);
		if (items.length > 0) {
			setItemAllocations(distributeAmount(outstanding, items, paidRatio));
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
				<DialogHeader className="sr-only">
					<DialogTitle>Record payment — {soNumber}</DialogTitle>
					<DialogDescription>
						Pay the outstanding balance on this sales order.
					</DialogDescription>
				</DialogHeader>

				{/* Sub-header */}
				<div className="flex items-center gap-3 border-b bg-white px-4 py-2.5 sm:px-6">
					<span className="font-mono font-semibold text-base">{soNumber}</span>
					{outletName && (
						<span className="text-muted-foreground text-xs">{outletName}</span>
					)}
				</div>

				{submitError && (
					<div
						role="alert"
						className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-red-800 text-sm sm:px-6"
					>
						{submitError}
					</div>
				)}

				{/* Body */}
				<div className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto sm:flex-row">
					{/* Left — items table with editable per-item payment amounts */}
					<div className="flex min-w-0 flex-1 flex-col bg-slate-50 p-4 sm:p-6">
						<section className="rounded-md border bg-white shadow-sm">
							{/* Table header */}
							<div className="grid grid-cols-[1fr_80px_80px_110px_110px] border-b bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
								<div>Item</div>
								<div className="text-right">Paid</div>
								<div className="text-right">Tax Paid</div>
								<div className="text-right">Outstanding</div>
								<div className="text-right">Payment</div>
							</div>

							<div className="divide-y">
								{items.map((item, idx) => {
									const itemTotal = Number(item.total ?? 0);
									const itemPaid = Math.min(itemTotal, itemTotal * paidRatio);
									const itemOutstanding = itemOutstandings[idx];
									const taxPaid = Number(item.tax_amount ?? 0) * paidRatio;
									const typeLabel =
										item.item_type === "service"
											? "SVC"
											: item.item_type === "product"
												? "PRD"
												: "CHG";
									const lineIncentives = incentivesByLine.get(item.id) ?? [];
									const overAlloc =
										allocNums[idx] > itemOutstanding + 0.005;

									return (
										<div key={item.id} className="px-4 py-3 text-sm">
											<div className="grid grid-cols-[1fr_80px_80px_110px_110px] items-start gap-x-2">
												{/* Item name */}
												<div className="flex gap-2">
													<span className="mt-1 inline-block size-2 shrink-0 rounded-full bg-emerald-500" />
													<div className="min-w-0">
														<div className="font-semibold uppercase leading-snug">
															{item.item_name}
														</div>
														<div className="text-[11px] text-rose-600">
															({typeLabel}) {item.sku ?? "—"}
														</div>
														<div className="mt-1 text-[11px] text-muted-foreground">
															Qty: {item.quantity} · Price: MYR{" "}
															{money(item.unit_price)}
														</div>
													</div>
												</div>

												{/* Paid */}
												<div className="text-right tabular-nums text-sm">
													{money(itemPaid)}
												</div>

												{/* Tax Paid */}
												<div className="text-right tabular-nums text-sm">
													<div>—</div>
													<div className="text-[10px] text-sky-600">
														{money(taxPaid)}
													</div>
												</div>

												{/* Outstanding */}
												<div className="text-right tabular-nums text-sm">
													<div className="font-medium">
														{money(itemOutstanding)}
													</div>
													<div className="text-[10px] text-muted-foreground">
														Tax:{" "}
														{money(
															Number(item.tax_amount ?? 0) - taxPaid,
														)}
													</div>
												</div>

												{/* Payment — editable per-item amount */}
												<div className="text-right">
													<input
														type="number"
														inputMode="decimal"
														step="0.01"
														min="0"
														value={itemAllocations.get(item.id) ?? ""}
														onChange={(e) =>
															setItemAlloc(item.id, e.target.value)
														}
														disabled={isPending}
														className={[
															"w-full rounded-full border px-2 py-1 text-right text-xs tabular-nums outline-none focus-visible:border-ring disabled:opacity-60",
															overAlloc
																? "border-red-400 bg-red-50 text-red-700"
																: "border-input bg-background",
														].join(" ")}
													/>
													{overAlloc && (
														<p className="mt-0.5 text-[10px] text-red-600">
															Exceeds outstanding
														</p>
													)}
												</div>
											</div>

											{/* Allocation row */}
											<div className="mt-2 text-[11px]">
												<span className="text-sky-600">
													Sales Order Allocation:{" "}
												</span>
												{lineIncentives.length === 0 ? (
													<span className="italic text-muted-foreground">
														No allocation
													</span>
												) : (
													<span className="font-medium">
														{lineIncentives
															.map(
																(i) =>
																	`${fullName(i.employee?.first_name, i.employee?.last_name)} (${Number(i.percent).toFixed(2)}%)`,
															)
															.join(", ")}
													</span>
												)}
											</div>
										</div>
									);
								})}
								{items.length === 0 && (
									<div className="px-4 py-8 text-center text-muted-foreground text-sm">
										No line items.
									</div>
								)}
							</div>

							{/* Allocation mismatch warning */}
							{allocMismatch && (
								<div className="border-t bg-amber-50 px-4 py-2 text-amber-800 text-xs">
									Item allocations sum (MYR {money(allocSum)}) does not match
									tendered amount (MYR {money(amountNum)}). Adjust the Payment
									column above.
								</div>
							)}
						</section>
					</div>

					{/* Right — payment form */}
					<div className="flex w-full shrink-0 flex-col gap-4 border-t bg-white p-5 sm:w-[300px] sm:border-l sm:border-t-0">
						{/* Backdate Invoice toggle */}
						<div className="flex items-center justify-end gap-2 text-xs">
							<span className="text-blue-600">Backdate Invoice?</span>
							<Toggle
								checked={backdate}
								onCheckedChange={(v) => {
									setBackdate(v);
									setBackdateValue(v ? maxDate : "");
								}}
							/>
						</div>
						{backdate && (
							<Input
								type="date"
								min={minDate}
								max={maxDate}
								value={backdateValue}
								onChange={(e) => setBackdateValue(e.target.value)}
								onBlur={() => {
									if (
										!backdateValue ||
										backdateValue < minDate ||
										backdateValue > maxDate
									)
										setBackdateValue(maxDate);
								}}
								className="h-8 text-xs"
							/>
						)}

						{/* Payment Mode */}
						<div>
							<label className="mb-1.5 block text-sm font-medium">
								Payment Mode:
							</label>
							<select
								className="h-10 w-full rounded-full border border-input bg-background px-4 text-sm outline-none focus-visible:border-ring"
								value={entry.mode}
								onChange={(e) => onChangeMethod(e.target.value)}
								disabled={isPending}
							>
								{allMethods.map((m) => (
									<option key={m.code} value={m.code}>
										{m.name}
									</option>
								))}
								{selectedMethod == null && (
									<option value={entry.mode}>{entry.mode}</option>
								)}
							</select>
						</div>

						{/* Payment-method-specific fields (bank, card, trace, etc.)
						    and payment-method-specific remarks when method.requires_remarks */}
						{selectedMethod && (
							<PaymentMethodFields
								method={selectedMethod}
								entry={entry}
								onChange={patch}
							/>
						)}

						{/* Tendered Amount */}
						<div>
							<label className="mb-1.5 block text-sm font-medium">
								Tendered Amount (MYR):
							</label>
							<input
								type="number"
								inputMode="decimal"
								step="0.01"
								min="0"
								value={entry.amount}
								onChange={(e) => onChangeAmount(e.target.value)}
								disabled={isPending}
								className="h-10 w-full rounded-full border border-input bg-background px-4 text-right text-sm tabular-nums outline-none focus-visible:border-ring disabled:opacity-60"
							/>
							{overpay && (
								<p className="mt-1 text-red-600 text-xs">
									Exceeds outstanding MYR {money(outstanding)}
								</p>
							)}
						</div>

						{/* General payment remarks — always visible, separate from
						    the payment-method remarks inside PaymentMethodFields */}
						<div>
							<label className="mb-1.5 block text-sm font-medium">
								Remarks:
							</label>
							<Input
								placeholder="Eg. payment note"
								value={generalRemarks}
								onChange={(e) => setGeneralRemarks(e.target.value)}
								disabled={isPending}
								className="rounded-full"
							/>
						</div>

						{/* Outstanding display */}
						<div>
							<label className="mb-1.5 block text-sm font-medium text-rose-600">
								Outstanding Amount (MYR):
							</label>
							<div className="rounded-md bg-muted/30 px-4 py-2.5 text-right font-semibold tabular-nums text-rose-600">
								{money(outstanding)}
							</div>
						</div>

						{/* Outlet info */}
						{outletName && (
							<TooltipProvider delayDuration={200}>
								<p className="text-center text-[11px] text-muted-foreground leading-relaxed">
									This Invoice (IV) for payment will be created at{" "}
									<span className="font-semibold uppercase">{outletName}</span>{" "}
									<Tooltip>
										<TooltipTrigger asChild>
											<button type="button" className="inline-flex align-middle">
												<Info className="size-3 text-muted-foreground" />
											</button>
										</TooltipTrigger>
										<TooltipContent
											side="top"
											className="max-w-[200px] text-center text-xs"
										>
											The invoice is stamped to this outlet for reporting
											purposes.
										</TooltipContent>
									</Tooltip>
								</p>
							</TooltipProvider>
						)}

						{/* Action buttons */}
						<div className="mt-auto flex items-center justify-end gap-3 pt-2">
							{/* Reset */}
							<button
								type="button"
								onClick={reset}
								disabled={isPending}
								className="flex size-11 items-center justify-center rounded-full border-2 border-amber-400 text-amber-500 hover:bg-amber-50 disabled:opacity-50"
								title="Reset"
							>
								<RefreshCw className="size-5" />
							</button>

							{/* Confirm */}
							<button
								type="button"
								onClick={submit}
								disabled={!canSubmit}
								className="flex size-11 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
								title="Confirm payment"
							>
								{isPending ? (
									<RefreshCw className="size-5 animate-spin" />
								) : (
									<Check className="size-5" />
								)}
							</button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
