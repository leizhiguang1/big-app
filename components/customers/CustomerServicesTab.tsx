"use client";

// ⚠ DRAFT v0 — pending design review (2026-04-27).
// See docs/modules/03-customers.md "Services tab" + lib/services/customer-services.ts.
// Don't extend this UI until the underlying model is confirmed.

import { Mail, MessageCircle, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SalesOrderDetailDialog } from "@/components/sales/SalesOrderDetailDialog";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	CustomerServiceBalance,
	CustomerServiceRedemption,
} from "@/lib/services/customer-services";
import { cn } from "@/lib/utils";

type SubTab = "redemption" | "balance";

type Props = {
	redemptions: CustomerServiceRedemption[];
	balances: CustomerServiceBalance[];
};

const SUB_TABS = [
	{ key: "redemption", label: "Redemption" },
	{ key: "balance", label: "Balance" },
];

function formatMoney(n: number | string | null | undefined): string {
	return Number(n ?? 0).toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function formatDateTime(iso: string): string {
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

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function employeeName(
	emp: { first_name: string; last_name: string | null } | null,
): string {
	if (!emp) return "—";
	return `${emp.first_name} ${emp.last_name ?? ""}`.trim().toUpperCase();
}

function paymentBadge(
	status: CustomerServiceBalance["payment_status"],
): string {
	if (status === "paid")
		return "border-emerald-300 bg-emerald-50 text-emerald-700";
	if (status === "partial")
		return "border-amber-300 bg-amber-50 text-amber-700";
	return "border-rose-300 bg-rose-50 text-rose-700";
}

function paymentLabel(
	status: CustomerServiceBalance["payment_status"],
): string {
	if (status === "paid") return "Paid";
	if (status === "partial") return "Partial Paid";
	return "Unpaid";
}

export function CustomerServicesTab({ redemptions, balances }: Props) {
	const [subTab, setSubTab] = useState<SubTab>("redemption");
	const [openSoId, setOpenSoId] = useState<string | null>(null);

	const redemptionColumns: DataTableColumn<CustomerServiceRedemption>[] = [
		{
			key: "appointment",
			header: "Appointment",
			sortable: true,
			sortValue: (r) => r.appointment_start_at,
			cell: (r) => (
				<div className="flex flex-col gap-0.5 text-xs leading-tight">
					<div className="font-mono font-semibold">{r.booking_ref}</div>
					{(r.outlet || r.room) && (
						<div className="text-[11px] text-muted-foreground uppercase">
							{[r.outlet?.name, r.room?.name].filter(Boolean).join(" · ")}
						</div>
					)}
					<div className="text-[11px] text-muted-foreground">
						<span className="text-emerald-600">
							{formatDateTime(r.appointment_start_at)}
						</span>
						{r.appointment_end_at && (
							<>
								{" → "}
								<span className="text-rose-600">
									{formatTime(r.appointment_end_at)}
								</span>
							</>
						)}
					</div>
				</div>
			),
		},
		{
			key: "trans",
			header: "Trans #",
			sortable: true,
			sortValue: (r) => r.sales_order?.so_number ?? "",
			cell: (r) =>
				r.sales_order ? (
					<button
						type="button"
						onClick={() => setOpenSoId(r.sales_order?.id ?? null)}
						className="font-mono font-semibold text-sky-600 text-xs hover:underline"
					>
						{r.sales_order.so_number}
					</button>
				) : (
					<span className="text-muted-foreground text-xs">—</span>
				),
		},
		{
			key: "service",
			header: "Service",
			cell: (r) => (
				<div className="flex flex-col text-xs leading-tight">
					<span className="font-medium">
						{r.service?.sku && (
							<span className="text-muted-foreground">({r.service.sku}) </span>
						)}
						{r.service?.name ?? r.description ?? "—"}
					</span>
					<span className="text-[11px] text-muted-foreground tabular-nums">
						× {r.quantity}
					</span>
				</div>
			),
		},
		{
			key: "hands_on",
			header: "Hands-On Employee",
			sortable: true,
			sortValue: (r) => employeeName(r.hands_on_employee),
			cell: (r) => (
				<span className="text-xs">{employeeName(r.hands_on_employee)}</span>
			),
		},
		{
			key: "processed_by",
			header: "Processed By",
			sortable: true,
			sortValue: (r) => employeeName(r.processed_by_employee),
			cell: (r) => (
				<div className="flex flex-col text-xs leading-tight">
					<span>{employeeName(r.processed_by_employee)}</span>
					{r.processed_at && (
						<span className="text-[11px] text-muted-foreground">
							{formatDateTime(r.processed_at)}
						</span>
					)}
				</div>
			),
		},
		{
			key: "actions",
			header: "",
			align: "right",
			cell: (r) => (
				<div className="flex items-center justify-end gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								disabled
								aria-label="Print redemption receipt"
							>
								<Printer />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Redemption receipt — Phase 2</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								disabled
								aria-label="Email redemption receipt"
							>
								<Mail />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Email receipt — Phase 2</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								disabled
								aria-label="Send receipt via WhatsApp"
							>
								<MessageCircle />
							</Button>
						</TooltipTrigger>
						<TooltipContent>WhatsApp receipt — Phase 2</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button asChild size="sm" className="rounded-full">
								<Link href={`/appointments/${r.booking_ref}`}>Go</Link>
							</Button>
						</TooltipTrigger>
						<TooltipContent>Open appointment</TooltipContent>
					</Tooltip>
				</div>
			),
		},
	];

	const balanceColumns: DataTableColumn<CustomerServiceBalance>[] = [
		{
			key: "date",
			header: "Date",
			sortable: true,
			sortValue: (b) => b.sales_order.sold_at,
			cell: (b) => (
				<span className="whitespace-nowrap text-xs">
					{formatDate(b.sales_order.sold_at)}
				</span>
			),
		},
		{
			key: "trans",
			header: "Trans #",
			sortable: true,
			sortValue: (b) => b.sales_order.so_number,
			cell: (b) => (
				<button
					type="button"
					onClick={() => setOpenSoId(b.sales_order.id)}
					className="font-mono font-semibold text-sky-600 text-xs hover:underline"
				>
					{b.sales_order.so_number}
				</button>
			),
		},
		{
			key: "service",
			header: "Service",
			cell: (b) => (
				<div className="flex flex-col text-xs leading-tight">
					<span className="font-medium">
						{b.service?.sku && (
							<span className="text-muted-foreground">({b.service.sku}) </span>
						)}
						{b.service?.name ?? b.item_name}
					</span>
				</div>
			),
		},
		{
			key: "purchased",
			header: "Purchased",
			align: "right",
			sortable: true,
			sortValue: (b) => b.purchased,
			cell: (b) => <span className="tabular-nums">{b.purchased}</span>,
		},
		{
			key: "redeemed",
			header: "Redeemed",
			align: "right",
			sortable: true,
			sortValue: (b) => b.redeemed,
			cell: (b) => (
				<span className="tabular-nums text-muted-foreground">{b.redeemed}</span>
			),
		},
		{
			key: "balance",
			header: "Balance",
			align: "right",
			sortable: true,
			sortValue: (b) => b.balance,
			cell: (b) => (
				<span
					className={cn(
						"font-semibold tabular-nums",
						b.balance > 0 ? "text-sky-600" : "text-muted-foreground",
					)}
				>
					{b.balance}
				</span>
			),
		},
		{
			key: "payment_status",
			header: "Payment Status",
			align: "right",
			sortable: true,
			sortValue: (b) => b.payment_status,
			cell: (b) => {
				const owing = Math.max(b.line_total - b.allocated_paid, 0);
				return (
					<div className="flex flex-col items-end gap-1">
						<span
							className={cn(
								"inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[11px]",
								paymentBadge(b.payment_status),
							)}
						>
							{paymentLabel(b.payment_status)}
						</span>
						<div className="text-[10px] leading-tight text-right">
							<div className="text-muted-foreground tabular-nums">
								Price: MYR {formatMoney(b.line_total)}
							</div>
							<div className="text-emerald-600 tabular-nums">
								Paid: MYR {formatMoney(b.allocated_paid)}
							</div>
							{owing > 0 && (
								<div className="text-rose-600 tabular-nums">
									Owing: MYR {formatMoney(owing)}
								</div>
							)}
						</div>
					</div>
				);
			},
		},
	];

	return (
		<div className="flex flex-col gap-3">
			<SegmentedTabs
				tabs={SUB_TABS}
				active={subTab}
				onChange={(key) => setSubTab(key as SubTab)}
				size="sm"
				aria-label="Services section"
			/>
			{subTab === "redemption" ? (
				<DataTable<CustomerServiceRedemption>
					data={redemptions}
					columns={redemptionColumns}
					getRowKey={(r) => r.line_item_id}
					searchKeys={["booking_ref"]}
					searchPlaceholder="Search booking ref…"
					emptyMessage="No services redeemed yet."
					defaultPageSize={10}
					minWidth={920}
				/>
			) : (
				<DataTable<CustomerServiceBalance>
					data={balances}
					columns={balanceColumns}
					getRowKey={(b) => b.sale_item_id}
					searchKeys={["item_name"]}
					searchPlaceholder="Search service…"
					emptyMessage="No service purchases yet."
					defaultPageSize={10}
					minWidth={780}
				/>
			)}
			<SalesOrderDetailDialog
				open={openSoId !== null}
				onOpenChange={(open) => {
					if (!open) setOpenSoId(null);
				}}
				salesOrderId={openSoId}
			/>
		</div>
	);
}
