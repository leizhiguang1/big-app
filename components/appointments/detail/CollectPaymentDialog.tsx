"use client";

import {
	CalendarPlus,
	ChevronDown,
	ChevronUp,
	ChevronsDownUp,
	ChevronsUpDown,
	FileText,
	Loader2,
	Percent,
	Plus,
	RefreshCw,
	ShoppingCart,
	Trash2,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { listPastLineItemsForCustomerAction } from "@/lib/actions/appointments";
import { collectAppointmentPaymentAction } from "@/lib/actions/sales";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import {
	BillingItemPickerDialog,
	type BillingItemSelection,
} from "@/components/appointments/BillingItemPickerDialog";
import { EmployeePicker } from "@/components/employees/EmployeePicker";
import { saveAllocationsForAppointmentAction } from "@/lib/actions/appointments";
import {
	PAYMENT_BANKS,
	PAYMENT_CARD_TYPES,
	PAYMENT_EPS_MONTHS,
} from "@/lib/constants/payment-fields";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
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
	onSuccess?: (result: { so_number: string; invoice_no: string }) => void;
	onError?: (message: string) => void;
};

type DiscountType = "percent" | "amount";

type Allocation = { employeeId: string; percent: number };

type Line = {
	id: string;
	service_id: string | null;
	inventory_item_id: string | null;
	item_type: "service" | "product" | "charge";
	item_name: string;
	sku: string;
	quantity: number;
	unit_price: number;
	tax_id: string | null;
	discount_type: DiscountType;
	discount_input: string;
	tooth_number: string;
	surface: string;
	remarks: string;
};

type PaymentEntry = {
	key: string;
	mode: string;
	amount: string;
	remarks: string;
	bank: string;
	card_type: string;
	trace_no: string;
	approval_code: string;
	reference_no: string;
	months: string;
};

function emptyPayment(mode: string): PaymentEntry {
	return {
		key: crypto.randomUUID(),
		mode,
		amount: "",
		remarks: "",
		bank: "",
		card_type: "",
		trace_no: "",
		approval_code: "",
		reference_no: "",
		months: "",
	};
}

function toLine(e: AppointmentLineItem, services: ServiceWithCategory[]): Line {
	const svc = e.service_id
		? services.find((s) => s.id === e.service_id)
		: null;
	return {
		id: e.id,
		service_id: e.service_id,
		inventory_item_id: e.product_id ?? null,
		item_type: (e.item_type as Line["item_type"]) ?? "service",
		item_name: e.description,
		sku: svc?.sku ?? "",
		quantity: Number(e.quantity),
		unit_price: Number(e.unit_price),
		tax_id: e.tax_id ?? null,
		discount_type: "amount",
		discount_input: "",
		tooth_number: (e as Record<string, unknown>).tooth_number as string ?? "",
		surface: (e as Record<string, unknown>).surface as string ?? "",
		remarks: e.notes ?? "",
	};
}

function lineGross(line: Line): number {
	return Math.max(0, line.quantity * line.unit_price);
}

function capMyrForLine(line: Line, capPct: number | null): number | null {
	if (capPct == null) return null;
	return Math.round(lineGross(line) * capPct) / 100;
}

function computeLineDiscount(line: Line, capPct: number | null): number {
	const raw = Number(line.discount_input);
	if (!Number.isFinite(raw) || raw <= 0) return 0;
	const gross = lineGross(line);
	const asMyr =
		line.discount_type === "percent"
			? Math.round(((raw * gross) / 100) * 100) / 100
			: raw;
	const capMyr = capMyrForLine(line, capPct);
	const ceiling = capMyr == null ? gross : Math.min(gross, capMyr);
	return Math.max(0, Math.min(asMyr, ceiling));
}

function lineTaxAmount(line: Line, taxes: Tax[], discountMyr: number): number {
	if (!line.tax_id) return 0;
	const tax = taxes.find((t) => t.id === line.tax_id);
	if (!tax) return 0;
	const base = Math.max(0, lineGross(line) - discountMyr);
	return Math.round(base * Number(tax.rate_pct)) / 100;
}

function money(n: number) {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function customerDisplay(a: AppointmentWithRelations) {
	if (a.customer) {
		const name = [a.customer.first_name, a.customer.last_name]
			.filter(Boolean)
			.join(" ");
		return { name: name || "Customer", code: a.customer.code };
	}
	if (a.is_time_block) {
		return { name: a.block_title || "Time block", code: "" };
	}
	return { name: a.lead_name || "Walk-in lead", code: "LEAD" };
}

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
	onSuccess,
	onError,
}: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [lines, setLines] = useState<Line[]>(() =>
		entries.map((e) => toLine(e, services)),
	);
	useEffect(() => {
		setLines(entries.map((e) => toLine(e, services)));
	}, [entries, services]);

	// Track which cards are expanded (by line id)
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
	const toggleExpanded = (id: string) =>
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	const allExpanded = lines.length > 0 && lines.every((l) => expandedIds.has(l.id));
	const toggleAll = () => {
		if (allExpanded) {
			setExpandedIds(new Set());
		} else {
			setExpandedIds(new Set(lines.map((l) => l.id)));
		}
	};

	// Remarks sub-section collapsed state
	const [remarksOpenIds, setRemarksOpenIds] = useState<Set<string>>(new Set());
	const toggleRemarks = (id: string) =>
		setRemarksOpenIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const serviceById = useMemo(() => {
		const map = new Map<string, ServiceWithCategory>();
		for (const s of services) map.set(s.id, s);
		return map;
	}, [services]);

	const capByServiceId = useMemo(() => {
		const map = new Map<string, number>();
		for (const s of services) {
			if (s.discount_cap != null) map.set(s.id, Number(s.discount_cap));
		}
		return map;
	}, [services]);
	const capFor = (serviceId: string | null): number | null =>
		serviceId ? (capByServiceId.get(serviceId) ?? null) : null;

	const updateLine = (id: string, patch: Partial<Line>) =>
		setLines((rows) =>
			rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
		);

	const clampLineDiscountInput = (id: string) => {
		setLines((rows) =>
			rows.map((r) => {
				if (r.id !== id) return r;
				const raw = Number(r.discount_input);
				if (!Number.isFinite(raw) || raw <= 0) {
					return { ...r, discount_input: "" };
				}
				const gross = lineGross(r);
				const capPct = capFor(r.service_id);
				if (r.discount_type === "percent") {
					const ceilingPct = capPct != null ? Math.min(100, capPct) : 100;
					const next = Math.min(raw, ceilingPct);
					return {
						...r,
						discount_input: next === raw ? r.discount_input : String(next),
					};
				}
				const capMyr =
					capPct == null
						? gross
						: Math.min(gross, capMyrForLine(r, capPct) ?? gross);
				const next = Math.min(raw, capMyr);
				return {
					...r,
					discount_input: next === raw ? r.discount_input : next.toFixed(2),
				};
			}),
		);
	};

	// Clamp unit price to service range on blur
	const clampUnitPrice = (id: string) => {
		setLines((rows) =>
			rows.map((r) => {
				if (r.id !== id || !r.service_id) return r;
				const svc = serviceById.get(r.service_id);
				if (!svc) return r;
				const min = svc.price_min != null ? Number(svc.price_min) : null;
				const max = svc.price_max != null ? Number(svc.price_max) : null;
				let price = r.unit_price;
				if (min != null && price < min) price = min;
				if (max != null && price > max) price = max;
				return price === r.unit_price ? r : { ...r, unit_price: price };
			}),
		);
	};

	// Rounding
	const [requireRounding, setRequireRounding] = useState(false);
	const [roundedTotalInput, setRoundedTotalInput] = useState("");

	// Multi-payment
	const methodByCode = useMemo(() => {
		const map = new Map<string, PaymentMethod>();
		for (const m of paymentMethods) map.set(m.code, m);
		return map;
	}, [paymentMethods]);
	const defaultMethodCode = paymentMethods[0]?.code ?? "cash";
	const [payments, setPayments] = useState<PaymentEntry[]>([
		emptyPayment(defaultMethodCode),
	]);
	const addPaymentEntry = () => {
		if (payments.length >= 5) return;
		setPayments((prev) => [...prev, emptyPayment(defaultMethodCode)]);
	};
	const removePaymentEntry = (key: string) => {
		setPayments((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.key !== key)));
	};
	const updatePayment = (key: string, patch: Partial<PaymentEntry>) =>
		setPayments((prev) =>
			prev.map((p) => (p.key === key ? { ...p, ...patch } : p)),
		);
	// Switching method wipes field values — old inputs never belong to the new one.
	const changePaymentMethod = (key: string, mode: string) =>
		setPayments((prev) =>
			prev.map((p) =>
				p.key === key
					? { ...emptyPayment(mode), key: p.key, amount: p.amount }
					: p,
			),
		);

	const [remarks, setRemarks] = useState("");
	const [frontdeskMsg, setFrontdeskMsg] = useState(
		appointment.notes ?? "",
	);
	const [backdate, setBackdate] = useState(false);
	const [backdateValue, setBackdateValue] = useState("");
	const [pickerOpen, setPickerOpen] = useState(false);
	const [isLoadingRepeat, startRepeatTransition] = useTransition();
	const [itemized, setItemized] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [apptDialogOpen, setApptDialogOpen] = useState(false);

	// Allocation state
	const assignedEmpId = appointment.employee?.id ?? null;
	const makeEmptySlots = (): Allocation[] => [
		{ employeeId: assignedEmpId ?? "", percent: assignedEmpId ? 100 : 0 },
		{ employeeId: "", percent: 0 },
		{ employeeId: "", percent: 0 },
	];
	const redistribute = (allocs: Allocation[]): Allocation[] => {
		const filledCount = allocs.filter((a) => a.employeeId).length;
		if (filledCount === 0) return allocs.map((a) => ({ ...a, percent: 0 }));
		const even = Math.floor(100 / filledCount);
		const remainder = 100 - even * filledCount;
		let firstAssigned = false;
		return allocs.map((a) => {
			if (!a.employeeId) return { ...a, percent: 0 };
			if (!firstAssigned) {
				firstAssigned = true;
				return { ...a, percent: even + remainder };
			}
			return { ...a, percent: even };
		});
	};

	const [globalAlloc, setGlobalAlloc] = useState<Allocation[]>(makeEmptySlots);
	const [lineAlloc, setLineAlloc] = useState<Map<string, Allocation[]>>(
		() => new Map(),
	);

	const setGlobalEmployee = (idx: number, empId: string | null) => {
		setGlobalAlloc((prev) =>
			redistribute(
				prev.map((a, i) =>
					i === idx ? { ...a, employeeId: empId ?? "" } : a,
				),
			),
		);
	};
	const setGlobalPercent = (idx: number, pct: number) => {
		setGlobalAlloc((prev) =>
			prev.map((a, i) => (i === idx ? { ...a, percent: pct } : a)),
		);
	};

	const getLineAlloc = (lineId: string): Allocation[] =>
		lineAlloc.get(lineId) ?? makeEmptySlots();
	const setLineAllocForLine = (lineId: string, allocs: Allocation[]) =>
		setLineAlloc((prev) => new Map(prev).set(lineId, allocs));
	const setLineEmployee = (
		lineId: string,
		idx: number,
		empId: string | null,
	) => {
		const cur = getLineAlloc(lineId);
		setLineAllocForLine(
			lineId,
			redistribute(
				cur.map((a, i) => (i === idx ? { ...a, employeeId: empId ?? "" } : a)),
			),
		);
	};
	const setLinePercent = (lineId: string, idx: number, pct: number) => {
		const cur = getLineAlloc(lineId);
		setLineAllocForLine(
			lineId,
			cur.map((a, i) => (i === idx ? { ...a, percent: pct } : a)),
		);
	};

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
		setLines((prev) => [...prev, newLine]);
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
				setLines((prev) => [...prev, ...newLines]);
			} catch {
				setFormError("Failed to load previous items.");
			}
		});
	};

	const customer = customerDisplay(appointment);

	const lineDiscounts = useMemo(
		() =>
			lines.map((l) =>
				computeLineDiscount(
					l,
					l.service_id ? (capByServiceId.get(l.service_id) ?? null) : null,
				),
			),
		[lines, capByServiceId],
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
				(sum, l, i) => sum + lineTaxAmount(l, taxes, lineDiscounts[i] ?? 0),
				0,
			),
		[lines, taxes, lineDiscounts],
	);

	const rawTotal = Math.max(0, subtotal - totalDiscount + totalTax);

	// Rounding: compute from rounded total input
	const rounding = useMemo(() => {
		if (!requireRounding) return 0;
		const parsed = Number(roundedTotalInput);
		if (!Number.isFinite(parsed)) return 0;
		return Math.round((parsed - rawTotal) * 100) / 100;
	}, [requireRounding, roundedTotalInput, rawTotal]);

	const roundingExceedsLimit = requireRounding && Math.abs(rounding) > 1;

	const total = Math.max(0, rawTotal + rounding);

	// Multi-payment totals
	const totalPaid = useMemo(
		() =>
			payments.reduce((sum, p) => {
				const v = Number(p.amount);
				return sum + (Number.isFinite(v) && v > 0 ? v : 0);
			}, 0),
		[payments],
	);
	const balance = Math.max(0, total - totalPaid);

	// Payment allocation per line
	const [linePayAlloc, setLinePayAlloc] = useState<Map<string, string>>(
		() => new Map(),
	);
	const getLinePayAlloc = (id: string) => linePayAlloc.get(id) ?? "";
	const setLinePayAllocVal = (id: string, val: string) =>
		setLinePayAlloc((prev) => new Map(prev).set(id, val));

	// Auto-fill allocations when total paid >= total
	useEffect(() => {
		if (totalPaid >= total && total > 0) {
			const next = new Map<string, string>();
			for (let i = 0; i < lines.length; i++) {
				const disc = lineDiscounts[i] ?? 0;
				const net = Math.max(0, lineGross(lines[i]) - disc);
				const tax = lineTaxAmount(lines[i], taxes, disc);
				next.set(lines[i].id, (net + tax).toFixed(2));
			}
			setLinePayAlloc(next);
		}
	}, [totalPaid, total, lines, lineDiscounts, taxes]);

	const amountValid = totalPaid > 0;

	const handleSubmit = () => {
		setFormError(null);
		if (lines.length === 0) {
			setFormError("Add at least one billing item before collecting payment.");
			return;
		}
		if (!amountValid) {
			setFormError("Enter the payment amount.");
			return;
		}
		// Validate rounding
		if (roundingExceedsLimit) {
			setFormError("Rounding adjustment cannot exceed RM 1.00.");
			return;
		}

		startTransition(async () => {
			try {
				// Save employee allocations for real appointment line items
				const entryIds = new Set(entries.map((e) => e.id));
				const allocPayload: {
					lineItemId: string;
					employees: { employee_id: string; percent: number }[];
				}[] = [];
				for (const line of lines) {
					if (!entryIds.has(line.id)) continue;
					const allocs = itemized
						? getLineAlloc(line.id)
						: globalAlloc;
					const valid = allocs.filter((a) => a.employeeId);
					if (valid.length > 0) {
						allocPayload.push({
							lineItemId: line.id,
							employees: valid.map((a) => ({
								employee_id: a.employeeId,
								percent: a.percent,
							})),
						});
					}
				}
				if (allocPayload.length > 0) {
					await saveAllocationsForAppointmentAction(
						appointment.id,
						allocPayload,
					);
				}

				// Build allocations array for the RPC
				const allocations = totalPaid < total
					? lines.map((l, i) => ({
							item_index: i,
							amount: Number(linePayAlloc.get(l.id) || "0"),
						}))
					: null;

				const result = await collectAppointmentPaymentAction(appointment.id, {
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
					rounding,
					payments: payments
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
					so_number: result.so_number,
					invoice_no: result.invoice_no,
				});
				onOpenChange(false);
				router.refresh();
			} catch (e) {
				const message =
					e instanceof Error ? e.message : "Failed to collect payment";
				setFormError(message);
				onError?.(message);
			}
		});
	};

	const disabled = isPending || lines.length === 0 || !amountValid || roundingExceedsLimit;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				onPointerDownOutside={(e) => e.preventDefault()}
				onInteractOutside={(e) => e.preventDefault()}
				className="flex max-h-[92vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
			>
				<DialogTitle className="sr-only">Collect payment</DialogTitle>

				{/* Header bar */}
				<div className="flex items-start justify-between border-b bg-white px-6 py-3">
					<div className="flex flex-col">
						<div className="text-lg font-semibold tracking-wide text-blue-600">
							{customer.name.toUpperCase()}
						</div>
						{customer.code && (
							<div className="text-xs text-muted-foreground">
								{customer.code}
							</div>
						)}
						<div className="mt-0.5 text-xs text-muted-foreground">
							MYR {money(total)}
						</div>
						<div className="text-[10px] text-muted-foreground">
							Cash / Wallet
						</div>
					</div>

					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground">
								Itemised Allocation?
							</span>
							<Toggle checked={itemized} onCheckedChange={setItemized} />
						</div>

						{/* Global allocation slots (shown when NOT itemised) */}
						{!itemized &&
							(() => {
								const filled = globalAlloc.filter((a) => a.employeeId);
								const sum = filled.reduce((s, a) => s + a.percent, 0);
								return (
									<div className="flex items-end gap-2">
										{globalAlloc.map((slot, idx) => (
											<div
												key={`global-${idx}`}
												className="flex flex-col items-center gap-1"
											>
												<EmployeePicker
													employees={allEmployees}
													value={slot.employeeId || null}
													onChange={(id) => setGlobalEmployee(idx, id)}
													size="sm"
													placeholder={`Employee ${idx + 1}`}
												/>
												{slot.employeeId ? (
													<div className="flex items-center gap-0.5">
														<input
															type="number"
															min={0}
															max={100}
															step="0.01"
															value={slot.percent}
															onChange={(e) =>
																setGlobalPercent(
																	idx,
																	Number(e.target.value) || 0,
																)
															}
															className="h-5 w-14 rounded border bg-background px-1 text-center text-[10px] tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
														/>
														<span className="text-[10px] text-muted-foreground">
															%
														</span>
													</div>
												) : (
													<div className="h-5" />
												)}
											</div>
										))}
										{filled.length > 0 && (
											<div className="text-[10px] tabular-nums text-muted-foreground">
												{sum.toFixed(0)}%
												{Math.abs(sum - 100) > 0.01 && (
													<span className="ml-1 text-amber-600">
														(must be 100%)
													</span>
												)}
											</div>
										)}
									</div>
								);
							})()}

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={() => onOpenChange(false)}
										disabled={isPending}
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

				{/* Body */}
				<div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_360px]">
					{/* LEFT COLUMN */}
					<div className="flex min-h-0 flex-col overflow-y-auto border-r bg-slate-50/40 px-5 pt-4 pb-10">
						{/* Column headers */}
						<div className="mb-2 grid grid-cols-[1fr_56px_96px_80px_24px] items-center gap-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
							<span>Product/Service</span>
							<span className="text-center">Qty</span>
							<span className="text-right">Unit (MYR)</span>
							<span className="text-right">Total (MYR)</span>
							<span />
						</div>

						{/* Line items */}
						<div className="rounded-md border bg-white shadow-sm">
							{lines.length === 0 ? (
								<div className="px-3 py-8 text-center text-sm text-muted-foreground">
									No billing items. Add services in the Billing tab first.
								</div>
							) : (
								<>
									{/* Expand / Collapse All header */}
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
										{lines.map((l, i) => {
											const isExpanded = expandedIds.has(l.id);
											const appliedDiscount = lineDiscounts[i] ?? 0;
											const taxAmt = lineTaxAmount(l, taxes, appliedDiscount);
											const activeTaxes = taxes.filter((t) => t.is_active);
											const capPct = capFor(l.service_id);
											const gross = lineGross(l);
											const netTotal = Math.max(0, gross - appliedDiscount);
											const svc = l.service_id
												? serviceById.get(l.service_id)
												: null;
											const priceMin =
												svc?.price_min != null
													? Number(svc.price_min)
													: null;
											const priceMax =
												svc?.price_max != null
													? Number(svc.price_max)
													: null;
											const priceLocked =
												svc != null && svc.allow_cash_price_range === false;
											const hasRange = priceMin != null && priceMax != null;
											const priceEditable = l.item_type !== "service" || (hasRange && !priceLocked);
											const qtyEditable = l.item_type !== "service";
											const remarksOpen = remarksOpenIds.has(l.id);

											return (
												<li key={l.id} className="px-3 py-2.5">
													{/* Row 1: main data — grid aligned with column headers */}
													<div className="grid grid-cols-[1fr_56px_96px_80px_24px] items-center gap-1">
														{/* Product/Service */}
														<div className="min-w-0">
															<div className="flex items-center gap-1.5">
																<span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">
																	{l.item_type === "product"
																		? "PRD"
																		: l.item_type === "charge"
																			? "CON"
																			: "SVC"}
																</span>
																<span className="truncate text-sm font-medium text-blue-600">
																	{l.item_name}
																</span>
															</div>
														</div>

														{/* Qty */}
														{qtyEditable ? (
															<Input
																type="number"
																min={1}
																step="1"
																value={l.quantity}
																onChange={(e) =>
																	updateLine(l.id, {
																		quantity: Number(e.target.value) || 1,
																	})
																}
																className="h-7 text-center text-[11px] tabular-nums"
															/>
														) : (
															<span className="text-center text-sm tabular-nums">
																{l.quantity}
															</span>
														)}

														{/* Unit Price */}
														{priceEditable ? (
															<Input
																type="number"
																min={0}
																step="0.01"
																value={l.unit_price}
																onChange={(e) =>
																	updateLine(l.id, {
																		unit_price: Number(e.target.value) || 0,
																	})
																}
																onBlur={() => clampUnitPrice(l.id)}
																className="h-7 text-right text-[11px] tabular-nums"
															/>
														) : (
															<span className="text-right text-sm tabular-nums">
																{money(l.unit_price)}
															</span>
														)}

														{/* Total */}
														<span className="text-right text-sm font-medium tabular-nums">
															{money(netTotal)}
														</span>

														{/* Chevron */}
														<button
															type="button"
															onClick={() => toggleExpanded(l.id)}
															className="flex size-6 items-center justify-center rounded hover:bg-muted"
														>
															{isExpanded ? (
																<ChevronUp className="size-4 text-muted-foreground" />
															) : (
																<ChevronDown className="size-4 text-muted-foreground" />
															)}
														</button>
													</div>

													{/* Row 2: SKU + Tax (right-aligned, outside grid) */}
													<div className="mt-1 flex items-start justify-between">
														{l.sku ? (
															<div className="pl-7 text-[10px] font-mono text-muted-foreground">
																{l.sku}
															</div>
														) : (
															<div />
														)}
														<div className="flex flex-col items-end gap-0.5">
															<select
																value={l.tax_id ?? ""}
																onChange={(e) =>
																	updateLine(l.id, {
																		tax_id: e.target.value === "" ? null : e.target.value,
																	})
																}
																className="h-5 rounded border bg-background px-1.5 text-[10px] outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
															>
																<option value="">No tax</option>
																{activeTaxes.map((t) => (
																	<option key={t.id} value={t.id}>
																		({t.name.toUpperCase()}) {Number(t.rate_pct).toFixed(2)}%
																	</option>
																))}
															</select>
															{taxAmt > 0 && (
																<span className="text-[10px] text-muted-foreground">
																	Tax Amount (MYR): {money(taxAmt)}
																</span>
															)}
														</div>
													</div>

													{/* Expanded section */}
													{isExpanded && (
														<div className="mt-2 space-y-2 border-t border-dashed pt-2 text-[11px]">
															{/* Discount row */}
															<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
																<div className="flex items-center gap-1.5">
																	<span className="text-muted-foreground">Discount</span>
																	<div className="flex items-center overflow-hidden rounded-md border">
																		<Input
																			type="number"
																			min={0}
																			step="0.01"
																			value={l.discount_input}
																			placeholder="0"
																			onChange={(e) =>
																				updateLine(l.id, {
																					discount_input: e.target.value,
																				})
																			}
																			onBlur={() => clampLineDiscountInput(l.id)}
																			className="h-6 w-16 rounded-none border-0 text-right text-[11px] focus-visible:ring-0"
																		/>
																		<div className="flex">
																			<button
																				type="button"
																				onClick={() =>
																					updateLine(l.id, { discount_type: "percent" })
																				}
																				className={cn(
																					"border-l px-2.5 py-1 text-[11px] font-medium transition-colors",
																					l.discount_type === "percent"
																						? "bg-blue-600 text-white"
																						: "bg-muted/50 text-muted-foreground hover:bg-muted",
																				)}
																			>
																				%
																			</button>
																			<button
																				type="button"
																				onClick={() =>
																					updateLine(l.id, { discount_type: "amount" })
																				}
																				className={cn(
																					"border-l px-2.5 py-1 text-[11px] font-medium transition-colors",
																					l.discount_type === "amount"
																						? "bg-blue-600 text-white"
																						: "bg-muted/50 text-muted-foreground hover:bg-muted",
																				)}
																			>
																				MYR
																			</button>
																		</div>
																	</div>
																	{appliedDiscount > 0 && (
																		<span className="tabular-nums text-muted-foreground">
																			-{money(appliedDiscount)}
																		</span>
																	)}
																</div>

																{/* Payment Allocation — only when partial */}
																{totalPaid < total && (
																	<div className="flex items-center gap-1.5">
																		<span className="text-muted-foreground">Payment Allocation (MYR)</span>
																		<Input
																			type="number"
																			min={0}
																			step="0.01"
																			value={getLinePayAlloc(l.id)}
																			onChange={(e) =>
																				setLinePayAllocVal(l.id, e.target.value)
																			}
																			className="h-6 w-20 text-right text-[11px] tabular-nums"
																		/>
																	</div>
																)}
															</div>

															{/* Tooth + Surface row */}
															<div className="flex items-center gap-4">
																<div className="flex items-center gap-1.5">
																	<span className="text-muted-foreground">Tooth #</span>
																	<Input
																		value={l.tooth_number}
																		onChange={(e) =>
																			updateLine(l.id, { tooth_number: e.target.value })
																		}
																		className="h-6 w-24 text-[11px]"
																	/>
																</div>
																<div className="flex items-center gap-1.5">
																	<span className="text-muted-foreground">Surface</span>
																	<Input
																		value={l.surface}
																		onChange={(e) =>
																			updateLine(l.id, { surface: e.target.value })
																		}
																		className="h-6 w-24 text-[11px]"
																	/>
																</div>
															</div>

															{/* Remarks */}
															<div className="flex items-start gap-1.5">
																<button
																	type="button"
																	onClick={() => toggleRemarks(l.id)}
																	className="mt-0.5 flex shrink-0 items-center gap-0.5 text-muted-foreground hover:text-foreground"
																>
																	Remarks
																	{remarksOpen ? (
																		<ChevronUp className="size-3" />
																	) : (
																		<ChevronDown className="size-3" />
																	)}
																</button>
																{remarksOpen && (
																	<textarea
																		value={l.remarks}
																		onChange={(e) =>
																			updateLine(l.id, { remarks: e.target.value })
																		}
																		maxLength={500}
																		rows={1}
																		className="min-h-[24px] flex-1 resize-none rounded border border-input bg-transparent px-2 py-0.5 text-[11px] outline-none placeholder:italic placeholder:text-muted-foreground/50 focus-visible:border-ring"
																	/>
																)}
															</div>

															{/* Hints */}
															{(capPct != null || hasRange) && (
																<div className="space-y-0.5 text-[10px] text-muted-foreground">
																	{capPct != null && (
																		<div>Up to {capPct}(%)</div>
																	)}
																	{hasRange && (
																		<div>
																			Item price range is (MYR) {money(priceMin!)} to (MYR) {money(priceMax!)}
																		</div>
																	)}
																</div>
															)}

															{/* Per-line employee allocation (when itemised) */}
															{itemized &&
																(() => {
																	const slots = getLineAlloc(l.id);
																	const filled = slots.filter((a) => a.employeeId);
																	const sum = filled.reduce((s, a) => s + a.percent, 0);
																	return (
																		<div className="flex flex-wrap items-center gap-2 border-t border-dotted pt-1.5">
																			{slots.map((slot, si) => (
																				<div
																					key={`la-${l.id}-${si}`}
																					className="flex items-center gap-1"
																				>
																					<EmployeePicker
																						employees={allEmployees}
																						value={slot.employeeId || null}
																						onChange={(id) =>
																							setLineEmployee(l.id, si, id)
																						}
																						size="sm"
																						placeholder={`Employee ${si + 1}`}
																					/>
																					{slot.employeeId && (
																						<>
																							<input
																								type="number"
																								min={0}
																								max={100}
																								step="0.01"
																								value={slot.percent}
																								onChange={(e) =>
																									setLinePercent(
																										l.id,
																										si,
																										Number(e.target.value) || 0,
																									)
																								}
																								className="h-5 w-14 rounded border bg-background px-1 text-center text-[10px] tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
																							/>
																							<span className="text-[10px] text-muted-foreground">%</span>
																						</>
																					)}
																				</div>
																			))}
																			{filled.length > 0 && (
																				<span className="text-[10px] tabular-nums text-muted-foreground">
																					{sum.toFixed(0)}%
																					{Math.abs(sum - 100) > 0.01 && (
																						<span className="ml-1 text-amber-600">
																							(must be 100%)
																						</span>
																					)}
																				</span>
																			)}
																		</div>
																	);
																})()}
														</div>
													)}
												</li>
											);
										})}
									</ul>
								</>
							)}
						</div>

						{/* Action row + totals */}
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

							<div className="space-y-1.5 text-sm">
								<Row
									label="Tax"
									value={
										<span className="tabular-nums text-foreground">{money(totalTax)}</span>
									}
								/>
								<Row
									label="Discount"
									value={
										<span className="tabular-nums text-foreground">
											{money(totalDiscount)}
										</span>
									}
								/>
								<div className="border-t pt-1.5">
									<Row
										label="Total (MYR)"
										value={
											<span className={cn(
												"tabular-nums font-semibold text-foreground",
												requireRounding && "line-through text-muted-foreground font-normal",
											)}>
												{money(rawTotal)}
											</span>
										}
									/>
								</div>

								{/* Rounding */}
								<Row
									label={
										<div className="flex items-center gap-2">
											<span>Rounding</span>
											<Toggle
												checked={requireRounding}
												onCheckedChange={(v) => {
													setRequireRounding(v);
													if (v) {
														setRoundedTotalInput(String(Math.floor(rawTotal)));
													} else {
														setRoundedTotalInput("");
													}
												}}
											/>
										</div>
									}
									value={
										requireRounding ? (
											<div className="flex flex-col items-end gap-0.5">
												<Input
													type="number"
													step="1"
													value={roundedTotalInput}
													onChange={(e) =>
														setRoundedTotalInput(e.target.value)
													}
													placeholder={rawTotal.toFixed(2)}
													className={cn(
														"h-7 w-28 text-right text-xs tabular-nums",
														roundingExceedsLimit && "border-red-500 focus-visible:ring-red-500",
													)}
												/>
												{rounding !== 0 && !roundingExceedsLimit && (
													<span className="text-[10px] text-muted-foreground">
														{rounding > 0 ? "+" : ""}{money(rounding)}
													</span>
												)}
												{roundingExceedsLimit && (
													<span className="text-[10px] font-medium text-red-600">
														Exceeds RM 1.00 limit
													</span>
												)}
											</div>
										) : (
											<span className="tabular-nums text-muted-foreground">—</span>
										)
									}
								/>

								{/* Total After Rounding — the final charge amount */}
								{requireRounding && (
									<div className="rounded-md bg-blue-50 px-3 py-2">
										<Row
											label={<span className="text-xs font-semibold text-foreground">Total After Rounding (MYR)</span>}
											value={
												<span className="tabular-nums text-base font-bold text-blue-700">
													{money(total)}
												</span>
											}
										/>
									</div>
								)}

								<Row
									label="Paid"
									value={
										<span className="tabular-nums text-foreground">{money(totalPaid)}</span>
									}
								/>
								<Row
									label="Balance"
									value={
										<span className={cn(
											"tabular-nums font-semibold",
											balance > 0 ? "text-amber-600" : "text-foreground",
										)}>
											{money(balance)}
										</span>
									}
								/>
							</div>
						</div>
					</div>

					{/* RIGHT COLUMN */}
					<div className="flex min-h-0 flex-col overflow-y-auto bg-white px-5 py-4">
						{/* Medical Certificate */}
						<div className="text-sm font-semibold tracking-wide text-blue-600">
							MEDICAL CERTIFICATE
							<span className="ml-1 text-[10px] font-normal text-muted-foreground">
								^
							</span>
						</div>
						<div className="mt-2 rounded-md border p-3">
							<div className="flex items-center justify-between">
								<span className="text-xs text-muted-foreground">
									MC/—
								</span>
								<div className="flex items-center gap-1.5">
									<button
										type="button"
										disabled
										className="flex size-6 items-center justify-center rounded text-muted-foreground/40"
										aria-label="Generate MC"
									>
										<FileText className="size-3.5" />
									</button>
								</div>
							</div>
						</div>

						{/* Payment */}
						<div className="mt-5 text-sm font-semibold tracking-wide text-blue-600">
							PAYMENT
						</div>

						<div className="mt-2 flex items-center justify-end gap-2 text-xs">
							<span className="text-blue-600">Backdate Invoice?</span>
							<Toggle
								checked={backdate}
								onCheckedChange={(v) => {
									setBackdate(v);
									if (v) {
										const now = new Date();
										const yyyy = now.getFullYear();
										const mm = String(now.getMonth() + 1).padStart(2, "0");
										const dd = String(now.getDate()).padStart(2, "0");
										setBackdateValue(`${yyyy}-${mm}-${dd}`);
									} else {
										setBackdateValue("");
									}
								}}
							/>
						</div>
						{backdate && (
							<div className="mt-2">
								<Input
									type="date"
									value={backdateValue}
									onChange={(e) => setBackdateValue(e.target.value)}
									className="h-8 text-xs"
								/>
							</div>
						)}

						<div className="mt-3 space-y-3">
							{payments.map((p) => {
								const method = methodByCode.get(p.mode);
								return (
									<div
										key={p.key}
										className="space-y-2 rounded-md border border-border bg-muted/20 p-2"
									>
										<div className="flex items-center gap-2">
											<select
												className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring"
												value={p.mode}
												onChange={(e) =>
													changePaymentMethod(p.key, e.target.value)
												}
											>
												{paymentMethods.map((m) => (
													<option key={m.code} value={m.code}>
														{m.name}
													</option>
												))}
												{!method && (
													<option key={p.mode} value={p.mode}>
														{p.mode}
													</option>
												)}
											</select>
											<Input
												type="number"
												min={0}
												step="0.01"
												placeholder="0.00"
												value={p.amount}
												onChange={(e) =>
													updatePayment(p.key, { amount: e.target.value })
												}
												className="h-8 flex-1 text-right text-xs tabular-nums"
											/>
											{payments.length > 1 && (
												<button
													type="button"
													onClick={() => removePaymentEntry(p.key)}
													className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
													aria-label="Remove payment"
												>
													<Trash2 className="size-3.5" />
												</button>
											)}
										</div>

										{method && (
											<PaymentMethodFields
												method={method}
												entry={p}
												onChange={(patch) => updatePayment(p.key, patch)}
											/>
										)}
									</div>
								);
							})}

							{/* SO remarks — different from payments.remarks. Stored on sales_orders.remarks. */}
							<div className="flex items-center gap-2">
								<span className="w-20 shrink-0 text-xs text-muted-foreground">
									SO remarks:
								</span>
								<Input
									placeholder="Add Remarks"
									value={remarks}
									onChange={(e) => setRemarks(e.target.value)}
									className="h-8 flex-1 text-xs"
								/>
							</div>

							<button
								type="button"
								onClick={addPaymentEntry}
								disabled={payments.length >= 5}
								className="flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50"
							>
								<Plus className="size-3" />
								Add Payment Type
							</button>
						</div>

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
									className="mt-1 min-h-[50px] w-full resize-none rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none placeholder:italic placeholder:text-muted-foreground/50 focus-visible:border-ring"
									placeholder="Optional message..."
								/>
							</div>
						</div>

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
			/>
		</Dialog>
	);
}

function PaymentMethodFields({
	method,
	entry,
	onChange,
}: {
	method: PaymentMethod;
	entry: PaymentEntry;
	onChange: (patch: Partial<PaymentEntry>) => void;
}) {
	const selectClass =
		"h-7 w-full rounded-md border border-input bg-background px-2 text-[11px] outline-none focus-visible:border-ring";
	const inputClass = "h-7 text-[11px]";
	const labelClass = "text-[10px] font-medium uppercase text-muted-foreground";

	const fields: React.ReactNode[] = [];
	if (method.requires_bank) {
		fields.push(
			<div key="bank" className="flex flex-col gap-0.5">
				<span className={labelClass}>Bank</span>
				<select
					className={selectClass}
					value={entry.bank}
					onChange={(e) => onChange({ bank: e.target.value })}
				>
					<option value="">Please choose…</option>
					{PAYMENT_BANKS.map((b) => (
						<option key={b} value={b}>
							{b}
						</option>
					))}
				</select>
			</div>,
		);
	}
	if (method.requires_card_type) {
		fields.push(
			<div key="card_type" className="flex flex-col gap-0.5">
				<span className={labelClass}>Card type</span>
				<select
					className={selectClass}
					value={entry.card_type}
					onChange={(e) => onChange({ card_type: e.target.value })}
				>
					<option value="">Please choose…</option>
					{PAYMENT_CARD_TYPES.map((c) => (
						<option key={c} value={c}>
							{c}
						</option>
					))}
				</select>
			</div>,
		);
	}
	if (method.requires_months) {
		fields.push(
			<div key="months" className="flex flex-col gap-0.5">
				<span className={labelClass}>Months</span>
				<select
					className={selectClass}
					value={entry.months}
					onChange={(e) => onChange({ months: e.target.value })}
				>
					<option value="">Please choose…</option>
					{PAYMENT_EPS_MONTHS.map((m) => (
						<option key={m} value={String(m)}>
							{m}
						</option>
					))}
				</select>
			</div>,
		);
	}
	if (method.requires_trace_no) {
		fields.push(
			<div key="trace_no" className="flex flex-col gap-0.5">
				<span className={labelClass}>Trace no</span>
				<Input
					placeholder="Eg. 888888"
					value={entry.trace_no}
					onChange={(e) => onChange({ trace_no: e.target.value })}
					className={inputClass}
				/>
			</div>,
		);
	}
	if (method.requires_approval_code) {
		fields.push(
			<div key="approval_code" className="flex flex-col gap-0.5">
				<span className={labelClass}>Approval code</span>
				<Input
					placeholder="Eg. 888888"
					value={entry.approval_code}
					onChange={(e) => onChange({ approval_code: e.target.value })}
					className={inputClass}
				/>
			</div>,
		);
	}
	if (method.requires_reference_no) {
		fields.push(
			<div key="reference_no" className="flex flex-col gap-0.5">
				<span className={labelClass}>Reference no</span>
				<Input
					placeholder="Eg. 888888"
					value={entry.reference_no}
					onChange={(e) => onChange({ reference_no: e.target.value })}
					className={inputClass}
				/>
			</div>,
		);
	}
	if (method.requires_remarks) {
		fields.push(
			<div key="remarks" className="col-span-2 flex flex-col gap-0.5">
				<span className={labelClass}>Remarks</span>
				<Input
					placeholder="Add Remarks"
					value={entry.remarks}
					onChange={(e) => onChange({ remarks: e.target.value })}
					className={inputClass}
				/>
			</div>,
		);
	}

	if (fields.length === 0) return null;
	return <div className="grid grid-cols-2 gap-2">{fields}</div>;
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-xs text-muted-foreground">{label}</span>
			<div className="flex items-center">{value}</div>
		</div>
	);
}

function Toggle({
	checked,
	onCheckedChange,
}: {
	checked: boolean;
	onCheckedChange: (v: boolean) => void;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onCheckedChange(!checked)}
			className={cn(
				"relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition",
				checked ? "bg-blue-600" : "bg-muted",
			)}
		>
			<span
				className={cn(
					"inline-block size-3 rounded-full bg-white transition",
					checked ? "translate-x-3.5" : "translate-x-0.5",
				)}
			/>
		</button>
	);
}
