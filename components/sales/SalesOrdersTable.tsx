"use client";

import { Printer } from "lucide-react";
import Image from "next/image";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SalesOrderWithRelations } from "@/lib/services/sales";
import { mediaPublicUrl } from "@/lib/storage/urls";
import { cn } from "@/lib/utils";

type Props = {
	orders: SalesOrderWithRelations[];
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

function statusDotClass(status: SalesOrderWithRelations["status"]) {
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

function initials(
	first: string | null | undefined,
	last: string | null | undefined,
) {
	return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
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

function statusLabel(status: SalesOrderWithRelations["status"]) {
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
			return status;
	}
}

export function SalesOrdersTable({ orders, onOpen }: Props) {
	const columns: DataTableColumn<SalesOrderWithRelations>[] = [
		{
			key: "print",
			header: "",
			cell: (o) => (
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								window.open(
									`/invoices/${o.id}?autoPrint=1`,
									"_blank",
									"noopener",
								);
							}}
							className="inline-flex size-7 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50"
							aria-label={`Print invoice ${o.so_number}`}
						>
							<Printer className="size-4" />
						</button>
					</TooltipTrigger>
					<TooltipContent>Print invoice</TooltipContent>
				</Tooltip>
			),
		},
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
				<div className="flex items-center gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<span
								className={cn(
									"inline-block size-2.5 shrink-0 rounded-full",
									statusDotClass(o.status),
								)}
								aria-label={statusLabel(o.status)}
							/>
						</TooltipTrigger>
						<TooltipContent>{statusLabel(o.status)}</TooltipContent>
					</Tooltip>
					<button
						type="button"
						onClick={() => onOpen?.(o.id)}
						className="font-mono font-medium text-blue-600 text-sm hover:underline"
					>
						{o.so_number}
					</button>
				</div>
			),
		},
		{
			key: "outlet",
			header: "Outlet",
			sortable: true,
			sortValue: (o) => o.outlet?.code ?? "",
			cell: (o) =>
				o.outlet ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="cursor-help font-mono text-xs uppercase">
								{o.outlet.code}
							</span>
						</TooltipTrigger>
						<TooltipContent>{o.outlet.name}</TooltipContent>
					</Tooltip>
				) : (
					<span className="text-muted-foreground text-sm">—</span>
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
					<div className="flex items-center gap-3">
						<AvatarCircle
							path={o.customer.profile_image_path}
							initials={initials(o.customer.first_name, o.customer.last_name)}
						/>
						<div className="min-w-0">
							<div className="font-medium text-sm uppercase">{name}</div>
							<div className="text-muted-foreground text-xs">
								{o.customer.code}
							</div>
							{consultant && (
								<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
									<AvatarCircle
										path={o.consultant?.profile_image_path}
										initials={initials(
											o.consultant?.first_name,
											o.consultant?.last_name,
										)}
										size={16}
									/>
									<span>Consultant: {consultant}</span>
								</div>
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
			sortValue: (o) =>
				o.created_by_employee
					? fullName(
							o.created_by_employee.first_name,
							o.created_by_employee.last_name,
						)
					: "",
			cell: (o) =>
				o.created_by_employee ? (
					<div className="flex items-center gap-3">
						<AvatarCircle
							path={o.created_by_employee.profile_image_path}
							initials={initials(
								o.created_by_employee.first_name,
								o.created_by_employee.last_name,
							)}
						/>
						<span className="text-muted-foreground text-sm uppercase">
							{fullName(
								o.created_by_employee.first_name,
								o.created_by_employee.last_name,
							)}
						</span>
					</div>
				) : (
					<span className="text-muted-foreground text-sm">—</span>
				),
		},
	];

	return (
		<TooltipProvider delayDuration={200}>
			<DataTable
				data={orders}
				columns={columns}
				getRowKey={(o) => o.id}
				searchPlaceholder="Search sales orders…"
				emptyMessage="No sales orders yet."
			/>
		</TooltipProvider>
	);
}
