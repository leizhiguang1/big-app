"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { CancellationWithRelations } from "@/lib/services/sales";

type Props = {
	cancellations: CancellationWithRelations[];
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

export function CancellationsTable({ cancellations }: Props) {
	const columns: DataTableColumn<CancellationWithRelations>[] = [
		{
			key: "cn_number",
			header: "CN #",
			sortable: true,
			cell: (c) => (
				<span className="font-mono font-medium text-sm">{c.cn_number}</span>
			),
		},
		{
			key: "date",
			header: "Date",
			sortable: true,
			sortValue: (c) => c.cancelled_at,
			cell: (c) => {
				const { date, time } = formatDateTime(c.cancelled_at);
				return (
					<div className="text-sm">
						<div>{date}</div>
						<div className="text-muted-foreground text-xs">{time}</div>
					</div>
				);
			},
		},
		{
			key: "so_number",
			header: "Original SO",
			sortable: true,
			sortValue: (c) => c.sales_order?.so_number ?? "",
			cell: (c) =>
				c.sales_order ? (
					<Link
						href={`/sales/${c.sales_order.id}`}
						className="font-mono text-blue-600 text-sm hover:underline"
					>
						{c.sales_order.so_number}
					</Link>
				) : (
					<span className="text-muted-foreground text-sm">—</span>
				),
		},
		{
			key: "amount",
			header: "Amount (MYR)",
			sortable: true,
			align: "right",
			sortValue: (c) => Number(c.amount),
			cell: (c) => (
				<span className="tabular-nums">{money(Number(c.amount))}</span>
			),
		},
		{
			key: "customer",
			header: "Customer",
			sortable: true,
			sortValue: (c) =>
				c.sales_order?.customer
					? fullName(
							c.sales_order.customer.first_name,
							c.sales_order.customer.last_name,
						)
					: "",
			cell: (c) => {
				const cust = c.sales_order?.customer;
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
			key: "reason",
			header: "Reason",
			cell: (c) => (
				<span className="max-w-[200px] truncate text-muted-foreground text-sm">
					{c.reason || "—"}
				</span>
			),
		},
		{
			key: "processed_by",
			header: "Processed by",
			sortable: true,
			sortValue: (c) =>
				c.processed_by_employee
					? fullName(
							c.processed_by_employee.first_name,
							c.processed_by_employee.last_name,
						)
					: "",
			cell: (c) =>
				c.processed_by_employee ? (
					<span className="text-muted-foreground text-sm uppercase">
						{fullName(
							c.processed_by_employee.first_name,
							c.processed_by_employee.last_name,
						)}
					</span>
				) : (
					<span className="text-muted-foreground text-sm">—</span>
				),
		},
	];

	return (
		<DataTable
			data={cancellations}
			columns={columns}
			getRowKey={(c) => c.id}
			searchPlaceholder="Search cancellations…"
			emptyMessage="No cancellation records yet."
		/>
	);
}
