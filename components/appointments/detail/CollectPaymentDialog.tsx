"use client";

import {
	CalendarPlus,
	CheckCircle2,
	ChevronsDownUp,
	ChevronsUpDown,
	Loader2,
	Percent,
	Printer,
	RefreshCw,
	ShoppingCart,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import {
	BillingItemPickerDialog,
	type CartEntry,
} from "@/components/appointments/BillingItemPickerDialog";
import { HeaderBar } from "@/components/appointments/detail/collect-payment/HeaderBar";
import {
	customerDisplay,
	money,
} from "@/components/appointments/detail/collect-payment/helpers";
import { LineItemRow } from "@/components/appointments/detail/collect-payment/LineItemRow";
import { McCard } from "@/components/appointments/detail/collect-payment/McCard";
import { hasMissingRequiredFields } from "@/components/appointments/detail/collect-payment/PaymentMethodFields";
import { PaymentSection } from "@/components/appointments/detail/collect-payment/PaymentSection";
import { TotalsPanel } from "@/components/appointments/detail/collect-payment/TotalsPanel";
import type { Line } from "@/components/appointments/detail/collect-payment/types";
import { useBillingLines } from "@/components/appointments/detail/collect-payment/use-billing-lines";
import { useEmployeeAllocations } from "@/components/appointments/detail/collect-payment/use-employee-allocations";
import { usePaymentAllocations } from "@/components/appointments/detail/collect-payment/use-payment-allocations";
import { usePayments } from "@/components/appointments/detail/collect-payment/use-payments";
import { useRounding } from "@/components/appointments/detail/collect-payment/use-rounding";
import { Button } from "@/components/ui/button";
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
	saveFrontdeskMessageAction,
} from "@/lib/actions/appointments";
import { collectAppointmentPaymentAction } from "@/lib/actions/sales";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { BillingSettings } from "@/lib/services/billing-settings";
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
import { resolveDefaultTaxId } from "@/lib/utils/resolve-default-tax";

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
	billingSettings?: BillingSettings | null;
	staffDiscountPercent: number;
	walletBalance: number | null;
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
	billingSettings,
	staffDiscountPercent,
	walletBalance,
	onSuccess,
	onError,
}: Props) {
	const router = useRouter();
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

	const [staffDiscountApplied, setStaffDiscountApplied] = useState(false);

	const isStaffCustomer = appointment.customer?.is_staff === true;
	const canApplyStaffDiscount =
		isStaffCustomer && billing.hasServiceLines && staffDiscountPercent > 0;

	const handleApplyStaffDiscount = useCallback(() => {
		billing.applyStaffDiscount(staffDiscountPercent);
		setStaffDiscountApplied(true);
	}, [billing, staffDiscountPercent]);

	// Auto-apply the staff discount once when the dialog opens for a staff
	// customer with service lines. Runs only on the open→true transition so
	// re-renders don't keep clobbering manual edits.
	useEffect(() => {
		if (!open) {
			setStaffDiscountApplied(false);
			return;
		}
		if (canApplyStaffDiscount && !staffDiscountApplied) {
			handleApplyStaffDiscount();
		}
		// We intentionally depend only on `open` so this fires once per open.
		// biome-ignore lint/correctness/useExhaustiveDependencies: run-once on open
	}, [open]);

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
	const initialFrontdeskMsg = appointment.frontdesk_message ?? "";
	const [frontdeskMsg, setFrontdeskMsg] = useState(initialFrontdeskMsg);
	const savedFrontdeskRef = useRef(initialFrontdeskMsg);

	// Re-sync the local message when the server prop changes (e.g. user edited
	// it in BillingSection while the dialog was closed). Don't stomp in-progress
	// typing — only adopt the new value if the user hasn't diverged locally.
	useEffect(() => {
		const incoming = appointment.frontdesk_message ?? "";
		if (incoming === savedFrontdeskRef.current) return;
		if (frontdeskMsg === savedFrontdeskRef.current) {
			setFrontdeskMsg(incoming);
		}
		savedFrontdeskRef.current = incoming;
	}, [appointment.frontdesk_message, frontdeskMsg]);

	const persistFrontdeskMessage = useCallback(async () => {
		const next = frontdeskMsg.trim();
		const prev = savedFrontdeskRef.current.trim();
		if (next === prev) return;
		try {
			await saveFrontdeskMessageAction(
				appointment.id,
				next.length > 0 ? next : null,
			);
			savedFrontdeskRef.current = frontdeskMsg;
			router.refresh();
		} catch {
			// Swallow — Collect submit re-sends the value via p_frontdesk_message
			// as a second line of defence, and a transient autosave failure
			// shouldn't block the operator at the counter.
		}
	}, [appointment.id, frontdeskMsg, router]);

	const [backdate, setBackdate] = useState(false);
	const [backdateValue, setBackdateValue] = useState("");
	const [pickerOpen, setPickerOpen] = useState(false);
	const [apptDialogOpen, setApptDialogOpen] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [formSuccess, setFormSuccess] = useState<string | null>(null);

	const [successData, setSuccessData] = useState<{
		salesOrderId: string;
		soNumber: string;
		invoiceNo: string;
		totalPaid: number;
	} | null>(null);

	// Warm the calendar route while the user is on the success step so the
	// Done click feels instant.
	useEffect(() => {
		if (successData) router.prefetch("/appointments");
	}, [successData, router]);

	// Reset the success step whenever the dialog is reopened after being closed.
	useEffect(() => {
		if (!open) setSuccessData(null);
	}, [open]);

	const handleDialogOpenChange = (nextOpen: boolean) => {
		if (!nextOpen && successData) {
			// Closing from the success step = Done. Navigate to the calendar.
			// successData is cleared by the reset-on-close effect, so the
			// success panel stays rendered through the dialog's exit animation.
			onOpenChange(false);
			router.push("/appointments");
			return;
		}
		onOpenChange(nextOpen);
	};

	const handlePrintInvoice = () => {
		if (!successData) return;
		window.open(`/invoices/${successData.salesOrderId}`, "_blank", "noopener");
		onOpenChange(false);
		router.push("/appointments");
	};

	const handleDone = () => {
		onOpenChange(false);
		router.push("/appointments");
	};

	const handleItemizedChange = useCallback(
		(v: boolean) => {
			empAlloc.setItemized(v);
			if (v) setExpandedIds(new Set(billing.lines.map((l) => l.id)));
		},
		[empAlloc, billing.lines],
	);

	const handlePickerCommit = (batch: CartEntry[]) => {
		const defaultTaxId = resolveDefaultTaxId(
			appointment.customer,
			billingSettings ?? null,
		);
		const newLines: Line[] = batch.map(({ selection, quantity }) => {
			const base = {
				id: crypto.randomUUID(),
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
					quantity,
					unit_price: Number(selection.service.price),
					tax_id: defaultTaxId,
				};
			}
			if (selection.type === "wallet_topup") {
				return {
					...base,
					service_id: null,
					inventory_item_id: selection.product.id,
					item_type: "wallet_topup",
					item_name: selection.product.name,
					sku: selection.product.sku ?? "",
					quantity: 1,
					unit_price: 0,
					tax_id: null,
				};
			}
			return {
				...base,
				service_id: null,
				inventory_item_id: selection.product.id,
				item_type: "product",
				item_name: selection.product.name,
				sku: selection.product.sku ?? "",
				quantity,
				unit_price: Number(selection.product.selling_price ?? 0),
				tax_id: defaultTaxId,
			};
		});
		billing.setLines((prev) => [...prev, ...newLines]);
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

	// A payment row is "incomplete" if the user added it but didn't finish
	// filling it in. These always block submit — either finish the row or
	// remove it with the trash button.
	const incompletePaymentRows = useMemo(
		() =>
			payments.payments.filter((p) => {
				const v = Number(p.amount);
				if (!Number.isFinite(v) || v <= 0) return true; // empty or zero amount
				if (!p.mode.trim()) return true; // method not selected
				if (!payments.methodByCode.get(p.mode)) return true; // unknown/inactive method
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
		empAlloc.itemizedInvalidLineIds.size > 0 ||
		hasIncompletePaymentRows ||
		hasMissingMethodFields;

	const blockerReason = disabled
		? billing.lines.length === 0
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
		if (hasIncompletePaymentRows) {
			setFormError(
				"One or more payment rows are incomplete (missing amount or method). Finish the row or remove it with the trash icon.",
			);
			return;
		}
		if (hasMissingMethodFields) {
			const missingMethod =
				payments.methodByCode.get(missingMethodFieldRows[0]?.mode ?? "")
					?.name ?? "selected method";
			setFormError(
				`The ${missingMethod} payment row is missing a required field. Fill the field(s) marked with *.`,
			);
			return;
		}

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

				const capturedTotalPaid = payments.totalPaid;

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
				onSuccess?.({
					sales_order_id: result.sales_order_id,
					so_number: result.so_number,
					invoice_no: result.invoice_no,
				});
				setSuccessData({
					salesOrderId: result.sales_order_id,
					soNumber: result.so_number,
					invoiceNo: result.invoice_no,
					totalPaid: capturedTotalPaid,
				});
			} catch (e) {
				const message =
					e instanceof Error ? e.message : "Failed to collect payment";
				setFormError(message);
				onError?.(message);
			}
		});
	};

	if (successData) {
		return (
			<Dialog open={open} onOpenChange={handleDialogOpenChange}>
				<DialogContent
					showCloseButton={false}
					className="flex w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
				>
					<DialogTitle className="sr-only">Payment collected</DialogTitle>
					<DialogDescription className="sr-only">
						Payment saved. Print the invoice or return to the calendar.
					</DialogDescription>

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
						<Button
							type="button"
							onClick={handlePrintInvoice}
							className="gap-1"
						>
							<Printer className="size-4" />
							Yes, print
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
									disabled={!canApplyStaffDiscount}
									onClick={handleApplyStaffDiscount}
									className="flex items-center gap-2 text-blue-600 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:opacity-50"
									title={
										!isStaffCustomer
											? "Customer is not flagged as staff"
											: !billing.hasServiceLines
												? "Add a service line first"
												: staffDiscountApplied
													? `Staff ${staffDiscountPercent}% applied. Click to reapply.`
													: `Apply staff ${staffDiscountPercent}% discount to all service lines`
									}
								>
									<Percent className="size-4" />
									{staffDiscountApplied
										? `Staff ${staffDiscountPercent}% applied`
										: "Apply Auto Discount to Cart Items?"}
									{staffDiscountApplied && (
										<span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
											ON
										</span>
									)}
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
							walletBalance={walletBalance}
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
										</span>
									</TooltipTrigger>
									<TooltipContent>
										{blockerReason ?? "Collect payment"}
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>

						<div className="mt-4 flex items-start gap-2">
							<div className="flex-1">
								<div className="text-xs font-medium text-muted-foreground">
									Message to frontdesk
								</div>
								<textarea
									value={frontdeskMsg}
									onChange={(e) => setFrontdeskMsg(e.target.value)}
									onBlur={persistFrontdeskMessage}
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
				currentCart={billing.lines.map((l) => ({
					id: l.id,
					item_type: l.item_type,
					name: l.item_name,
					sku: l.sku || null,
					quantity: l.quantity,
					unit_price: l.unit_price,
				}))}
				onRemoveExisting={(id) =>
					billing.setLines((prev) => prev.filter((l) => l.id !== id))
				}
				onCommit={handlePickerCommit}
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
