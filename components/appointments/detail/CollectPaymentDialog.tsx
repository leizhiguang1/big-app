"use client";

import {
	CalendarPlus,
	ChevronsDownUp,
	ChevronsUpDown,
	Loader2,
	Percent,
	RefreshCw,
	ShoppingCart,
} from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import {
	BillingItemPickerDialog,
	type BillingItemSelection,
} from "@/components/appointments/BillingItemPickerDialog";
import { HeaderBar } from "@/components/appointments/detail/collect-payment/HeaderBar";
import {
	customerDisplay,
	money,
} from "@/components/appointments/detail/collect-payment/helpers";
import { LineItemRow } from "@/components/appointments/detail/collect-payment/LineItemRow";
import { McCard } from "@/components/appointments/detail/collect-payment/McCard";
import { PaymentSection } from "@/components/appointments/detail/collect-payment/PaymentSection";
import { TotalsPanel } from "@/components/appointments/detail/collect-payment/TotalsPanel";
import type { Line } from "@/components/appointments/detail/collect-payment/types";
import { useBillingLines } from "@/components/appointments/detail/collect-payment/use-billing-lines";
import { useEmployeeAllocations } from "@/components/appointments/detail/collect-payment/use-employee-allocations";
import { usePaymentAllocations } from "@/components/appointments/detail/collect-payment/use-payment-allocations";
import { usePayments } from "@/components/appointments/detail/collect-payment/use-payments";
import { useRounding } from "@/components/appointments/detail/collect-payment/use-rounding";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	listPastLineItemsForCustomerAction,
	saveAllocationsForAppointmentAction,
} from "@/lib/actions/appointments";
import { collectAppointmentPaymentAction } from "@/lib/actions/sales";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
import type { MedicalCertificateWithRefs } from "@/lib/services/medical-certificates";
import type { OutletWithRoomCount, Room } from "@/lib/services/outlets";
import type { PaymentMethod } from "@/lib/services/payment-methods";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";
import { cn } from "@/lib/utils";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appointment: AppointmentWithRelations;
	entries: AppointmentLineItem[];
	services: ServiceWithCategory[];
	products: InventoryItemWithRefs[];
	taxes: Tax[];
	outletName: string | null;
	allEmployees: EmployeeWithRelations[];
	paymentMethods: PaymentMethod[];
	customers: CustomerWithRelations[];
	rosterEmployees: RosterEmployee[];
	rooms: Room[];
	allOutlets: OutletWithRoomCount[];
	shifts: EmployeeShift[];
	medicalCertificates?: MedicalCertificateWithRefs[];
	onSuccess?: (result: {
		sales_order_id: string;
		so_number: string;
		invoice_no: string;
	}) => void;
	onError?: (message: string) => void;
};

export function CollectPaymentDialog({
	open,
	onOpenChange,
	appointment,
	entries,
	services,
	products,
	taxes,
	outletName,
	allEmployees,
	paymentMethods,
	customers,
	rosterEmployees,
	rooms,
	allOutlets,
	shifts,
	medicalCertificates,
	onSuccess,
	onError,
}: Props) {
	const [isPending, startTransition] = useTransition();
	const [isLoadingRepeat, startRepeatTransition] = useTransition();

	const billing = useBillingLines(entries, services, taxes);
	const rounding = useRounding(billing.rawTotal);
	const payments = usePayments(paymentMethods, rounding.total, open);
	const payAlloc = usePaymentAllocations({
		lines: billing.lines,
		lineNets: billing.lineNets,
		isUnderpaid: payments.isUnderpaid,
		total: rounding.total,
		totalPaid: payments.totalPaid,
		requiresFullFor: billing.requiresFullFor,
	});
	const empAlloc = useEmployeeAllocations({
		assignedEmpId: appointment.employee?.id ?? null,
		lines: billing.lines,
		entries,
	});

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
		billing.lines.length > 0 &&
		billing.lines.every((l) => expandedIds.has(l.id));
	const toggleAll = () => {
		if (allExpanded) setExpandedIds(new Set());
		else setExpandedIds(new Set(billing.lines.map((l) => l.id)));
	};

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
	const [frontdeskMsg, setFrontdeskMsg] = useState(
		appointment.frontdesk_message ?? "",
	);
	const [backdate, setBackdate] = useState(false);
	const [backdateValue, setBackdateValue] = useState("");
	const [pickerOpen, setPickerOpen] = useState(false);
	const [apptDialogOpen, setApptDialogOpen] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [formSuccess, setFormSuccess] = useState<string | null>(null);

	const handleItemizedChange = useCallback(
		(v: boolean) => {
			empAlloc.setItemized(v);
			if (v) setExpandedIds(new Set(billing.lines.map((l) => l.id)));
		},
		[empAlloc, billing.lines],
	);

	const handlePickerSelect = (sel: BillingItemSelection) => {
		const newLine: Line =
			sel.type === "service"
				? {
						id: crypto.randomUUID(),
						service_id: sel.service.id,
						inventory_item_id: null,
						item_type: "service",
						item_name: sel.service.name,
						sku: sel.service.sku ?? "",
						quantity: 1,
						unit_price: Number(sel.service.price),
						tax_id: null,
						discount_type: "amount",
						discount_input: "",
						tooth_number: "",
						surface: "",
						remarks: "",
					}
				: {
						id: crypto.randomUUID(),
						service_id: null,
						inventory_item_id: sel.product.id,
						item_type: "product",
						item_name: sel.product.name,
						sku: sel.product.sku ?? "",
						quantity: 1,
						unit_price: Number(sel.product.selling_price ?? 0),
						tax_id: null,
						discount_type: "amount",
						discount_input: "",
						tooth_number: "",
						surface: "",
						remarks: "",
					};
		billing.setLines((prev) => [...prev, newLine]);
		setPickerOpen(false);
	};

	const handleRepeatPreviousItems = () => {
		if (!appointment.customer_id) return;
		startRepeatTransition(async () => {
			try {
				const pastItems = await listPastLineItemsForCustomerAction(
					appointment.customer_id!,
				);
				const filtered = pastItems.filter(
					(item) => item.appointment?.id !== appointment.id,
				);
				if (filtered.length === 0) {
					setFormError("No previous billing items found for this customer.");
					return;
				}
				const seen = new Set<string>();
				const unique = filtered.filter((item) => {
					const key = `${item.service_id ?? ""}_${item.description}`;
					if (seen.has(key)) return false;
					seen.add(key);
					return true;
				});
				const newLines: Line[] = unique.slice(0, 20).map((item) => ({
					id: crypto.randomUUID(),
					service_id: item.service_id,
					inventory_item_id: item.product_id ?? null,
					item_type: (item.item_type as Line["item_type"]) ?? "service",
					item_name: item.description,
					sku: "",
					quantity: Number(item.quantity),
					unit_price: Number(item.unit_price),
					tax_id: item.tax_id ?? null,
					discount_type: "amount" as const,
					discount_input: "",
					tooth_number: "",
					surface: "",
					remarks: "",
				}));
				billing.setLines((prev) => [...prev, ...newLines]);
			} catch {
				setFormError("Failed to load previous items.");
			}
		});
	};

	const customer = customerDisplay(appointment);

	const anyPartialAllowed = useMemo(
		() => billing.lines.some((l) => !billing.requiresFullFor(l)),
		[billing.lines, billing.requiresFullFor],
	);
	const forcesFullPayment = !anyPartialAllowed && billing.lines.length > 0;

	const amountValid = payments.totalPaid > 0;

	const disabled =
		isPending ||
		billing.lines.length === 0 ||
		!amountValid ||
		rounding.roundingExceedsLimit ||
		payments.isOverpaid ||
		(forcesFullPayment && payments.isUnderpaid) ||
		payAlloc.anyRequiredUnder ||
		payAlloc.anyLineOverAllocated ||
		payAlloc.allocSumMismatch ||
		empAlloc.globalAllocInvalid ||
		empAlloc.itemizedInvalidLineIds.size > 0;

	const handleSubmit = () => {
		setFormError(null);
		if (billing.lines.length === 0) {
			setFormError("Add at least one billing item before collecting payment.");
			return;
		}
		if (!amountValid) {
			setFormError("Enter the payment amount.");
			return;
		}
		if (rounding.roundingExceedsLimit) {
			setFormError("Rounding adjustment cannot exceed RM 1.00.");
			return;
		}
		// No two payment rows may share a method — split tender is about
		// multiple *modes*.
		{
			const filled = payments.payments.filter((p) => {
				const v = Number(p.amount);
				return Number.isFinite(v) && v > 0;
			});
			const seen = new Set<string>();
			for (const p of filled) {
				if (seen.has(p.mode)) {
					const dup = payments.methodByCode.get(p.mode)?.name ?? p.mode;
					setFormError(
						`Payment method "${dup}" appears twice. Merge the amounts or pick a different method.`,
					);
					return;
				}
				seen.add(p.mode);
			}
		}
		if (payments.isOverpaid) {
			setFormError(
				`Collected RM ${money(payments.totalPaid)} exceeds bill total RM ${money(rounding.total)}. Reduce the payment or use the "Set to Total" helper.`,
			);
			return;
		}
		if (forcesFullPayment && payments.isUnderpaid) {
			setFormError(
				`All items require full payment. Collect RM ${money(rounding.total)} or remove/replace items before proceeding.`,
			);
			return;
		}
		if (payAlloc.anyRequiredUnder) {
			setFormError(
				"Some items require full payment but their allocation is below the net total. Adjust allocations or tap Auto-allocate.",
			);
			return;
		}
		if (payAlloc.anyLineOverAllocated) {
			setFormError("A line's payment allocation exceeds its own total.");
			return;
		}
		if (payAlloc.allocSumMismatch) {
			const diff = payments.totalPaid - payAlloc.allocSum;
			setFormError(
				diff > 0
					? `Allocated RM ${money(payAlloc.allocSum)} is less than paid RM ${money(payments.totalPaid)} (short by RM ${money(diff)}). Tap Auto-allocate or distribute the remainder.`
					: `Allocated RM ${money(payAlloc.allocSum)} exceeds paid RM ${money(payments.totalPaid)}. Reduce one of the line allocations.`,
			);
			return;
		}
		if (empAlloc.globalAllocInvalid) {
			setFormError(
				`Employee allocation is ${empAlloc.globalEmpSum.toFixed(0)}% — must equal 100%. Tap Balance or adjust the slots.`,
			);
			return;
		}
		if (empAlloc.itemizedInvalidLineIds.size > 0) {
			setFormError(
				`${empAlloc.itemizedInvalidLineIds.size} item${empAlloc.itemizedInvalidLineIds.size > 1 ? "s" : ""} have employee allocations that don't sum to 100%.`,
			);
			return;
		}

		// Open the invoice tab synchronously inside the click handler so the
		// browser treats it as a user-initiated popup.
		const invoiceWindow = window.open("about:blank", "_blank");

		startTransition(async () => {
			try {
				const allocPayload = empAlloc.buildAllocationsPayload();
				if (allocPayload.length > 0) {
					await saveAllocationsForAppointmentAction(
						appointment.id,
						allocPayload,
					);
				}

				const allocations = payments.isUnderpaid
					? billing.lines.map((_l, i) => ({
							item_index: i,
							amount: payAlloc.allocNums[i] ?? 0,
						}))
					: null;

				const result = await collectAppointmentPaymentAction(appointment.id, {
					items: billing.lines.map((l, i) => ({
						service_id: l.service_id,
						inventory_item_id: l.inventory_item_id,
						sku: null,
						item_name: l.item_name,
						item_type: l.item_type,
						quantity: l.quantity,
						unit_price: l.unit_price,
						discount: billing.lineDiscounts[i] ?? 0,
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
					remarks: remarks.trim() || null,
					sold_at:
						backdate && backdateValue
							? new Date(backdateValue).toISOString()
							: null,
					frontdesk_message: frontdeskMsg.trim() || null,
				});
				const printUrl = `/sales/${result.sales_order_id}/print`;
				if (invoiceWindow && !invoiceWindow.closed) {
					invoiceWindow.location.href = printUrl;
				} else {
					window.open(printUrl, "_blank");
				}
				onOpenChange(false);
				onSuccess?.({
					sales_order_id: result.sales_order_id,
					so_number: result.so_number,
					invoice_no: result.invoice_no,
				});
			} catch (e) {
				if (invoiceWindow && !invoiceWindow.closed) invoiceWindow.close();
				const message =
					e instanceof Error ? e.message : "Failed to collect payment";
				setFormError(message);
				onError?.(message);
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				onPointerDownOutside={(e) => {
					if (!apptDialogOpen) e.preventDefault();
				}}
				onInteractOutside={(e) => {
					if (!apptDialogOpen) e.preventDefault();
				}}
				className="flex max-h-[92vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
			>
				<DialogTitle className="sr-only">Collect payment</DialogTitle>
				<DialogDescription className="sr-only">
					Review billing items and collect payment for this appointment
				</DialogDescription>

				<HeaderBar
					customerName={customer.name}
					customerCode={customer.code}
					total={rounding.total}
					itemized={empAlloc.itemized}
					onItemizedChange={handleItemizedChange}
					globalAlloc={empAlloc.globalAlloc}
					allEmployees={allEmployees}
					onGlobalEmpChange={empAlloc.setGlobalEmployee}
					onGlobalPercentChange={empAlloc.setGlobalPercent}
					onBalanceGlobal={empAlloc.balanceGlobalEmployee}
					onClose={() => onOpenChange(false)}
					closeDisabled={isPending}
				/>

				<div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_360px]">
					{/* LEFT COLUMN */}
					<div className="flex min-h-0 flex-col overflow-y-auto border-r bg-slate-50/40 px-5 pt-4 pb-10">
						<div className="mb-2 grid grid-cols-[1fr_56px_96px_80px_24px] items-center gap-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
							<span>Product/Service</span>
							<span className="text-center">Qty</span>
							<span className="text-right">Unit (MYR)</span>
							<span className="text-right">Total (MYR)</span>
							<span />
						</div>

						<div className="rounded-md border bg-white shadow-sm">
							{billing.lines.length === 0 ? (
								<div className="px-3 py-8 text-center text-sm text-muted-foreground">
									No billing items. Add services in the Billing tab first.
								</div>
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
										{billing.lines.map((l, i) => (
											<LineItemRow
												key={l.id}
												line={l}
												lineDiscount={billing.lineDiscounts[i] ?? 0}
												lineNet={billing.lineNets[i] ?? 0}
												taxes={taxes}
												service={
													l.service_id
														? (billing.serviceById.get(l.service_id) ?? null)
														: null
												}
												capPct={billing.capFor(l.service_id)}
												requiresFullPay={billing.requiresFullFor(l)}
												isExpanded={expandedIds.has(l.id)}
												onToggleExpanded={() => toggleExpanded(l.id)}
												remarksOpen={remarksOpenIds.has(l.id)}
												onToggleRemarks={() => toggleRemarks(l.id)}
												updateLine={(patch) => billing.updateLine(l.id, patch)}
												clampUnitPrice={() => billing.clampUnitPrice(l.id)}
												clampDiscount={() =>
													billing.clampLineDiscountInput(l.id)
												}
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
												allEmployees={allEmployees}
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
									className="flex items-center gap-2 text-blue-600 hover:underline"
								>
									<ShoppingCart className="size-4" />
									Add Item to Cart
								</button>
								<button
									type="button"
									onClick={handleRepeatPreviousItems}
									disabled={isLoadingRepeat || !appointment.customer_id}
									className="flex items-center gap-2 text-blue-600 hover:underline disabled:opacity-60"
								>
									{isLoadingRepeat ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<RefreshCw className="size-4" />
									)}
									Repeat Medication
								</button>
								<button
									type="button"
									disabled
									className="flex items-center gap-2 text-muted-foreground disabled:opacity-50"
									title="Coming soon"
								>
									<Percent className="size-4" />
									Apply Auto Discount to Cart Items?
								</button>
							</div>

							<TotalsPanel
								totalTax={billing.totalTax}
								totalDiscount={billing.totalDiscount}
								rawTotal={billing.rawTotal}
								total={rounding.total}
								rounding={rounding.rounding}
								requireRounding={rounding.requireRounding}
								setRequireRounding={rounding.setRequireRounding}
								roundedTotalInput={rounding.roundedTotalInput}
								setRoundedTotalInput={rounding.setRoundedTotalInput}
								roundingExceedsLimit={rounding.roundingExceedsLimit}
								totalPaid={payments.totalPaid}
								balanceDiff={payments.balanceDiff}
								isOverpaid={payments.isOverpaid}
								isUnderpaid={payments.isUnderpaid}
								linesCount={billing.lines.length}
								allocSum={payAlloc.allocSum}
								allocSumMismatch={payAlloc.allocSumMismatch}
								autoAllocatePartial={payAlloc.autoAllocatePartial}
								forcesFullPayment={forcesFullPayment}
							/>
						</div>
					</div>

					{/* RIGHT COLUMN */}
					<div className="flex min-h-0 flex-col overflow-y-auto bg-white px-5 py-4">
						<McCard medicalCertificates={medicalCertificates} />

						<PaymentSection
							payments={payments.payments}
							paymentMethods={paymentMethods}
							methodByCode={payments.methodByCode}
							total={rounding.total}
							isOverpaid={payments.isOverpaid}
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
							This Sales will be created at{" "}
							<span className="font-semibold text-blue-600">
								{outletName ?? "Unknown outlet"}
							</span>
						</div>

						<div className="mt-3 flex items-center justify-end gap-2">
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={() => setApptDialogOpen(true)}
											className="flex size-12 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 shadow-sm transition hover:bg-blue-100"
											aria-label="Create appointment"
										>
											<CalendarPlus className="size-5" />
										</button>
									</TooltipTrigger>
									<TooltipContent>Create appointment</TooltipContent>
								</Tooltip>
							</TooltipProvider>

							<button
								type="button"
								onClick={handleSubmit}
								disabled={disabled}
								className={cn(
									"flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
								)}
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
						</div>

						<div className="mt-4 flex items-start gap-2">
							<div className="flex-1">
								<div className="text-xs font-medium text-muted-foreground">
									Message to frontdesk
								</div>
								<textarea
									value={frontdeskMsg}
									onChange={(e) => setFrontdeskMsg(e.target.value)}
									className="mt-1 min-h-[50px] w-full resize-none rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring"
								/>
							</div>
						</div>

						{formSuccess && (
							<div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
								{formSuccess}
							</div>
						)}
						{formError && (
							<div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
								{formError}
							</div>
						)}
					</div>
				</div>
			</DialogContent>

			<BillingItemPickerDialog
				open={pickerOpen}
				onOpenChange={setPickerOpen}
				services={services}
				products={products}
				onSelect={handlePickerSelect}
			/>

			<AppointmentDialog
				open={apptDialogOpen}
				onClose={() => setApptDialogOpen(false)}
				outletId={appointment.outlet_id}
				appointment={null}
				prefill={{
					startAt: new Date().toISOString(),
					endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
					employeeId: appointment.employee_id ?? null,
					roomId: null,
					customerId: appointment.customer_id ?? null,
				}}
				customers={customers}
				employees={rosterEmployees}
				rooms={rooms}
				allOutlets={allOutlets}
				allEmployees={allEmployees}
				shifts={shifts}
				hideBlockTab
				onSuccess={() => {
					setFormSuccess("Appointment created successfully");
					setTimeout(() => setFormSuccess(null), 3000);
				}}
			/>
		</Dialog>
	);
}
