"use client";

import {
	CheckCircle2,
	ChevronsDownUp,
	ChevronsUpDown,
	Loader2,
	Printer,
	Search,
	ShoppingCart,
	UserRound,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
import {
	BillingItemPickerDialog,
	type CartEntry,
} from "@/components/appointments/BillingItemPickerDialog";
import {
	computeLineDiscount,
	lineGross,
	lineTaxAmount,
	money,
} from "@/components/appointments/detail/collect-payment/helpers";
import { LineItemRow } from "@/components/appointments/detail/collect-payment/LineItemRow";
import { hasMissingRequiredFields } from "@/components/appointments/detail/collect-payment/PaymentMethodFields";
import { PaymentSection } from "@/components/appointments/detail/collect-payment/PaymentSection";
import { TotalsPanel } from "@/components/appointments/detail/collect-payment/TotalsPanel";
import type {
	Allocation,
	Line,
} from "@/components/appointments/detail/collect-payment/types";
import { Toggle } from "@/components/appointments/detail/collect-payment/ui-primitives";
import { usePaymentAllocations } from "@/components/appointments/detail/collect-payment/use-payment-allocations";
import { usePayments } from "@/components/appointments/detail/collect-payment/use-payments";
import { useRounding } from "@/components/appointments/detail/collect-payment/use-rounding";
import { EmployeePicker } from "@/components/employees/EmployeePicker";
import { useWalkInEmployeeAllocations } from "@/components/sales/use-walkin-employee-allocations";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PercentInput } from "@/components/ui/numeric-input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	collectWalkInSaleAction,
	getNewSaleDataAction,
} from "@/lib/actions/sales";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import type { PaymentMethod } from "@/lib/services/payment-methods";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";
import { cn } from "@/lib/utils";
import { resolveDefaultTaxId } from "@/lib/utils/resolve-default-tax";

type LoadedData = {
	customers: CustomerWithRelations[];
	outlets: OutletWithRoomCount[];
	employees: EmployeeWithRelations[];
	services: ServiceWithCategory[];
	products: InventoryItemWithRefs[];
	taxes: Tax[];
	paymentMethods: PaymentMethod[];
	currentEmployeeId: string | null;
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function NewSaleDialog({ open, onOpenChange }: Props) {
	const [data, setData] = useState<LoadedData | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setLoadError(null);
		getNewSaleDataAction()
			.then((res) => {
				if (cancelled) return;
				setData(res);
			})
			.catch((e) => {
				if (cancelled) return;
				setLoadError(e instanceof Error ? e.message : "Failed to load data");
			});
		return () => {
			cancelled = true;
		};
	}, [open]);

	if (!open) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				preventOutsideClose
				className="flex max-h-[92vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
			>
				<DialogTitle className="sr-only">New sale</DialogTitle>
				<DialogDescription className="sr-only">
					Create a walk-in sale: pick a customer, add services or products, and
					collect payment.
				</DialogDescription>
				{loadError ? (
					<div className="flex flex-col items-center justify-center gap-3 p-10">
						<div className="text-sm text-red-600">{loadError}</div>
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							type="button"
						>
							Close
						</Button>
					</div>
				) : !data ? (
					<div className="flex flex-col items-center justify-center gap-2 p-10 text-muted-foreground">
						<Loader2 className="size-5 animate-spin" />
						<div className="text-sm">Loading…</div>
					</div>
				) : (
					<NewSaleBody data={data} onOpenChange={onOpenChange} />
				)}
			</DialogContent>
		</Dialog>
	);
}

function NewSaleBody({
	data,
	onOpenChange,
}: {
	data: LoadedData;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const [customerId, setCustomerId] = useState<string | null>(null);
	const [outletId, setOutletId] = useState<string | null>(
		data.outlets[0]?.id ?? null,
	);

	const selectedCustomer = useMemo(
		() => data.customers.find((c) => c.id === customerId) ?? null,
		[data.customers, customerId],
	);

	const [lines, setLines] = useState<Line[]>([]);
	const serviceById = useMemo(() => {
		const map = new Map<string, ServiceWithCategory>();
		for (const s of data.services) map.set(s.id, s);
		return map;
	}, [data.services]);

	const capFor = useCallback(
		(serviceId: string | null): number | null => {
			if (!serviceId) return null;
			const svc = serviceById.get(serviceId);
			return svc?.discount_cap == null ? null : Number(svc.discount_cap);
		},
		[serviceById],
	);

	const updateLine = useCallback(
		(id: string, patch: Partial<Line>) =>
			setLines((rows) =>
				rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
			),
		[],
	);

	const requiresFullFor = useCallback(
		(line: Line): boolean => {
			if (line.item_type !== "service") return true;
			if (!line.service_id) return true;
			const svc = serviceById.get(line.service_id);
			return !(svc?.allow_redemption_without_payment ?? false);
		},
		[serviceById],
	);

	const lineDiscounts = useMemo(
		() => lines.map((l) => computeLineDiscount(l, capFor(l.service_id))),
		[lines, capFor],
	);
	const subtotal = useMemo(
		() => lines.reduce((sum, l) => sum + lineGross(l), 0),
		[lines],
	);
	const totalDiscount = useMemo(
		() => lineDiscounts.reduce((sum, d) => sum + d, 0),
		[lineDiscounts],
	);
	const totalTax = useMemo(
		() =>
			lines.reduce(
				(sum, l, i) =>
					sum + lineTaxAmount(l, data.taxes, lineDiscounts[i] ?? 0),
				0,
			),
		[lines, data.taxes, lineDiscounts],
	);
	const lineNets = useMemo(
		() =>
			lines.map((l, i) => {
				const disc = lineDiscounts[i] ?? 0;
				const tax = lineTaxAmount(l, data.taxes, disc);
				return Math.max(0, lineGross(l) - disc) + tax;
			}),
		[lines, lineDiscounts, data.taxes],
	);
	const rawTotal = Math.max(0, subtotal - totalDiscount + totalTax);

	const rounding = useRounding(rawTotal);
	const payments = usePayments(data.paymentMethods, rounding.total, true);
	const payAlloc = usePaymentAllocations({
		lines,
		lineNets,
		isUnderpaid: payments.isUnderpaid,
		total: rounding.total,
		totalPaid: payments.totalPaid,
		requiresFullFor,
	});
	const empAlloc = useWalkInEmployeeAllocations({
		defaultEmpId: data.currentEmployeeId,
		lines,
	});

	// The primary employee (first filled slot of the global allocation) is
	// stamped as sales_orders.consultant_id — same role the appointment's
	// employee_id plays in collect_appointment_payment.
	const derivedConsultantId = useMemo(() => {
		for (const slot of empAlloc.globalAlloc) {
			if (slot.employeeId) return slot.employeeId;
		}
		return null;
	}, [empAlloc.globalAlloc]);

	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
	const toggleExpanded = useCallback(
		(id: string) =>
			setExpandedIds((prev) => {
				const next = new Set(prev);
				if (next.has(id)) next.delete(id);
				else next.add(id);
				return next;
			}),
		[],
	);
	const allExpanded =
		lines.length > 0 && lines.every((l) => expandedIds.has(l.id));
	const toggleAll = () => {
		if (allExpanded) setExpandedIds(new Set());
		else setExpandedIds(new Set(lines.map((l) => l.id)));
	};

	// Mirror the appointment flow — turning itemised mode on expands every
	// line so the per-row allocation controls are immediately visible.
	const handleItemizedChange = useCallback(
		(v: boolean) => {
			empAlloc.setItemized(v);
			if (v) setExpandedIds(new Set(lines.map((l) => l.id)));
		},
		[empAlloc, lines],
	);

	const [remarksOpenIds, setRemarksOpenIds] = useState<Set<string>>(new Set());
	const toggleRemarks = useCallback(
		(id: string) =>
			setRemarksOpenIds((prev) => {
				const next = new Set(prev);
				if (next.has(id)) next.delete(id);
				else next.add(id);
				return next;
			}),
		[],
	);

	const [remarks, setRemarks] = useState("");
	const [backdate, setBackdate] = useState(false);
	const [backdateValue, setBackdateValue] = useState("");
	const [pickerOpen, setPickerOpen] = useState(false);
	const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const [successData, setSuccessData] = useState<{
		salesOrderId: string;
		soNumber: string;
		invoiceNo: string;
		totalPaid: number;
	} | null>(null);

	const handlePickerCommit = (batch: CartEntry[]) => {
		const defaultTaxId = resolveDefaultTaxId(selectedCustomer, null);
		const newLines: Line[] = batch.map(({ selection, quantity }) => {
			const base = {
				id: crypto.randomUUID(),
				quantity,
				discount_type: "amount" as const,
				discount_input: "",
				tooth_number: "",
				surface: "",
				remarks: "",
			};
			if (selection.type === "service") {
				return {
					...base,
					service_id: selection.service.id,
					inventory_item_id: null,
					item_type: "service",
					item_name: selection.service.name,
					sku: selection.service.sku ?? "",
					unit_price: Number(selection.service.price),
					tax_id: defaultTaxId,
				};
			}
			if (selection.type === "wallet_topup") {
				return {
					...base,
					quantity: 1,
					service_id: null,
					inventory_item_id: selection.product.id,
					item_type: "wallet_topup",
					item_name: selection.product.name,
					sku: selection.product.sku ?? "",
					unit_price: 0, // staff types the top-up amount
					tax_id: null, // wallet credit is never taxed
				};
			}
			return {
				...base,
				service_id: null,
				inventory_item_id: selection.product.id,
				item_type: "product",
				item_name: selection.product.name,
				sku: selection.product.sku ?? "",
				unit_price: Number(selection.product.selling_price ?? 0),
				tax_id: defaultTaxId,
			};
		});
		setLines((prev) => [...prev, ...newLines]);
		setPickerOpen(false);
	};

	const anyPartialAllowed = useMemo(
		() => lines.some((l) => !requiresFullFor(l)),
		[lines, requiresFullFor],
	);
	const forcesFullPayment = !anyPartialAllowed && lines.length > 0;

	const amountValid = payments.totalPaid > 0;

	const incompletePaymentRows = useMemo(
		() =>
			payments.payments.filter((p) => {
				const v = Number(p.amount);
				if (!Number.isFinite(v) || v <= 0) return true;
				if (!p.mode.trim()) return true;
				if (!payments.methodByCode.get(p.mode)) return true;
				return false;
			}),
		[payments.payments, payments.methodByCode],
	);
	const hasIncompletePaymentRows = incompletePaymentRows.length > 0;

	const missingMethodFieldRows = useMemo(
		() =>
			payments.payments.filter((p) => {
				const v = Number(p.amount);
				if (!Number.isFinite(v) || v <= 0) return false;
				const method = payments.methodByCode.get(p.mode);
				if (!method) return false;
				return hasMissingRequiredFields(method, p);
			}),
		[payments.payments, payments.methodByCode],
	);
	const hasMissingMethodFields = missingMethodFieldRows.length > 0;

	const missingHeader = !customerId || !outletId;

	const disabled =
		isPending ||
		missingHeader ||
		lines.length === 0 ||
		!amountValid ||
		rounding.roundingExceedsLimit ||
		payments.isOverpaid ||
		(forcesFullPayment && payments.isUnderpaid) ||
		payAlloc.anyRequiredUnder ||
		payAlloc.anyLineOverAllocated ||
		payAlloc.allocSumMismatch ||
		empAlloc.globalAllocInvalid ||
		empAlloc.itemizedInvalidLineIds.size > 0 ||
		hasIncompletePaymentRows ||
		hasMissingMethodFields;

	const blockerReason = disabled
		? !customerId
			? "Select a customer."
			: !outletId
				? "Select an outlet."
				: lines.length === 0
					? "Add at least one billing item."
					: !amountValid
						? "Enter the payment amount."
						: rounding.roundingExceedsLimit
							? "Rounding exceeds RM 1.00."
							: payments.isOverpaid
								? `Overpaid by RM ${money(Math.abs(payments.balanceDiff))}.`
								: forcesFullPayment && payments.isUnderpaid
									? "All items require full payment."
									: payAlloc.anyRequiredUnder
										? "A required-full line is under-allocated."
										: payAlloc.anyLineOverAllocated
											? "A line allocation exceeds its own total."
											: payAlloc.allocSumMismatch
												? `Allocated RM ${money(payAlloc.allocSum)} ≠ paid RM ${money(payments.totalPaid)}.`
												: empAlloc.globalAllocInvalid
													? `Employee allocation ${empAlloc.globalEmpSum.toFixed(0)}% ≠ 100%.`
													: empAlloc.itemizedInvalidLineIds.size > 0
														? `${empAlloc.itemizedInvalidLineIds.size} item(s) with invalid employee split.`
														: hasIncompletePaymentRows
															? "Finish or remove the empty payment row."
															: hasMissingMethodFields
																? "Fill the required payment-method field(s)."
																: "Processing…"
		: null;

	const handleSubmit = () => {
		setFormError(null);
		if (!customerId) return setFormError("Select a customer.");
		if (!outletId) return setFormError("Select an outlet.");
		if (lines.length === 0)
			return setFormError("Add at least one billing item.");
		if (!amountValid) return setFormError("Enter the payment amount.");
		if (rounding.roundingExceedsLimit)
			return setFormError("Rounding adjustment cannot exceed RM 1.00.");

		{
			const filled = payments.payments.filter((p) => {
				const v = Number(p.amount);
				return Number.isFinite(v) && v > 0;
			});
			const seen = new Set<string>();
			for (const p of filled) {
				if (seen.has(p.mode)) {
					const dup = payments.methodByCode.get(p.mode)?.name ?? p.mode;
					return setFormError(
						`Payment method "${dup}" appears twice. Merge the amounts or pick a different method.`,
					);
				}
				seen.add(p.mode);
			}
		}

		if (payments.isOverpaid)
			return setFormError(
				`Collected RM ${money(payments.totalPaid)} exceeds bill total RM ${money(rounding.total)}.`,
			);
		if (forcesFullPayment && payments.isUnderpaid)
			return setFormError(
				`All items require full payment. Collect RM ${money(rounding.total)} or remove/replace items.`,
			);
		if (payAlloc.anyRequiredUnder)
			return setFormError(
				"Some items require full payment but their allocation is below the net total.",
			);
		if (payAlloc.anyLineOverAllocated)
			return setFormError("A line's payment allocation exceeds its own total.");
		if (payAlloc.allocSumMismatch) {
			const diff = payments.totalPaid - payAlloc.allocSum;
			return setFormError(
				diff > 0
					? `Allocated RM ${money(payAlloc.allocSum)} is less than paid RM ${money(payments.totalPaid)}.`
					: `Allocated RM ${money(payAlloc.allocSum)} exceeds paid RM ${money(payments.totalPaid)}.`,
			);
		}
		if (empAlloc.globalAllocInvalid)
			return setFormError(
				`Employee allocation is ${empAlloc.globalEmpSum.toFixed(0)}% — must equal 100%. Tap Balance or adjust the slots.`,
			);
		if (empAlloc.itemizedInvalidLineIds.size > 0)
			return setFormError(
				`${empAlloc.itemizedInvalidLineIds.size} item${empAlloc.itemizedInvalidLineIds.size > 1 ? "s" : ""} have employee allocations that don't sum to 100%.`,
			);
		if (hasIncompletePaymentRows)
			return setFormError(
				"One or more payment rows are incomplete (missing amount or method).",
			);
		if (hasMissingMethodFields)
			return setFormError(
				"A payment row is missing a required field. Fill the field(s) marked with *.",
			);

		startTransition(async () => {
			try {
				const allocations = payments.isUnderpaid
					? lines.map((_l, i) => ({
							item_index: i,
							amount: payAlloc.allocNums[i] ?? 0,
						}))
					: null;

				const capturedTotalPaid = payments.totalPaid;

				const incentivesPayload = empAlloc.buildIncentivesPayload();
				const incentives =
					incentivesPayload.length > 0 ? incentivesPayload : null;

				const result = await collectWalkInSaleAction({
					customer_id: customerId,
					outlet_id: outletId,
					consultant_id: derivedConsultantId,
					items: lines.map((l, i) => ({
						service_id: l.service_id,
						inventory_item_id: l.inventory_item_id,
						sku: null,
						item_name: l.item_name,
						item_type: l.item_type,
						quantity: l.quantity,
						unit_price: l.unit_price,
						discount: lineDiscounts[i] ?? 0,
						tax_id: l.tax_id,
					})),
					discount: 0,
					tax: 0,
					rounding: rounding.rounding,
					payments: payments.payments
						.filter((p) => {
							const v = Number(p.amount);
							return Number.isFinite(v) && v > 0;
						})
						.map((p) => ({
							mode: p.mode,
							amount: Number(p.amount),
							remarks: p.remarks.trim() || null,
							bank: p.bank.trim() || null,
							card_type: p.card_type.trim() || null,
							trace_no: p.trace_no.trim() || null,
							approval_code: p.approval_code.trim() || null,
							reference_no: p.reference_no.trim() || null,
							months: p.months ? Number(p.months) : null,
						})),
					allocations,
					incentives,
					remarks: remarks.trim() || null,
					sold_at:
						backdate && backdateValue
							? new Date(backdateValue).toISOString()
							: null,
				});
				setSuccessData({
					salesOrderId: result.sales_order_id,
					soNumber: result.so_number,
					invoiceNo: result.invoice_no,
					totalPaid: capturedTotalPaid,
				});
			} catch (e) {
				setFormError(
					e instanceof Error ? e.message : "Failed to collect payment",
				);
			}
		});
	};

	const handlePrintInvoice = () => {
		if (!successData) return;
		window.open(`/invoices/${successData.salesOrderId}`, "_blank", "noopener");
		onOpenChange(false);
		router.push(`/sales/${successData.salesOrderId}`);
	};

	const handleDone = () => {
		onOpenChange(false);
		if (successData) router.push(`/sales/${successData.salesOrderId}`);
	};

	if (successData) {
		return (
			<div className="flex flex-col">
				<div className="flex flex-col items-center gap-3 px-6 pt-8 pb-3 text-center">
					<div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
						<CheckCircle2 className="size-8" />
					</div>
					<div className="text-lg font-semibold">Payment collected</div>
					<div className="text-sm text-muted-foreground">
						Print the invoice?
					</div>
				</div>

				<dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 px-8 py-4 text-sm">
					<dt className="text-muted-foreground">Sales order</dt>
					<dd className="text-right font-mono">{successData.soNumber}</dd>
					<dt className="text-muted-foreground">Invoice</dt>
					<dd className="text-right font-mono">{successData.invoiceNo}</dd>
					<dt className="text-muted-foreground">Total paid</dt>
					<dd className="text-right font-semibold">
						RM {money(successData.totalPaid)}
					</dd>
				</dl>

				<div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-6 py-4">
					<Button type="button" variant="outline" onClick={handleDone}>
						No, skip
					</Button>
					<Button type="button" onClick={handlePrintInvoice} className="gap-1">
						<Printer className="size-4" />
						Yes, print
					</Button>
				</div>
			</div>
		);
	}

	return (
		<>
			<WalkInHeader
				customer={selectedCustomer}
				onClearCustomer={() => setCustomerId(null)}
				onOpenCustomerPicker={() => setCustomerPickerOpen(true)}
				outlets={data.outlets}
				outletId={outletId}
				onOutletChange={setOutletId}
				employees={data.employees}
				total={rounding.total}
				itemized={empAlloc.itemized}
				onItemizedChange={handleItemizedChange}
				globalAlloc={empAlloc.globalAlloc}
				onGlobalEmpChange={empAlloc.setGlobalEmployee}
				onGlobalPercentChange={empAlloc.setGlobalPercent}
				onBalanceGlobal={empAlloc.balanceGlobalEmployee}
				onClose={() => onOpenChange(false)}
				closeDisabled={isPending}
			/>

			<div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_360px]">
				<div className="flex min-h-0 flex-col overflow-y-auto border-r bg-slate-50/40 px-5 pt-4 pb-10">
					<div className="mb-2 grid grid-cols-[1fr_56px_96px_80px_24px] items-center gap-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
						<span>Product/Service</span>
						<span className="text-center">Qty</span>
						<span className="text-right">Unit (MYR)</span>
						<span className="text-right">Total (MYR)</span>
						<span />
					</div>

					<div className="rounded-md border bg-white shadow-sm">
						{lines.length === 0 ? (
							<EmptyCartCTA
								hasCustomer={!!customerId}
								hasOutlet={!!outletId}
								onSelectCustomer={() => setCustomerPickerOpen(true)}
								onAddItem={() => setPickerOpen(true)}
							/>
						) : (
							<>
								<div className="flex items-center justify-end border-b px-3 py-1.5">
									<button
										type="button"
										onClick={toggleAll}
										className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
									>
										{allExpanded ? (
											<>
												<ChevronsDownUp className="size-3.5" />
												Collapse All
											</>
										) : (
											<>
												<ChevronsUpDown className="size-3.5" />
												Expand All
											</>
										)}
									</button>
								</div>
								<ul className="divide-y">
									{lines.map((l, i) => (
										<LineItemRow
											key={l.id}
											line={l}
											lineDiscount={lineDiscounts[i] ?? 0}
											lineNet={lineNets[i] ?? 0}
											taxes={data.taxes}
											service={
												l.service_id
													? (serviceById.get(l.service_id) ?? null)
													: null
											}
											capPct={capFor(l.service_id)}
											requiresFullPay={requiresFullFor(l)}
											isExpanded={expandedIds.has(l.id)}
											onToggleExpanded={() => toggleExpanded(l.id)}
											remarksOpen={remarksOpenIds.has(l.id)}
											onToggleRemarks={() => toggleRemarks(l.id)}
											updateLine={(patch) => updateLine(l.id, patch)}
											showPaymentAlloc={
												payments.isUnderpaid && payments.totalPaid > 0
											}
											linePayAlloc={payAlloc.getLinePayAlloc(l.id)}
											onLinePayAllocChange={(v) =>
												payAlloc.setLinePayAllocVal(l.id, v)
											}
											lineAllocOver={payAlloc.lineOverAllocated[i] === true}
											lineAllocShort={payAlloc.lineUnderRequired[i] === true}
											itemized={empAlloc.itemized}
											allEmployees={data.employees}
											lineEmpAlloc={empAlloc.getLineAlloc(l.id)}
											onLineEmpChange={(idx, empId) =>
												empAlloc.setLineEmployee(l.id, idx, empId)
											}
											onLinePercentChange={(idx, pct) =>
												empAlloc.setLinePercent(l.id, idx, pct)
											}
											onBalanceEmpLine={() =>
												empAlloc.balanceLineEmployee(l.id)
											}
											onRemove={() =>
												setLines((prev) => prev.filter((r) => r.id !== l.id))
											}
										/>
									))}
								</ul>
							</>
						)}
					</div>

					<div className="mt-3 grid grid-cols-[1fr_1fr] gap-4">
						<div className="space-y-2 text-sm">
							<button
								type="button"
								onClick={() => setPickerOpen(true)}
								disabled={!customerId || !outletId}
								className={cn(
									"flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
									customerId && outletId
										? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
										: "cursor-not-allowed bg-muted text-muted-foreground",
								)}
							>
								<ShoppingCart className="size-4" />
								Add Item to Cart
							</button>
							{(!customerId || !outletId) && (
								<div className="text-[11px] text-muted-foreground">
									Pick a customer and outlet above to start adding items.
								</div>
							)}
						</div>

						<TotalsPanel
							totalTax={totalTax}
							totalDiscount={totalDiscount}
							rawTotal={rawTotal}
							total={rounding.total}
							rounding={rounding.rounding}
							requireRounding={rounding.requireRounding}
							setRequireRounding={rounding.setRequireRounding}
							roundedTotalInput={rounding.roundedTotalInput}
							setRoundedTotalInput={rounding.setRoundedTotalInput}
							roundingExceedsLimit={rounding.roundingExceedsLimit}
							totalPaid={payments.totalPaid}
							balanceDiff={payments.balanceDiff}
							isUnderpaid={payments.isUnderpaid}
							linesCount={lines.length}
							allocSum={payAlloc.allocSum}
							allocSumMismatch={payAlloc.allocSumMismatch}
							autoAllocatePartial={payAlloc.autoAllocatePartial}
							forcesFullPayment={forcesFullPayment}
						/>
					</div>
				</div>

				<div className="flex min-h-0 flex-col overflow-y-auto bg-white px-5 py-4">
					<PaymentSection
						payments={payments.payments}
						paymentMethods={data.paymentMethods}
						methodByCode={payments.methodByCode}
						total={rounding.total}
						walletBalance={null}
						onChangeMethod={payments.changePaymentMethod}
						onUpdatePayment={payments.updatePayment}
						onRemovePayment={payments.removePaymentEntry}
						onAddPayment={payments.addPaymentEntry}
						onSetPaymentToTotal={payments.setPaymentToTotal}
						backdate={backdate}
						onBackdateChange={setBackdate}
						backdateValue={backdateValue}
						onBackdateValueChange={setBackdateValue}
						remarks={remarks}
						onRemarksChange={setRemarks}
					/>

					<div className="mt-4 text-[11px] text-muted-foreground">
						This Sale will be created at{" "}
						<span className="font-semibold text-blue-600">
							{data.outlets.find((o) => o.id === outletId)?.name ??
								"— select outlet —"}
						</span>
					</div>

					<div className="mt-3 flex items-center justify-end gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span
										className={cn(
											"inline-flex",
											disabled && !isPending && "cursor-not-allowed",
										)}
									>
										<button
											type="button"
											onClick={handleSubmit}
											disabled={disabled}
											className="flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
											aria-label="Collect payment"
										>
											{isPending ? (
												<Loader2 className="size-5 animate-spin" />
											) : (
												<svg
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="3"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="size-6"
													aria-hidden="true"
												>
													<polyline points="20 6 9 17 4 12" />
												</svg>
											)}
										</button>
									</span>
								</TooltipTrigger>
								<TooltipContent>
									{blockerReason ?? "Collect payment"}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>

					{formError && (
						<div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
							{formError}
						</div>
					)}
				</div>
			</div>

			<BillingItemPickerDialog
				open={pickerOpen}
				onOpenChange={setPickerOpen}
				services={data.services}
				products={data.products}
				currentCart={lines.map((l) => ({
					id: l.id,
					item_type: l.item_type,
					name: l.item_name,
					sku: l.sku || null,
					quantity: l.quantity,
					unit_price: l.unit_price,
				}))}
				onRemoveExisting={(id) =>
					setLines((prev) => prev.filter((l) => l.id !== id))
				}
				onCommit={handlePickerCommit}
			/>

			<CustomerPickerDialog
				open={customerPickerOpen}
				onOpenChange={setCustomerPickerOpen}
				customers={data.customers}
				onPick={(id) => {
					setCustomerId(id);
					setCustomerPickerOpen(false);
				}}
			/>
		</>
	);
}

// ---------------------------------------------------------------------------
// Header with customer chip, outlet + consultant selectors, total, close
// ---------------------------------------------------------------------------

function WalkInHeader({
	customer,
	onClearCustomer,
	onOpenCustomerPicker,
	outlets,
	outletId,
	onOutletChange,
	employees,
	total,
	itemized,
	onItemizedChange,
	globalAlloc,
	onGlobalEmpChange,
	onGlobalPercentChange,
	onBalanceGlobal,
	onClose,
	closeDisabled,
}: {
	customer: CustomerWithRelations | null;
	onClearCustomer: () => void;
	onOpenCustomerPicker: () => void;
	outlets: OutletWithRoomCount[];
	outletId: string | null;
	onOutletChange: (id: string) => void;
	employees: EmployeeWithRelations[];
	total: number;
	itemized: boolean;
	onItemizedChange: (v: boolean) => void;
	globalAlloc: Allocation[];
	onGlobalEmpChange: (idx: number, empId: string | null) => void;
	onGlobalPercentChange: (idx: number, pct: number) => void;
	onBalanceGlobal: () => void;
	onClose: () => void;
	closeDisabled: boolean;
}) {
	const customerName = customer
		? [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
			"Customer"
		: null;

	const filled = globalAlloc.filter((a) => a.employeeId);
	const allocSum = filled.reduce((s, a) => s + a.percent, 0);
	const sumInvalid = filled.length > 0 && Math.abs(allocSum - 100) > 0.01;

	return (
		<div className="flex flex-wrap items-start justify-between gap-4 border-b bg-white px-6 py-3">
			<div className="flex items-start gap-4">
				<div className="flex flex-col">
					<div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
						New sale
					</div>
					{customer ? (
						<div className="mt-0.5 flex items-center gap-2">
							<button
								type="button"
								onClick={onOpenCustomerPicker}
								className="group flex items-center gap-2 text-left"
							>
								<span className="text-lg font-semibold tracking-wide text-blue-600 group-hover:underline">
									{(customerName ?? "Customer").toUpperCase()}
								</span>
								<span className="text-xs text-muted-foreground">
									{customer.code}
								</span>
							</button>
							<button
								type="button"
								onClick={onClearCustomer}
								className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
								aria-label="Clear customer"
							>
								<X className="size-3" />
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={onOpenCustomerPicker}
							className="mt-1 inline-flex items-center gap-2 rounded-md border-2 border-dashed border-blue-400 bg-blue-50 px-4 py-2 text-base font-semibold text-blue-700 shadow-sm hover:border-blue-500 hover:bg-blue-100"
						>
							<UserRound className="size-5" />
							Select customer
						</button>
					)}
					<div className="mt-0.5 text-xs text-muted-foreground">
						MYR {money(total)}
					</div>
				</div>
			</div>

			<div className="flex items-end gap-4">
				<label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					Outlet
					<select
						value={outletId ?? ""}
						onChange={(e) => onOutletChange(e.target.value)}
						className="h-8 w-40 rounded-md border bg-background px-2 text-xs outline-none focus-visible:border-ring"
					>
						{outlets.map((o) => (
							<option key={o.id} value={o.id}>
								{o.name}
							</option>
						))}
					</select>
				</label>

				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground">
						Itemised Allocation?
					</span>
					<Toggle checked={itemized} onCheckedChange={onItemizedChange} />
				</div>

				<div
					className={cn("flex items-end gap-2", itemized && "invisible")}
					aria-hidden={itemized}
				>
					{globalAlloc.map((slot, idx) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed 3-slot array
							key={`walkin-global-${idx}`}
							className="flex flex-col items-center gap-1"
						>
							<EmployeePicker
								employees={employees}
								value={slot.employeeId || null}
								onChange={(id) => onGlobalEmpChange(idx, id)}
								size="sm"
								placeholder={`Employee ${idx + 1}`}
							/>
							{slot.employeeId ? (
								<div className="flex items-center gap-0.5">
									<PercentInput
										value={slot.percent}
										onChange={(n) => onGlobalPercentChange(idx, n)}
										className="h-5 w-14 px-1 text-center text-[10px] tabular-nums"
										aria-label="Employee percent"
									/>
									<span className="text-[10px] text-muted-foreground">%</span>
								</div>
							) : (
								<div className="h-5" />
							)}
						</div>
					))}
					{filled.length > 0 && (
						<div className="flex items-center gap-1.5 text-[10px] tabular-nums text-muted-foreground">
							<span className={cn(sumInvalid && "text-red-600 font-medium")}>
								{allocSum.toFixed(0)}%
							</span>
							{sumInvalid && (
								<button
									type="button"
									onClick={onBalanceGlobal}
									className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-amber-900 hover:bg-amber-50"
								>
									Balance
								</button>
							)}
						</div>
					)}
				</div>

				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								onClick={onClose}
								disabled={closeDisabled}
								aria-label="Close"
								className="ml-2 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
							>
								<X className="size-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent>Close</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Empty-cart call-to-action — big, obvious buttons instead of a quiet message
// ---------------------------------------------------------------------------

function EmptyCartCTA({
	hasCustomer,
	hasOutlet,
	onSelectCustomer,
	onAddItem,
}: {
	hasCustomer: boolean;
	hasOutlet: boolean;
	onSelectCustomer: () => void;
	onAddItem: () => void;
}) {
	const ready = hasCustomer && hasOutlet;
	return (
		<div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
			{!hasCustomer ? (
				<>
					<div className="flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
						<UserRound className="size-6" />
					</div>
					<div>
						<div className="text-base font-semibold">Pick a customer</div>
						<div className="mt-1 text-sm text-muted-foreground">
							Start by selecting who this sale is for.
						</div>
					</div>
					<button
						type="button"
						onClick={onSelectCustomer}
						className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
					>
						<UserRound className="size-4" />
						Select customer
					</button>
				</>
			) : !hasOutlet ? (
				<div className="text-sm text-muted-foreground">
					Select an outlet above to continue.
				</div>
			) : (
				<>
					<div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
						<ShoppingCart className="size-6" />
					</div>
					<div>
						<div className="text-base font-semibold">Add items to the sale</div>
						<div className="mt-1 text-sm text-muted-foreground">
							Pick services or products — you can tune price, quantity and
							discount on each line.
						</div>
					</div>
					<button
						type="button"
						onClick={onAddItem}
						disabled={!ready}
						className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
					>
						<ShoppingCart className="size-4" />
						Add items
					</button>
				</>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Customer picker
// ---------------------------------------------------------------------------

function CustomerPickerDialog({
	open,
	onOpenChange,
	customers,
	onPick,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	customers: CustomerWithRelations[];
	onPick: (id: string) => void;
}) {
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return customers.slice(0, 200);
		return customers
			.filter((c) => {
				const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
				return [name, c.code, c.phone ?? "", c.id_number ?? ""]
					.join(" ")
					.toLowerCase()
					.includes(q);
			})
			.slice(0, 200);
	}, [customers, query]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-0 p-0">
				<div className="border-b px-5 py-4">
					<DialogTitle className="text-base">Pick customer</DialogTitle>
					<DialogDescription className="sr-only">
						Search and select a customer for this walk-in sale.
					</DialogDescription>
					<div className="relative mt-3">
						<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							autoFocus
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by name, code, phone, or ID…"
							className="h-10 pl-9"
						/>
					</div>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto">
					{filtered.length === 0 ? (
						<div className="p-10 text-center text-sm text-muted-foreground">
							{query
								? `No customers match "${query}".`
								: "No customers available."}
						</div>
					) : (
						<ul className="divide-y">
							{filtered.map((c) => {
								const name = [c.first_name, c.last_name]
									.filter(Boolean)
									.join(" ");
								return (
									<li key={c.id}>
										<button
											type="button"
											onClick={() => onPick(c.id)}
											className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-muted/60"
										>
											<div className="flex min-w-0 flex-col gap-0.5">
												<div className="flex items-center gap-2">
													<span className="truncate font-semibold text-sm">
														{name || "Unnamed customer"}
													</span>
													{c.is_staff && (
														<span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
															STAFF
														</span>
													)}
													{c.is_vip && (
														<span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800">
															VIP
														</span>
													)}
												</div>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<span className="font-mono">{c.code}</span>
													{c.phone && <span>· {c.phone}</span>}
												</div>
											</div>
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
