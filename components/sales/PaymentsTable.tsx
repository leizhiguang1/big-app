"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { PaymentWithRelations } from "@/lib/services/sales";

type Props = {
	payments: PaymentWithRelations[];
	onOpen?: (salesOrderId: string) => void;
};

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
		second: "2-digit",
		hour12: false,
	});
	return { date, time };
}

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

function prettyCode(code: string): string {
	return code
		.split("_")
		.map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
		.join(" ");
}

export function PaymentsTable({ payments, onOpen }: Props) {
	const columns: DataTableColumn<PaymentWithRelations>[] = [
		{
			key: "date",
			header: "Date",
			sortable: true,
			sortValue: (p) => p.paid_at,
			cell: (p) => {
				const { date, time } = formatDateTime(p.paid_at);
				return (
					<div className="text-sm">
						<div>{date}</div>
						<div className="text-muted-foreground text-xs">{time}</div>
					</div>
				);
			},
		},
		{
			key: "invoice_no",
			header: "Invoice #",
			sortable: true,
			cell: (p) => {
				const id = p.sales_order?.id;
				if (!id || !onOpen) {
					return (
						<span className="font-mono font-medium text-sm">
							{p.invoice_no}
						</span>
					);
				}
				return (
					<button
						type="button"
						onClick={() => onOpen(id)}
						className="font-mono font-medium text-blue-600 text-sm hover:underline"
					>
						{p.invoice_no}
					</button>
				);
			},
		},
		{
			key: "mode",
			header: "Mode",
			sortable: true,
			sortValue: (p) => p.method?.name ?? p.payment_mode,
			cell: (p) => (
				<Badge variant="outline" className="text-xs">
					{p.method?.name ?? prettyCode(p.payment_mode)}
				</Badge>
			),
		},
		{
			key: "amount",
			header: "Amount (MYR)",
			sortable: true,
			align: "right",
			sortValue: (p) => Number(p.amount),
			cell: (p) => (
				<span className="tabular-nums">{money(Number(p.amount))}</span>
			),
		},
		{
			key: "customer",
			header: "Customer",
			sortable: true,
			sortValue: (p) =>
				p.sales_order?.customer
					? fullName(
							p.sales_order.customer.first_name,
							p.sales_order.customer.last_name,
						)
					: "",
			cell: (p) => {
				const cust = p.sales_order?.customer;
				if (!cust)
					return <span className="text-muted-foreground text-sm">—</span>;
				return (
					<div>
						<div className="font-medium text-sm uppercase">
							{fullName(cust.first_name, cust.last_name)}
						</div>
						<div className="text-muted-foreground text-xs">{cust.code}</div>
					</div>
				);
			},
		},
		{
			key: "consultant",
			header: "Consultant",
			sortable: true,
			sortValue: (p) =>
				p.sales_order?.consultant
					? fullName(
							p.sales_order.consultant.first_name,
							p.sales_order.consultant.last_name,
						)
					: "",
			cell: (p) => {
				const emp = p.sales_order?.consultant;
				if (!emp)
					return <span className="text-muted-foreground text-sm">—</span>;
				return (
					<span className="text-muted-foreground text-sm uppercase">
						{fullName(emp.first_name, emp.last_name)}
					</span>
				);
			},
		},
		{
			key: "processed_by",
			header: "Processed by",
			sortable: true,
			sortValue: (p) =>
				p.processed_by_employee
					? fullName(
							p.processed_by_employee.first_name,
							p.processed_by_employee.last_name,
						)
					: "",
			cell: (p) =>
				p.processed_by_employee ? (
					<span className="text-muted-foreground text-sm uppercase">
						{fullName(
							p.processed_by_employee.first_name,
							p.processed_by_employee.last_name,
						)}
					</span>
				) : (
					<span className="text-muted-foreground text-sm">—</span>
				),
		},
	];

	return (
		<DataTable
			data={payments}
			columns={columns}
			getRowKey={(p) => p.id}
			searchPlaceholder="Search payments…"
			emptyMessage="No payment records yet."
		/>
	);
}
