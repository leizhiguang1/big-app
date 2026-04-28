"use client";

import { useState } from "react";
import { SalesOrderDetailDialog } from "@/components/sales/SalesOrderDetailDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import type {
	CancellationWithRelations,
	SalesOrderWithRelations,
} from "@/lib/services/sales";
import { cn } from "@/lib/utils";

type SubTab = "history" | "cancelled";

type Props = {
	salesOrders: SalesOrderWithRelations[];
	cancellations: CancellationWithRelations[];
};

const SUB_TABS = [
	{ key: "history", label: "History" },
	{ key: "cancelled", label: "Cancelled" },
];

function formatMoney(n: number | string | null | undefined): string {
	return Number(n ?? 0).toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function formatDate(iso: string): string {
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

function formatDateTwoLine(iso: string): { date: string; time: string } {
	const d = new Date(iso);
	return {
		date: d.toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}),
		time: d.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		}),
	};
}

function statusBadgeClasses(status: string): string {
	if (status === "cancelled" || status === "void")
		return "border-rose-300 bg-rose-50 text-rose-700";
	return "border-emerald-300 bg-emerald-50 text-emerald-700";
}

export function CustomerSalesTab({ salesOrders, cancellations }: Props) {
	const [subTab, setSubTab] = useState<SubTab>("history");
	const [openId, setOpenId] = useState<string | null>(null);

	const salesColumns: DataTableColumn<SalesOrderWithRelations>[] = [
		{
			key: "sold_at",
			header: "Date",
			sortable: true,
			sortValue: (so) => so.sold_at,
			cell: (so) => (
				<span className="whitespace-nowrap text-xs">
					{formatDate(so.sold_at)}
				</span>
			),
		},
		{
			key: "so_number",
			header: "Sales Order #",
			sortable: true,
			sortValue: (so) => so.so_number,
			cell: (so) => (
				<button
					type="button"
					onClick={() => setOpenId(so.id)}
					className="font-mono font-semibold text-sky-600 text-xs hover:underline"
				>
					{so.so_number}
				</button>
			),
		},
		{
			key: "outlet",
			header: "Outlet",
			sortable: true,
			sortValue: (so) => so.outlet?.name ?? "",
			cell: (so) => (
				<span className="text-muted-foreground text-xs">
					{so.outlet?.name ?? "—"}
				</span>
			),
		},
		{
			key: "total",
			header: "Sales",
			align: "right",
			sortable: true,
			sortValue: (so) => Number(so.total ?? 0),
			cell: (so) => (
				<span className="tabular-nums">{formatMoney(so.total)}</span>
			),
		},
		{
			key: "amount_paid",
			header: "Payment",
			align: "right",
			sortable: true,
			sortValue: (so) => Number(so.amount_paid ?? 0),
			cell: (so) => (
				<span className="tabular-nums text-muted-foreground">
					{formatMoney(so.amount_paid)}
				</span>
			),
		},
		{
			key: "outstanding",
			header: "Outstanding",
			align: "right",
			sortable: true,
			sortValue: (so) => Number(so.outstanding ?? 0),
			cell: (so) => (
				<span
					className={cn(
						"tabular-nums",
						Number(so.outstanding ?? 0) > 0
							? "font-semibold text-rose-600"
							: "text-muted-foreground",
					)}
				>
					{formatMoney(so.outstanding)}
				</span>
			),
		},
		{
			key: "status",
			header: "Status",
			align: "center",
			sortable: true,
			sortValue: (so) => so.status,
			cell: (so) => (
				<span
					className={cn(
						"inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[11px] capitalize",
						statusBadgeClasses(so.status),
					)}
				>
					{so.status}
				</span>
			),
		},
	];

	const cancellationColumns: DataTableColumn<CancellationWithRelations>[] = [
		{
			key: "cancelled_at",
			header: "Date",
			sortable: true,
			sortValue: (c) => c.cancelled_at,
			cell: (c) => {
				const { date, time } = formatDateTwoLine(c.cancelled_at);
				return (
					<div className="text-xs leading-tight">
						<div>{date}</div>
						<div className="text-muted-foreground">{time}</div>
					</div>
				);
			},
		},
		{
			key: "cn_number",
			header: "Cancel #",
			sortable: true,
			sortValue: (c) => c.cn_number,
			cell: (c) => (
				<span className="font-mono font-semibold text-xs">{c.cn_number}</span>
			),
		},
		{
			key: "so_number",
			header: "Sales Order #",
			sortable: true,
			sortValue: (c) => c.sales_order?.so_number ?? "",
			cell: (c) =>
				c.sales_order ? (
					<button
						type="button"
						onClick={() => setOpenId(c.sales_order?.id ?? null)}
						className="font-mono font-semibold text-sky-600 text-xs hover:underline"
					>
						{c.sales_order.so_number}
					</button>
				) : (
					<span className="text-muted-foreground text-xs">—</span>
				),
		},
		{
			key: "amount",
			header: "Amount",
			align: "right",
			sortable: true,
			sortValue: (c) => Number(c.amount ?? 0),
			cell: (c) => (
				<span className="tabular-nums">{formatMoney(c.amount)}</span>
			),
		},
	];

	return (
		<div className="flex flex-col gap-3">
			<SegmentedTabs
				tabs={SUB_TABS}
				active={subTab}
				onChange={(key) => setSubTab(key as SubTab)}
				size="sm"
				aria-label="Sales section"
			/>
			{subTab === "history" ? (
				<DataTable<SalesOrderWithRelations>
					data={salesOrders}
					columns={salesColumns}
					getRowKey={(so) => so.id}
					searchKeys={["so_number"]}
					searchPlaceholder="Search SO number…"
					emptyMessage="No sales orders yet."
					defaultPageSize={10}
					minWidth={840}
				/>
			) : (
				<DataTable<CancellationWithRelations>
					data={cancellations}
					columns={cancellationColumns}
					getRowKey={(c) => c.id}
					searchKeys={["cn_number"]}
					searchPlaceholder="Search CN number…"
					emptyMessage="No cancellations yet."
					defaultPageSize={10}
					minWidth={560}
				/>
			)}
			<SalesOrderDetailDialog
				open={openId !== null}
				onOpenChange={(open) => {
					if (!open) setOpenId(null);
				}}
				salesOrderId={openId}
			/>
		</div>
	);
}
