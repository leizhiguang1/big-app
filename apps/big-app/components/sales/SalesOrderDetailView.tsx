"use client";

import {
	ArrowLeft,
	Ban,
	CalendarDays,
	CreditCard,
	FileText,
	Pencil,
	Printer,
	Receipt,
	Store,
	Undo2,
	Users,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CustomerIdentityCard } from "@/components/customers/CustomerIdentityCard";
import { ChangePaymentMethodDialog } from "@/components/sales/ChangePaymentMethodDialog";
import { IssueRefundDialog } from "@/components/sales/IssueRefundDialog";
import { ReallocatePaymentsEditor } from "@/components/sales/ReallocatePaymentsEditor";
import { PayOutstandingDialog } from "@/components/sales/PayOutstandingDialog";
import { RevertLastPaymentDialog } from "@/components/sales/RevertLastPaymentDialog";
import { SaleItemEmployeeAllocationDialog } from "@/components/sales/SaleItemEmployeeAllocationDialog";
import { ViewInvoiceDialog } from "@/components/sales/ViewInvoiceDialog";
import { VoidSalesOrderDialog } from "@/components/sales/VoidSalesOrderDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Brand } from "@/lib/services/brands";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import { useOutletPath } from "@/hooks/use-outlet-path";
import type { Outlet } from "@/lib/services/outlets";
import type {
	PaymentAllocationForOrder,
	PaymentWithProcessedBy,
	RefundNoteWithRefs,
	SaleItem,
	SaleItemIncentiveRow,
	SalesOrderWithRelations,
} from "@/lib/services/sales";

type Props = {
	order: SalesOrderWithRelations;
	items: SaleItem[];
	payments: PaymentWithProcessedBy[];
	refundNotes: RefundNoteWithRefs[];
	allocations: PaymentAllocationForOrder[];
	incentives: SaleItemIncentiveRow[];
	employees: EmployeeWithRelations[];
	outlet: Outlet | null;
	customer: CustomerWithRelations | null;
	brand: Brand | null;
	autoPrint?: boolean;
};

function money(n: number) {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function fullName(
	first: string | null | undefined,
	last: string | null | undefined,
) {
	return [first, last].filter(Boolean).join(" ").trim();
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function formatDateTime(iso: string) {
	const d = new Date(iso);
	const date = d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
	const time = d.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	return `${date} ${time}`;
}

function statusBadge(status: string) {
	switch (status) {
		case "completed":
			return <Badge variant="default">Completed</Badge>;
		case "cancelled":
			return <Badge variant="destructive">Cancelled</Badge>;
		case "void":
			return <Badge variant="outline">Void</Badge>;
		case "partial":
			return <Badge variant="secondary">Partial</Badge>;
		case "pending":
			return <Badge variant="outline">Pending</Badge>;
		default:
			return <Badge variant="secondary">{status}</Badge>;
	}
}

function prettyCode(code: string): string {
	return code
		.split("_")
		.map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
		.join(" ");
}

function paymentMethodName(p: PaymentWithProcessedBy): string {
	return p.method?.name ?? prettyCode(p.payment_mode);
}

function paymentFieldPills(p: PaymentWithProcessedBy): string[] {
	const out: string[] = [];
	if (p.bank) out.push(`Bank: ${p.bank}`);
	if (p.card_type) out.push(`Card: ${p.card_type}`);
	if (p.months != null) out.push(`${p.months} mo`);
	if (p.trace_no) out.push(`Trace: ${p.trace_no}`);
	if (p.approval_code) out.push(`Appr: ${p.approval_code}`);
	if (p.reference_no) out.push(`Ref: ${p.reference_no}`);
	return out;
}

function itemTypeLabel(t: string): string {
	switch (t) {
		case "service":
			return "Service";
		case "product":
			return "Product";
		case "charge":
			return "Charge";
		default:
			return t;
	}
}

export function SalesOrderDetailView({
	order,
	items,
	payments,
	refundNotes,
	allocations,
	incentives,
	employees,
	outlet,
	customer,
	brand,
	autoPrint,
}: Props) {
	const path = useOutletPath();
	const [voidOpen, setVoidOpen] = useState(false);
	const [refundOpen, setRefundOpen] = useState(false);
	const [recordPayOpen, setRecordPayOpen] = useState(false);
	const [invoiceOpen, setInvoiceOpen] = useState(Boolean(autoPrint));
	const [reallocMode, setReallocMode] = useState(false);
	const [changeMethodPayment, setChangeMethodPayment] =
		useState<PaymentWithProcessedBy | null>(null);
	const [revertPayment, setRevertPayment] =
		useState<PaymentWithProcessedBy | null>(null);
	const [allocItem, setAllocItem] = useState<SaleItem | null>(null);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const appointmentRef = order.appointment?.booking_ref ?? null;

	const isCancellable =
		order.status === "completed" || order.status === "draft";
	const canRefund = order.status === "completed";
	const isCancelled = order.status === "cancelled";
	const outstanding = Number(order.outstanding ?? 0);
	const canRecordPayment = !isCancelled && outstanding > 0.005;

	// Index incentives and allocations by sale_item_id / payment_id for cheap lookup.
	const incentivesByLine = useMemo(() => {
		const m = new Map<string, SaleItemIncentiveRow[]>();
		for (const i of incentives) {
			const arr = m.get(i.sale_item_id) ?? [];
			arr.push(i);
			m.set(i.sale_item_id, arr);
		}
		return m;
	}, [incentives]);

	const allocationsByLine = useMemo(() => {
		const m = new Map<string, PaymentAllocationForOrder[]>();
		for (const a of allocations) {
			const arr = m.get(a.sale_item_id) ?? [];
			arr.push(a);
			m.set(a.sale_item_id, arr);
		}
		return m;
	}, [allocations]);

	const paymentsById = useMemo(() => {
		const m = new Map<string, PaymentWithProcessedBy>();
		for (const p of payments) m.set(p.id, p);
		return m;
	}, [payments]);

	// Match the RPC's `order by paid_at desc, created_at desc, id desc` tie-break
	// so the row showing "Revert last invoice" is the row the RPC will actually
	// target. Also require it to be non-wallet — the RPC rejects wallet rows,
	// and we don't want to offer an action that will fail.
	const revertablePaymentId = useMemo(() => {
		if (payments.length === 0) return null;
		const sorted = [...payments].sort((a, b) => {
			const paidCmp = b.paid_at.localeCompare(a.paid_at);
			if (paidCmp !== 0) return paidCmp;
			const createdCmp = b.created_at.localeCompare(a.created_at);
			if (createdCmp !== 0) return createdCmp;
			return b.id.localeCompare(a.id);
		});
		const head = sorted[0];
		return head.payment_mode === "wallet" ? null : head.id;
	}, [payments]);

	const consultantName = order.consultant
		? fullName(order.consultant.first_name, order.consultant.last_name)
		: null;

	const canEditPayments = !isCancelled && payments.length > 0;
	const canReallocate = canEditPayments;

	return (
		<div className="flex flex-col gap-6">
			{order.status === "cancelled" && (
				<div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-red-800 text-sm">
					<Ban className="size-4 shrink-0" />
					<span className="font-semibold uppercase tracking-wide">Voided</span>
					<span className="text-red-700/80">
						· This sales order has been cancelled.
					</span>
				</div>
			)}
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-y-3">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" asChild>
						<Link href={path("/sales")}>
							<ArrowLeft className="size-4" />
						</Link>
					</Button>
					<div>
						<div className="flex items-center gap-2">
							<h2 className="font-semibold text-lg">{order.so_number}</h2>
							{statusBadge(order.status)}
							{order.outlet && (
								<span className="text-muted-foreground text-xs">
									<span className="font-mono font-medium uppercase">
										{order.outlet.code}
									</span>{" "}
									· {order.outlet.name}
								</span>
							)}
						</div>
						{payments[0]?.invoice_no && (
							<p className="text-muted-foreground text-sm">
								Invoice: {payments[0].invoice_no}
							</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					{canRecordPayment && (
						<Button
							size="sm"
							className="bg-green-600 text-white hover:bg-green-700"
							onClick={() => setRecordPayOpen(true)}
						>
							<Wallet className="mr-2 size-4" />
							Record payment
						</Button>
					)}
					{canReallocate && !reallocMode && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setReallocMode(true)}
						>
							<Pencil className="mr-2 size-4" />
							Reallocate payments
						</Button>
					)}
					{canRefund && (
						<Button
							variant="outline"
							size="sm"
							className="text-amber-700 hover:bg-amber-50 hover:text-amber-800"
							onClick={() => setRefundOpen(true)}
						>
							<Undo2 className="mr-2 size-4" />
							Refund
						</Button>
					)}
					{canRefund && (
						<Button
							variant="outline"
							size="sm"
							disabled
							className="relative text-purple-700"
							title="Credit Note — in development (pending Cash Wallet)"
						>
							<Receipt className="mr-2 size-4" />
							Credit Note
							<span
								aria-hidden
								className="absolute -right-1 -top-1 size-1.5 rounded-full bg-amber-500 ring-1 ring-background"
							/>
						</Button>
					)}
					{isCancellable && (
						<Button
							variant="outline"
							size="sm"
							className="text-red-600 hover:bg-red-50 hover:text-red-700"
							onClick={() => setVoidOpen(true)}
						>
							<Ban className="mr-2 size-4" />
							Void
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setInvoiceOpen(true)}
					>
						<Printer className="mr-2 size-4" />
						Print
					</Button>
				</div>
			</div>

			{/* Info cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<InfoCard
					icon={<CalendarDays className="size-4" />}
					label="Date"
					value={formatDate(order.sold_at)}
				/>
				<div className="rounded-md border p-3">
					<p className="mb-2 text-muted-foreground text-xs">Customer</p>
					<CustomerIdentityCard
						customer={order.customer}
						size="md"
						showCode
						showPhone
						showFlags
						fallbackLabel="Walk-in"
					/>
				</div>
				<InfoCard
					icon={<Store className="size-4" />}
					label="Outlet"
					value={order.outlet?.name ?? "—"}
				/>
				<InfoCard
					icon={<CreditCard className="size-4" />}
					label="Consultant"
					value={consultantName ?? "—"}
				/>
			</div>

			{/* Reallocate editor (inline) */}
			{reallocMode && (
				<ReallocatePaymentsEditor
					salesOrderId={order.id}
					appointmentRef={appointmentRef}
					items={items}
					payments={payments}
					allocations={allocations}
					onCancel={() => setReallocMode(false)}
					onSuccess={(msg) => {
						setFeedback({ type: "success", message: msg });
						setReallocMode(false);
					}}
					onError={(msg) => setFeedback({ type: "error", message: msg })}
				/>
			)}

			{/* Line items table */}
			<section>
				<h3 className="mb-3 flex items-center gap-2 font-medium text-sm">
					<FileText className="size-4" />
					Line items
				</h3>
				<div className="overflow-x-auto rounded-md border">
					<table className="w-full min-w-[640px] text-sm">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
									#
								</th>
								<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
									Item
								</th>
								<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
									Type
								</th>
								<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
									Qty
								</th>
								<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
									Unit price
								</th>
								<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
									Discount
								</th>
								<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
									Tax
								</th>
								<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
									Total
								</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item, idx) => {
								const lineIncentives = incentivesByLine.get(item.id) ?? [];
								const lineAllocations = allocationsByLine.get(item.id) ?? [];
								const allocSum = lineAllocations.reduce(
									(s, a) => s + Number(a.amount),
									0,
								);
								return (
									<tr key={item.id} className="border-b last:border-b-0">
										<td className="px-4 py-2.5 align-top text-muted-foreground">
											{idx + 1}
										</td>
										<td className="px-4 py-2.5 align-top">
											<div className="font-medium">
												{item.item_name}
												{item.sku && (
													<span className="ml-2 text-muted-foreground text-xs">
														{item.sku}
													</span>
												)}
											</div>
											<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
												<button
													type="button"
													onClick={() => !isCancelled && setAllocItem(item)}
													disabled={isCancelled}
													className={
														isCancelled
															? "inline-flex cursor-default items-center gap-1 text-muted-foreground"
															: "inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700 hover:bg-blue-100"
													}
												>
													<Users className="size-3" />
													{lineIncentives.length === 0 ? (
														<span>Set allocation</span>
													) : (
														<span>
															{lineIncentives
																.map((i) => {
																	const name = i.employee
																		? fullName(
																				i.employee.first_name,
																				i.employee.last_name,
																			)
																		: "—";
																	return `${name} (${Number(i.percent).toFixed(0)}%)`;
																})
																.join(", ")}
														</span>
													)}
												</button>
												{lineAllocations.length > 0 && (
													<span className="text-muted-foreground">
														Paid: MYR {money(allocSum)} via{" "}
														{lineAllocations
															.map((a) => {
																const p = paymentsById.get(a.payment_id);
																return p
																	? `${paymentMethodName(p)} ${money(Number(a.amount))}`
																	: `${money(Number(a.amount))}`;
															})
															.join(", ")}
													</span>
												)}
											</div>
										</td>
										<td className="px-4 py-2.5 align-top text-muted-foreground">
											{itemTypeLabel(item.item_type)}
										</td>
										<td className="px-4 py-2.5 text-right align-top tabular-nums">
											{item.quantity}
										</td>
										<td className="px-4 py-2.5 text-right align-top tabular-nums">
											{money(item.unit_price)}
										</td>
										<td className="px-4 py-2.5 text-right align-top tabular-nums">
											{item.discount > 0 ? money(item.discount) : "—"}
										</td>
										<td className="px-4 py-2.5 text-right align-top tabular-nums">
											{item.tax_amount > 0 ? (
												<span
													title={`${item.tax_name} (${item.tax_rate_pct}%)`}
												>
													{money(item.tax_amount)}
												</span>
											) : (
												"—"
											)}
										</td>
										<td className="px-4 py-2.5 text-right align-top font-medium tabular-nums">
											{money(item.total ?? 0)}
										</td>
									</tr>
								);
							})}
							{items.length === 0 && (
								<tr>
									<td
										colSpan={8}
										className="px-4 py-8 text-center text-muted-foreground"
									>
										No line items.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>

			{/* Totals */}
			<section className="flex justify-end">
				<div className="w-full max-w-xs space-y-1 text-sm">
					<SummaryRow label="Subtotal" value={money(order.subtotal)} />
					{order.discount > 0 && (
						<SummaryRow
							label="Discount"
							value={`-${money(order.discount)}`}
							muted
						/>
					)}
					{order.tax > 0 && (
						<SummaryRow label="Tax" value={money(order.tax)} muted />
					)}
					{order.rounding !== 0 && (
						<SummaryRow label="Rounding" value={money(order.rounding)} muted />
					)}
					<div className="border-t pt-1">
						<SummaryRow
							label="Total"
							value={`MYR ${money(order.total)}`}
							bold
						/>
					</div>
					<SummaryRow
						label="Amount paid"
						value={`MYR ${money(order.amount_paid)}`}
					/>
					{(order.outstanding ?? 0) > 0 && (
						<SummaryRow
							label="Outstanding"
							value={`MYR ${money(order.outstanding ?? 0)}`}
							highlight
						/>
					)}
				</div>
			</section>

			{/* Payments */}
			{payments.length > 0 && (
				<section>
					<h3 className="mb-3 flex items-center gap-2 font-medium text-sm">
						<CreditCard className="size-4" />
						Payments ({payments.length})
					</h3>
					<div className="space-y-3">
						{payments.map((p) => {
							const pills = paymentFieldPills(p);
							const isLast = p.id === revertablePaymentId;
							const isWallet = p.payment_mode === "wallet";
							return (
								<div
									key={p.id}
									className="flex items-start justify-between rounded-md border p-4"
								>
									<div className="space-y-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-mono font-medium text-sm">
												{p.invoice_no}
											</span>
											<Badge variant="outline" className="text-xs">
												{paymentMethodName(p)}
											</Badge>
											{!isCancelled && !isWallet && (
												<button
													type="button"
													onClick={() => setChangeMethodPayment(p)}
													className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
													title="Change payment method"
												>
													<Pencil className="size-3" />
													Change
												</button>
											)}
											{isLast && !isCancelled && !isWallet && (
												<button
													type="button"
													onClick={() => setRevertPayment(p)}
													className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:underline"
													title="Revert last payment"
												>
													<Undo2 className="size-3" />
													Revert last invoice
												</button>
											)}
										</div>
										<p className="text-muted-foreground text-xs">
											{formatDateTime(p.paid_at)}
											{p.processed_by_employee &&
												` · by ${fullName(p.processed_by_employee.first_name, p.processed_by_employee.last_name)}`}
										</p>
										{pills.length > 0 && (
											<p className="text-muted-foreground text-xs">
												{pills.join(" · ")}
											</p>
										)}
										{p.remarks && (
											<p className="text-muted-foreground text-xs">
												{p.remarks}
											</p>
										)}
									</div>
									<span className="font-medium text-sm tabular-nums">
										MYR {money(p.amount)}
									</span>
								</div>
							);
						})}
					</div>
				</section>
			)}

			{/* Refunds */}
			{refundNotes.length > 0 && (
				<section>
					<h3 className="mb-3 flex items-center gap-2 font-medium text-sm">
						<Undo2 className="size-4" />
						Refunds ({refundNotes.length})
					</h3>
					<div className="space-y-3">
						{refundNotes.map((r) => (
							<div
								key={r.id}
								className="flex items-start justify-between rounded-md border border-amber-200 bg-amber-50/40 p-4"
							>
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<span className="font-mono font-medium text-sm">
											{r.rn_number}
										</span>
										{r.refund_method && (
											<Badge variant="outline" className="text-xs">
												{prettyCode(r.refund_method)}
											</Badge>
										)}
										{r.cancellation_id === null && (
											<Badge variant="secondary" className="text-[10px]">
												Standalone
											</Badge>
										)}
									</div>
									<p className="text-muted-foreground text-xs">
										{formatDateTime(r.refunded_at)}
										{r.processed_by_employee &&
											` · by ${fullName(r.processed_by_employee.first_name, r.processed_by_employee.last_name)}`}
									</p>
									{r.notes && (
										<p className="text-muted-foreground text-xs">{r.notes}</p>
									)}
								</div>
								<span className="font-medium text-amber-700 text-sm tabular-nums">
									-MYR {money(r.amount)}
								</span>
							</div>
						))}
					</div>
				</section>
			)}

			{/* Appointment link */}
			{order.appointment_id && (
				<div className="text-sm">
					<Link
						href={path(`/appointments/${order.appointment?.booking_ref ?? order.appointment_id}`)}
						className="text-blue-600 hover:underline"
					>
						View linked appointment
					</Link>
				</div>
			)}

			{order.remarks && (
				<section>
					<h3 className="mb-1 font-medium text-sm">Remarks</h3>
					<p className="text-muted-foreground text-sm">{order.remarks}</p>
				</section>
			)}

			{/* Feedback banner */}
			{feedback && (
				<div
					className={`rounded-md px-4 py-3 text-sm ${
						feedback.type === "success"
							? "border border-green-200 bg-green-50 text-green-800"
							: "border border-red-200 bg-red-50 text-red-800"
					}`}
				>
					{feedback.message}
				</div>
			)}

			<VoidSalesOrderDialog
				open={voidOpen}
				onOpenChange={setVoidOpen}
				salesOrderId={order.id}
				soNumber={order.so_number}
				outletName={order.outlet?.name ?? null}
				orderTotal={Number(order.total ?? 0)}
				items={items}
				onSuccess={({ cnNumber, rnNumber, refundAmount }) =>
					setFeedback({
						type: "success",
						message: `Voided. CN ${cnNumber} · RN ${rnNumber} · Refund MYR ${refundAmount.toFixed(2)}`,
					})
				}
				onError={(msg) => setFeedback({ type: "error", message: msg })}
			/>

			<PayOutstandingDialog
				open={recordPayOpen}
				onOpenChange={setRecordPayOpen}
				salesOrderId={order.id}
				soNumber={order.so_number}
				outstanding={outstanding}
				total={Number(order.total ?? 0)}
				amountPaid={Number(order.amount_paid ?? 0)}
				items={items}
				existingPayments={payments}
				incentives={incentives}
				outletName={outlet?.name ?? null}
				appointmentRef={appointmentRef}
				onSuccess={(msg) => setFeedback({ type: "success", message: msg })}
				onError={(msg) => setFeedback({ type: "error", message: msg })}
			/>

			<IssueRefundDialog
				open={refundOpen}
				onOpenChange={setRefundOpen}
				salesOrderId={order.id}
				soNumber={order.so_number}
				orderTotal={Number(order.total ?? 0)}
				onSuccess={({ rnNumber, amount }) =>
					setFeedback({
						type: "success",
						message: `Refund issued · ${rnNumber} · MYR ${amount.toFixed(2)}`,
					})
				}
				onError={(msg) => setFeedback({ type: "error", message: msg })}
			/>

			<RevertLastPaymentDialog
				open={revertPayment != null}
				onOpenChange={(v) => {
					if (!v) setRevertPayment(null);
				}}
				salesOrderId={order.id}
				appointmentRef={appointmentRef}
				payment={
					revertPayment
						? {
								invoiceNo: revertPayment.invoice_no,
								amount: Number(revertPayment.amount),
								methodName: paymentMethodName(revertPayment),
							}
						: null
				}
				onSuccess={(msg) => setFeedback({ type: "success", message: msg })}
				onError={(msg) => setFeedback({ type: "error", message: msg })}
			/>

			<ChangePaymentMethodDialog
				open={changeMethodPayment != null}
				onOpenChange={(v) => {
					if (!v) setChangeMethodPayment(null);
				}}
				salesOrderId={order.id}
				appointmentRef={appointmentRef}
				payment={changeMethodPayment}
				onSuccess={(msg) => setFeedback({ type: "success", message: msg })}
				onError={(msg) => setFeedback({ type: "error", message: msg })}
			/>

			{allocItem && (
				<SaleItemEmployeeAllocationDialog
					open={allocItem != null}
					onOpenChange={(v) => {
						if (!v) setAllocItem(null);
					}}
					salesOrderId={order.id}
					appointmentRef={appointmentRef}
					saleItemId={allocItem.id}
					itemName={allocItem.item_name}
					initialSlots={(incentivesByLine.get(allocItem.id) ?? []).map((i) => ({
						employeeId: i.employee_id,
						percent: Number(i.percent),
					}))}
					employees={employees}
					onSuccess={(msg) => setFeedback({ type: "success", message: msg })}
					onError={(msg) => setFeedback({ type: "error", message: msg })}
				/>
			)}

			<ViewInvoiceDialog
				open={invoiceOpen}
				onOpenChange={setInvoiceOpen}
				order={order}
				items={items}
				payments={payments}
				outlet={outlet}
				customer={customer}
				brand={brand}
			/>
		</div>
	);
}

function InfoCard({
	icon,
	label,
	value,
	sub,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	sub?: string | null;
}) {
	return (
		<div className="flex items-start gap-3 rounded-md border p-3">
			<div className="mt-0.5 text-muted-foreground">{icon}</div>
			<div className="min-w-0">
				<p className="text-muted-foreground text-xs">{label}</p>
				<p className="truncate font-medium text-sm">{value}</p>
				{sub && <p className="truncate text-muted-foreground text-xs">{sub}</p>}
			</div>
		</div>
	);
}

function SummaryRow({
	label,
	value,
	bold,
	muted,
	highlight,
}: {
	label: string;
	value: string;
	bold?: boolean;
	muted?: boolean;
	highlight?: boolean;
}) {
	return (
		<div className="flex items-center justify-between">
			<span
				className={
					bold ? "font-semibold" : muted ? "text-muted-foreground" : ""
				}
			>
				{label}
			</span>
			<span
				className={`tabular-nums ${bold ? "font-semibold" : ""} ${highlight ? "font-medium text-red-600" : ""}`}
			>
				{value}
			</span>
		</div>
	);
}
