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
import { useRef, useState } from "react";
import { CancelOrderDialog } from "@/components/sales/CancelOrderDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SALES_PAYMENT_MODE_LABEL } from "@/lib/schemas/sales";
import type {
	PaymentWithProcessedBy,
	SaleItem,
	SalesOrderWithRelations,
} from "@/lib/services/sales";

type Props = {
	order: SalesOrderWithRelations;
	items: SaleItem[];
	payments: PaymentWithProcessedBy[];
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

function paymentModeLabel(mode: string): string {
	return (
		SALES_PAYMENT_MODE_LABEL[mode as keyof typeof SALES_PAYMENT_MODE_LABEL] ??
		mode
	);
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

export function SalesOrderDetailView({ order, items, payments }: Props) {
	const printRef = useRef<HTMLDivElement>(null);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const isCancellable =
		order.status === "completed" || order.status === "draft";

	const handlePrint = () => {
		if (!printRef.current) return;
		const printWindow = window.open("", "_blank");
		if (!printWindow) return;
		printWindow.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Invoice ${payments[0]?.invoice_no ?? order.so_number}</title>
				<style>
					body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1a1a1a; }
					table { width: 100%; border-collapse: collapse; margin: 16px 0; }
					th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e5e5; }
					th { font-weight: 600; background: #f8f8f8; }
					.text-right { text-align: right; }
					.summary { margin-top: 12px; }
					.summary td { border-bottom: none; padding: 4px 12px; }
					.summary .total { font-weight: 700; font-size: 1.1em; border-top: 2px solid #1a1a1a; }
					h1 { font-size: 1.4em; margin-bottom: 4px; }
					.meta { color: #666; font-size: 0.9em; margin-bottom: 16px; }
					.payment-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e5e5; }
					@media print { body { padding: 0; } }
				</style>
			</head>
			<body>${printRef.current.innerHTML}</body>
			</html>
		`);
		printWindow.document.close();
		printWindow.print();
	};

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
					<Button variant="outline" size="sm" onClick={handlePrint}>
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
						{payments.map((p) => (
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
											{paymentModeLabel(p.payment_mode)}
										</Badge>
									</div>
									<p className="text-muted-foreground text-xs">
										{formatDateTime(p.paid_at)}
										{p.processed_by_employee &&
											` \u00B7 by ${fullName(p.processed_by_employee.first_name, p.processed_by_employee.last_name)}`}
									</p>
									{p.remarks && (
										<p className="text-muted-foreground text-xs">{p.remarks}</p>
									)}
									{p.reference_no && (
										<p className="text-muted-foreground text-xs">
											Ref: {p.reference_no}
										</p>
									)}
								</div>
								<span className="font-medium text-sm tabular-nums">
									MYR {money(p.amount)}
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

			{/* Hidden printable invoice */}
			<div className="hidden">
				<div ref={printRef}>
					<h1>Invoice</h1>
					<div className="meta">
						<div>
							<strong>{order.so_number}</strong>
							{payments[0]?.invoice_no && ` / ${payments[0].invoice_no}`}
						</div>
						<div>Date: {formatDate(order.sold_at)}</div>
						{customerName && <div>Customer: {customerName}</div>}
						{order.outlet?.name && <div>Outlet: {order.outlet.name}</div>}
					</div>
					<table>
						<thead>
							<tr>
								<th>#</th>
								<th>Item</th>
								<th>Qty</th>
								<th className="text-right">Unit price</th>
								<th className="text-right">Disc.</th>
								<th className="text-right">Tax</th>
								<th className="text-right">Total</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item, idx) => (
								<tr key={item.id}>
									<td>{idx + 1}</td>
									<td>{item.item_name}</td>
									<td>{item.quantity}</td>
									<td className="text-right">{money(item.unit_price)}</td>
									<td className="text-right">
										{item.discount > 0 ? money(item.discount) : "—"}
									</td>
									<td className="text-right">
										{item.tax_amount > 0 ? money(item.tax_amount) : "—"}
									</td>
									<td className="text-right">{money(item.total ?? 0)}</td>
								</tr>
							))}
						</tbody>
					</table>
					<table className="summary">
						<tbody>
							<tr>
								<td>Subtotal</td>
								<td className="text-right">{money(order.subtotal)}</td>
							</tr>
							{order.discount > 0 && (
								<tr>
									<td>Discount</td>
									<td className="text-right">-{money(order.discount)}</td>
								</tr>
							)}
							{order.tax > 0 && (
								<tr>
									<td>Tax</td>
									<td className="text-right">{money(order.tax)}</td>
								</tr>
							)}
							{order.rounding !== 0 && (
								<tr>
									<td>Rounding</td>
									<td className="text-right">{money(order.rounding)}</td>
								</tr>
							)}
							<tr className="total">
								<td>Total</td>
								<td className="text-right">MYR {money(order.total)}</td>
							</tr>
						</tbody>
					</table>
					{payments.length > 0 && (
						<div className="payment-section">
							<strong>Payment</strong>
							{payments.map((p) => (
								<div key={p.id} style={{ marginTop: 8 }}>
									{paymentModeLabel(p.payment_mode)}: MYR {money(p.amount)} (
									{formatDateTime(p.paid_at)})
									{p.reference_no && ` — Ref: ${p.reference_no}`}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
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
