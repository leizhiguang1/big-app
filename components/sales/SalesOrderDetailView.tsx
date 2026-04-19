"use client";

import {
	ArrowLeft,
	Ban,
	CalendarDays,
	CreditCard,
	FileText,
	Printer,
	Store,
	User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CancelOrderDialog } from "@/components/sales/CancelOrderDialog";
import { ViewInvoiceDialog } from "@/components/sales/ViewInvoiceDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type { Outlet } from "@/lib/services/outlets";
import type {
	PaymentWithProcessedBy,
	SaleItem,
	SalesOrderWithRelations,
} from "@/lib/services/sales";

type Props = {
	order: SalesOrderWithRelations;
	items: SaleItem[];
	payments: PaymentWithProcessedBy[];
	outlet: Outlet | null;
	customer: CustomerWithRelations | null;
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
	outlet,
	customer,
	autoPrint,
}: Props) {
	const [cancelOpen, setCancelOpen] = useState(false);
	const [invoiceOpen, setInvoiceOpen] = useState(Boolean(autoPrint));
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const isCancellable =
		order.status === "completed" || order.status === "draft";

	const customerName = order.customer
		? fullName(order.customer.first_name, order.customer.last_name)
		: null;

	const consultantName = order.consultant
		? fullName(order.consultant.first_name, order.consultant.last_name)
		: null;

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-y-3">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" asChild>
						<Link href="/sales">
							<ArrowLeft className="size-4" />
						</Link>
					</Button>
					<div>
						<div className="flex items-center gap-2">
							<h2 className="font-semibold text-lg">{order.so_number}</h2>
							{statusBadge(order.status)}
						</div>
						{payments[0]?.invoice_no && (
							<p className="text-muted-foreground text-sm">
								Invoice: {payments[0].invoice_no}
							</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					{isCancellable && (
						<Button
							variant="outline"
							size="sm"
							className="text-red-600 hover:bg-red-50 hover:text-red-700"
							onClick={() => setCancelOpen(true)}
						>
							<Ban className="mr-2 size-4" />
							Cancel
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
				<InfoCard
					icon={<User className="size-4" />}
					label="Customer"
					value={customerName ?? "Walk-in"}
					sub={order.customer?.code}
				/>
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
							{items.map((item, idx) => (
								<tr key={item.id} className="border-b last:border-b-0">
									<td className="px-4 py-2.5 text-muted-foreground">
										{idx + 1}
									</td>
									<td className="px-4 py-2.5 font-medium">
										{item.item_name}
										{item.sku && (
											<span className="ml-2 text-muted-foreground text-xs">
												{item.sku}
											</span>
										)}
									</td>
									<td className="px-4 py-2.5 text-muted-foreground">
										{itemTypeLabel(item.item_type)}
									</td>
									<td className="px-4 py-2.5 text-right tabular-nums">
										{item.quantity}
									</td>
									<td className="px-4 py-2.5 text-right tabular-nums">
										{money(item.unit_price)}
									</td>
									<td className="px-4 py-2.5 text-right tabular-nums">
										{item.discount > 0 ? money(item.discount) : "—"}
									</td>
									<td className="px-4 py-2.5 text-right tabular-nums">
										{item.tax_amount > 0 ? (
											<span title={`${item.tax_name} (${item.tax_rate_pct}%)`}>
												{money(item.tax_amount)}
											</span>
										) : (
											"—"
										)}
									</td>
									<td className="px-4 py-2.5 text-right font-medium tabular-nums">
										{money(item.total ?? 0)}
									</td>
								</tr>
							))}
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
							return (
								<div
									key={p.id}
									className="flex items-start justify-between rounded-md border p-4"
								>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-mono font-medium text-sm">
												{p.invoice_no}
											</span>
											<Badge variant="outline" className="text-xs">
												{paymentMethodName(p)}
											</Badge>
										</div>
										<p className="text-muted-foreground text-xs">
											{formatDateTime(p.paid_at)}
											{p.processed_by_employee &&
												` \u00B7 by ${fullName(p.processed_by_employee.first_name, p.processed_by_employee.last_name)}`}
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

			{/* Appointment link */}
			{order.appointment_id && (
				<div className="text-sm">
					<Link
						href={`/appointments/${order.appointment_id}`}
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

			<CancelOrderDialog
				open={cancelOpen}
				onOpenChange={setCancelOpen}
				salesOrderId={order.id}
				soNumber={order.so_number}
				onSuccess={(cnNumber) =>
					setFeedback({
						type: "success",
						message: `Order cancelled. Cancellation note: ${cnNumber}`,
					})
				}
				onError={(msg) => setFeedback({ type: "error", message: msg })}
			/>

			<ViewInvoiceDialog
				open={invoiceOpen}
				onOpenChange={setInvoiceOpen}
				order={order}
				items={items}
				payments={payments}
				outlet={outlet}
				customer={customer}
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
