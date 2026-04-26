"use client";

import { FileText, Receipt } from "lucide-react";
import { useState } from "react";
import { PrintReceiptDialog } from "@/components/sales/PrintReceiptDialog";
import { SalesOrderDetailDialog } from "@/components/sales/SalesOrderDetailDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	PaymentWithRelations,
	RefundNoteWithRelations,
	SalesOrderWithRelations,
} from "@/lib/services/sales";
import { cn } from "@/lib/utils";

type SubTab = "history" | "outstanding";

type Props = {
	payments: PaymentWithRelations[];
	refundNotes: RefundNoteWithRelations[];
	outstandingSalesOrders: SalesOrderWithRelations[];
	subTab: SubTab;
	onSubTabChange: (tab: SubTab) => void;
};

const SUB_TABS = [
	{ key: "history", label: "History" },
	{ key: "outstanding", label: "Outstanding" },
];

type HistoryRow = {
	id: string;
	kind: "payment" | "refund";
	occurredAt: string;
	documentNo: string;
	paymentId: string | null;
	salesOrderId: string | null;
	salesOrderNo: string | null;
	salesOrderStatus: string | null;
	amount: number;
};

function formatMoney(n: number | string | null | undefined): string {
	return Number(n ?? 0).toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
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
			hour12: false,
		}),
	};
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function statusLabel(status: string | null): string {
	if (!status) return "—";
	return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusBadgeClasses(status: string | null): string {
	switch (status) {
		case "paid":
			return "border-emerald-300 bg-emerald-50 text-emerald-700";
		case "partial":
			return "border-amber-300 bg-amber-50 text-amber-700";
		case "unpaid":
			return "border-rose-300 bg-rose-50 text-rose-700";
		case "cancelled":
			return "border-rose-300 bg-rose-100 text-rose-700";
		default:
			return "border-slate-300 bg-slate-50 text-slate-700";
	}
}

export function CustomerPaymentsTab({
	payments,
	refundNotes,
	outstandingSalesOrders,
	subTab,
	onSubTabChange,
}: Props) {
	const [openId, setOpenId] = useState<string | null>(null);
	const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

	return (
		<div className="flex flex-col gap-3">
			<SegmentedTabs
				tabs={SUB_TABS}
				active={subTab}
				onChange={(key) => onSubTabChange(key as SubTab)}
				size="sm"
				aria-label="Payments section"
			/>
			{subTab === "history" ? (
				<HistoryView
					payments={payments}
					refundNotes={refundNotes}
					onOpenSalesOrder={setOpenId}
					onOpenReceipt={setReceiptPaymentId}
				/>
			) : (
				<OutstandingView
					salesOrders={outstandingSalesOrders}
					onOpenSalesOrder={setOpenId}
				/>
			)}
			<SalesOrderDetailDialog
				open={openId !== null}
				onOpenChange={(open) => {
					if (!open) setOpenId(null);
				}}
				salesOrderId={openId}
			/>
			<PrintReceiptDialog
				open={receiptPaymentId !== null}
				paymentId={receiptPaymentId}
				onOpenChange={(open) => {
					if (!open) setReceiptPaymentId(null);
				}}
			/>
		</div>
	);
}

function buildHistoryRows(
	payments: PaymentWithRelations[],
	refundNotes: RefundNoteWithRelations[],
): HistoryRow[] {
	const paymentRows: HistoryRow[] = payments.map((p) => ({
		id: `p-${p.id}`,
		kind: "payment",
		occurredAt: p.paid_at,
		documentNo: p.invoice_no,
		paymentId: p.id,
		salesOrderId: p.sales_order?.id ?? null,
		salesOrderNo: p.sales_order?.so_number ?? null,
		salesOrderStatus: p.sales_order?.status ?? null,
		amount: Number(p.amount ?? 0),
	}));
	const refundRows: HistoryRow[] = refundNotes.map((rn) => ({
		id: `r-${rn.id}`,
		kind: "refund",
		occurredAt: rn.refunded_at,
		documentNo: rn.rn_number,
		paymentId: null,
		salesOrderId: rn.sales_order?.id ?? null,
		salesOrderNo: rn.sales_order?.so_number ?? null,
		salesOrderStatus: rn.sales_order?.status ?? null,
		amount: -Math.abs(Number(rn.amount ?? 0)),
	}));
	return [...paymentRows, ...refundRows].sort((a, b) =>
		a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0,
	);
}

function HistoryView({
	payments,
	refundNotes,
	onOpenSalesOrder,
	onOpenReceipt,
}: {
	payments: PaymentWithRelations[];
	refundNotes: RefundNoteWithRelations[];
	onOpenSalesOrder: (id: string) => void;
	onOpenReceipt: (paymentId: string) => void;
}) {
	const rows = buildHistoryRows(payments, refundNotes);

	const columns: DataTableColumn<HistoryRow>[] = [
		{
			key: "actions",
			header: "",
			headerClassName: "w-[80px]",
			className: "w-[80px]",
			cell: (row) => <RowActions row={row} onOpenReceipt={onOpenReceipt} />,
		},
		{
			key: "occurredAt",
			header: "Date",
			sortable: true,
			sortValue: (row) => row.occurredAt,
			cell: (row) => {
				const { date, time } = formatDateTwoLine(row.occurredAt);
				return (
					<div className="text-xs leading-tight">
						<div>{date}</div>
						<div className="text-muted-foreground">{time}</div>
					</div>
				);
			},
		},
		{
			key: "documentNo",
			header: "Invoice #",
			sortable: true,
			sortValue: (row) => row.documentNo,
			cell: (row) => (
				<span className="font-mono font-semibold text-xs">
					{row.documentNo}
				</span>
			),
		},
		{
			key: "salesOrderNo",
			header: "Sales Order #",
			sortable: true,
			sortValue: (row) => row.salesOrderNo ?? "",
			cell: (row) =>
				row.salesOrderId && row.salesOrderNo ? (
					<button
						type="button"
						onClick={() => {
							if (row.salesOrderId) onOpenSalesOrder(row.salesOrderId);
						}}
						className="font-mono text-sky-600 text-xs hover:underline"
					>
						{row.salesOrderNo}
					</button>
				) : (
					<span className="text-muted-foreground text-xs">—</span>
				),
		},
		{
			key: "amount",
			header: "Payment",
			align: "right",
			sortable: true,
			sortValue: (row) => row.amount,
			cell: (row) => (
				<span
					className={cn(
						"tabular-nums",
						row.amount < 0 ? "text-rose-600" : "",
					)}
				>
					{formatMoney(row.amount)}
				</span>
			),
		},
		{
			key: "status",
			header: "Status",
			align: "center",
			sortable: true,
			sortValue: (row) => row.salesOrderStatus ?? "",
			cell: (row) => (
				<span
					className={cn(
						"inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[11px]",
						statusBadgeClasses(row.salesOrderStatus),
					)}
				>
					{statusLabel(row.salesOrderStatus)}
				</span>
			),
		},
	];

	return (
		<DataTable<HistoryRow>
			data={rows}
			columns={columns}
			getRowKey={(row) => row.id}
			searchKeys={["documentNo", "salesOrderNo"]}
			searchPlaceholder="Search invoice or SO…"
			emptyMessage="No payment history yet."
			defaultPageSize={10}
			minWidth={760}
		/>
	);
}

function RowActions({
	row,
	onOpenReceipt,
}: {
	row: HistoryRow;
	onOpenReceipt: (paymentId: string) => void;
}) {
	const invoiceHref = row.salesOrderId
		? `/invoices/${row.salesOrderId}?autoPrint=1`
		: null;
	const receiptEnabled = row.kind === "payment" && row.paymentId !== null;

	return (
		<div className="flex items-center gap-1">
			<Tooltip>
				<TooltipTrigger asChild>
					<a
						href={invoiceHref ?? "#"}
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Print invoice"
						aria-disabled={!invoiceHref}
						onClick={(e) => {
							if (!invoiceHref) e.preventDefault();
						}}
						className={cn(
							"inline-flex size-7 items-center justify-center rounded border bg-white text-sky-600 hover:bg-sky-50",
							!invoiceHref && "pointer-events-none opacity-40",
						)}
					>
						<FileText className="size-3.5" />
					</a>
				</TooltipTrigger>
				<TooltipContent>Print Invoice</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						aria-label="Print receipt"
						disabled={!receiptEnabled}
						onClick={() => {
							if (row.paymentId) onOpenReceipt(row.paymentId);
						}}
						className={cn(
							"inline-flex size-7 items-center justify-center rounded border bg-white text-sky-600 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40",
						)}
					>
						<Receipt className="size-3.5" />
					</button>
				</TooltipTrigger>
				<TooltipContent>Print Receipt</TooltipContent>
			</Tooltip>
		</div>
	);
}

function OutstandingView({
	salesOrders,
	onOpenSalesOrder,
}: {
	salesOrders: SalesOrderWithRelations[];
	onOpenSalesOrder: (id: string) => void;
}) {
	if (salesOrders.length === 0) {
		return (
			<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
				No outstanding balance.
			</div>
		);
	}

	const total = salesOrders.reduce(
		(sum, so) => sum + Number(so.outstanding ?? 0),
		0,
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm">
				<span className="text-muted-foreground text-xs uppercase">
					Total outstanding
				</span>
				<span className="font-semibold text-rose-600 tabular-nums">
					MYR {formatMoney(total)}
				</span>
			</div>

			<div className="rounded-xl border bg-card shadow-sm">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
							<th className="px-3 py-2 text-left font-medium">Date</th>
							<th className="px-3 py-2 text-left font-medium">Sales Order #</th>
							<th className="px-3 py-2 text-right font-medium">Sales</th>
							<th className="px-3 py-2 text-right font-medium">Payment</th>
							<th className="px-3 py-2 text-right font-medium">Outstanding</th>
						</tr>
					</thead>
					<tbody>
						{salesOrders.map((so) => (
							<tr
								key={so.id}
								className="border-b last:border-b-0 hover:bg-muted/30"
							>
								<td className="px-3 py-2 text-[12px]">
									{formatDate(so.sold_at)}
								</td>
								<td className="px-3 py-2 font-mono text-[12px]">
									<button
										type="button"
										onClick={() => onOpenSalesOrder(so.id)}
										className="text-sky-700 hover:underline"
									>
										{so.so_number}
									</button>
								</td>
								<td className="px-3 py-2 text-right tabular-nums">
									{formatMoney(so.total)}
								</td>
								<td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
									{formatMoney(so.amount_paid)}
								</td>
								<td
									className={cn(
										"px-3 py-2 text-right tabular-nums",
										Number(so.outstanding ?? 0) > 0
											? "font-semibold text-rose-600"
											: "text-muted-foreground",
									)}
								>
									{formatMoney(so.outstanding)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
