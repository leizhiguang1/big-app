"use client";

import { FileText, Printer } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PaymentWithRelations } from "@/lib/services/sales";
import { mediaPublicUrl } from "@/lib/storage/urls";
import { cn } from "@/lib/utils";

type SalesOrderStatus = NonNullable<
	PaymentWithRelations["sales_order"]
>["status"];

type Props = {
	payments: PaymentWithRelations[];
	onOpen?: (salesOrderId: string) => void;
	selectedIds: Set<string>;
	onToggleSelect: (paymentId: string) => void;
	onToggleSelectAll: (checked: boolean) => void;
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

function initials(
	first: string | null | undefined,
	last: string | null | undefined,
) {
	return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function statusDotClass(status: SalesOrderStatus | undefined) {
	switch (status) {
		case "completed":
			return "bg-emerald-500";
		case "cancelled":
		case "void":
			return "bg-red-500";
		case "draft":
			return "bg-amber-500";
		default:
			return "bg-muted-foreground/50";
	}
}

function statusLabel(status: SalesOrderStatus | undefined) {
	switch (status) {
		case "completed":
			return "Completed";
		case "cancelled":
			return "Cancelled";
		case "void":
			return "Void";
		case "draft":
			return "Draft";
		default:
			return "—";
	}
}

function AvatarCircle({
	path,
	initials: init,
	size = 36,
}: {
	path: string | null | undefined;
	initials: string;
	size?: number;
}) {
	const url = mediaPublicUrl(path ?? null);
	return (
		<div
			className="relative shrink-0 overflow-hidden rounded-full border bg-muted"
			style={{ width: size, height: size }}
		>
			{url ? (
				<Image
					src={url}
					alt=""
					fill
					sizes={`${size}px`}
					className="object-cover"
					unoptimized
				/>
			) : (
				<div className="flex size-full items-center justify-center font-medium text-muted-foreground text-xs">
					{init}
				</div>
			)}
		</div>
	);
}

export function PaymentsTable({
	payments,
	onOpen,
	selectedIds,
	onToggleSelect,
	onToggleSelectAll,
}: Props) {
	const allSelected =
		payments.length > 0 && payments.every((p) => selectedIds.has(p.id));
	const someSelected =
		!allSelected && payments.some((p) => selectedIds.has(p.id));

	const columns: DataTableColumn<PaymentWithRelations>[] = [
		{
			key: "select",
			header: (
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="inline-flex">
							<Checkbox
								checked={
									allSelected ? true : someSelected ? "indeterminate" : false
								}
								onCheckedChange={(v) => onToggleSelectAll(v === true)}
								aria-label="Select all"
							/>
						</div>
					</TooltipTrigger>
					<TooltipContent>Bulk print</TooltipContent>
				</Tooltip>
			),
			cell: (p) => (
				<Checkbox
					checked={selectedIds.has(p.id)}
					onCheckedChange={() => onToggleSelect(p.id)}
					onClick={(e) => e.stopPropagation()}
					aria-label={`Select payment ${p.invoice_no}`}
				/>
			),
		},
		{
			key: "actions",
			header: "",
			cell: (p) => {
				const soId = p.sales_order?.id;
				if (!soId) return null;
				return (
					<div className="flex items-center gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										window.open(
											`/invoices/${soId}?autoPrint=1&variant=receipt`,
											"_blank",
											"noopener",
										);
									}}
									className="inline-flex size-7 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50"
									aria-label={`Print receipt ${p.invoice_no}`}
								>
									<Printer className="size-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent>Print receipt</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										window.open(
											`/invoices/${soId}?autoPrint=1&variant=invoice`,
											"_blank",
											"noopener",
										);
									}}
									className="inline-flex size-7 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50"
									aria-label={`Print invoice ${p.invoice_no}`}
								>
									<FileText className="size-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent>Print invoice</TooltipContent>
						</Tooltip>
					</div>
				);
			},
		},
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
			key: "so_number",
			header: "Sales order #",
			sortable: true,
			sortValue: (p) => p.sales_order?.so_number ?? "",
			cell: (p) => {
				const so = p.sales_order;
				if (!so)
					return <span className="text-muted-foreground text-sm">—</span>;
				return (
					<div className="flex items-center gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<span
									className={cn(
										"inline-block size-2.5 shrink-0 rounded-full",
										statusDotClass(so.status),
									)}
									role="img"
									aria-label={statusLabel(so.status)}
								/>
							</TooltipTrigger>
							<TooltipContent>{statusLabel(so.status)}</TooltipContent>
						</Tooltip>
						<button
							type="button"
							onClick={() => onOpen?.(so.id)}
							className="font-mono font-medium text-blue-600 text-sm hover:underline"
						>
							{so.so_number}
						</button>
					</div>
				);
			},
		},
		{
			key: "outlet",
			header: "Outlet",
			sortable: true,
			sortValue: (p) => p.outlet?.code ?? "",
			cell: (p) =>
				p.outlet ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="cursor-help font-mono text-xs uppercase">
								{p.outlet.code}
							</span>
						</TooltipTrigger>
						<TooltipContent>{p.outlet.name}</TooltipContent>
					</Tooltip>
				) : (
					<span className="text-muted-foreground text-sm">—</span>
				),
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
			header: "Total paid (MYR)",
			sortable: true,
			align: "right",
			sortValue: (p) => Number(p.amount),
			cell: (p) => (
				<span className="tabular-nums">{money(Number(p.amount))}</span>
			),
		},
		{
			key: "customer",
			header: "Customer name",
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
				const name = fullName(cust.first_name, cust.last_name);
				const consultant = p.sales_order?.consultant
					? fullName(
							p.sales_order.consultant.first_name,
							p.sales_order.consultant.last_name,
						)
					: null;
				return (
					<div className="flex items-center gap-3">
						<AvatarCircle
							path={cust.profile_image_path}
							initials={initials(cust.first_name, cust.last_name)}
						/>
						<div className="flex min-w-0 flex-col leading-tight">
							<span className="truncate font-semibold text-sm uppercase">
								{name}
							</span>
							<span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
								{cust.code}
							</span>
							{consultant && (
								<span className="mt-0.5 text-[11px] text-muted-foreground">
									<span className="text-muted-foreground/70">Consultant</span> ·{" "}
									{consultant}
								</span>
							)}
						</div>
					</div>
				);
			},
		},
		{
			key: "created_by",
			header: "Created by",
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
					<div className="flex items-center gap-3">
						<AvatarCircle
							path={p.processed_by_employee.profile_image_path}
							initials={initials(
								p.processed_by_employee.first_name,
								p.processed_by_employee.last_name,
							)}
						/>
						<span className="text-muted-foreground text-sm uppercase">
							{fullName(
								p.processed_by_employee.first_name,
								p.processed_by_employee.last_name,
							)}
						</span>
					</div>
				) : (
					<span className="text-muted-foreground text-sm">—</span>
				),
		},
		{
			key: "e_invoice_status",
			header: "E-invoice status",
			cell: () => (
				<Tooltip>
					<TooltipTrigger asChild>
						<Badge
							variant="outline"
							className="cursor-help border-muted-foreground/30 bg-muted/50 text-muted-foreground text-xs"
						>
							Not sent to LHDN
						</Badge>
					</TooltipTrigger>
					<TooltipContent>
						LHDN e-invoice integration not yet enabled
					</TooltipContent>
				</Tooltip>
			),
		},
	];

	return (
		<TooltipProvider delayDuration={200}>
			<DataTable
				data={payments}
				columns={columns}
				getRowKey={(p) => p.id}
				searchPlaceholder="Search payments…"
				emptyMessage="No payment records yet."
			/>
		</TooltipProvider>
	);
}
