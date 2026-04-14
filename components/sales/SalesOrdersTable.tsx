"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { SalesOrderWithRelations } from "@/lib/services/sales";

type Props = {
	orders: SalesOrderWithRelations[];
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

export function SalesOrdersTable({ orders }: Props) {
	const columns: DataTableColumn<SalesOrderWithRelations>[] = [
		{
			key: "date",
			header: "Date",
			sortable: true,
			sortValue: (o) => o.sold_at,
			cell: (o) => {
				const { date, time } = formatDateTime(o.sold_at);
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
			header: "Sales order #",
			sortable: true,
			cell: (o) => (
				<span className="font-mono font-medium text-blue-600 text-sm">
					{o.so_number}
				</span>
			),
		},
		{
			key: "total",
			header: "Total sales (MYR)",
			sortable: true,
			align: "right",
			sortValue: (o) => Number(o.total),
			cell: (o) => (
				<span className="tabular-nums">{money(Number(o.total))}</span>
			),
		},
		{
			key: "customer",
			header: "Customer name",
			sortable: true,
			sortValue: (o) =>
				o.customer ? fullName(o.customer.first_name, o.customer.last_name) : "",
			cell: (o) => {
				if (!o.customer) {
					return <span className="text-muted-foreground text-sm">—</span>;
				}
				const name = fullName(o.customer.first_name, o.customer.last_name);
				const consultant = o.consultant
					? fullName(o.consultant.first_name, o.consultant.last_name)
					: null;
				return (
					<div>
						<div className="font-medium text-sm uppercase">{name}</div>
						<div className="text-muted-foreground text-xs">
							{o.customer.code}
						</div>
						{consultant && (
							<div className="text-muted-foreground text-xs">
								Consultant: {consultant}
							</div>
						)}
					</div>
				);
			},
		},
		{
			key: "created_by",
			header: "Created by",
			sortable: true,
			sortValue: (o) =>
				o.created_by_employee
					? fullName(
							o.created_by_employee.first_name,
							o.created_by_employee.last_name,
						)
					: "",
			cell: (o) =>
				o.created_by_employee ? (
					<span className="text-muted-foreground text-sm uppercase">
						{fullName(
							o.created_by_employee.first_name,
							o.created_by_employee.last_name,
						)}
					</span>
				) : (
					<span className="text-muted-foreground text-sm">—</span>
				),
		},
	];

	return (
		<DataTable
			data={orders}
			columns={columns}
			getRowKey={(o) => o.id}
			searchPlaceholder="Search sales orders…"
			emptyMessage="No sales orders yet."
		/>
	);
}
