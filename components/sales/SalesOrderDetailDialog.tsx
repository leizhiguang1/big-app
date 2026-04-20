"use client";

import { Ban, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CancelOrderDialog } from "@/components/sales/CancelOrderDialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	getSalesOrderDetailAction,
	type SalesOrderDetailResult,
} from "@/lib/actions/sales";
import type {
	PaymentWithProcessedBy,
	SaleItem,
	SalesOrderWithRelations,
} from "@/lib/services/sales";
import { cn } from "@/lib/utils";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	salesOrderId: string | null;
};

type LoadState =
	| { status: "idle" }
	| { status: "loading" }
	| {
			status: "ready";
			order: SalesOrderWithRelations;
			items: SaleItem[];
			payments: PaymentWithProcessedBy[];
	  }
	| { status: "not_found" }
	| { status: "error"; message: string };

function money(n: number | string | null | undefined): string {
	const v = typeof n === "string" ? Number(n) : (n ?? 0);
	return Number.isFinite(v)
		? v.toLocaleString("en-MY", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})
		: "0.00";
}

function fullName(
	first: string | null | undefined,
	last: string | null | undefined,
) {
	return [first, last].filter(Boolean).join(" ").trim();
}

function formatHeaderDate(iso: string) {
	const d = new Date(iso);
	const day = d.getDate();
	const suffix =
		day >= 11 && day <= 13
			? "th"
			: day % 10 === 1
				? "st"
				: day % 10 === 2
					? "nd"
					: day % 10 === 3
						? "rd"
						: "th";
	const month = d.toLocaleDateString("en-US", { month: "long" });
	const year = d.getFullYear();
	const time = d
		.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		})
		.toLowerCase();
	return `${month} ${day}${suffix} ${year}, ${time}`;
}

function formatPaymentDate(iso: string) {
	const d = new Date(iso);
	return `${d.getDate()} ${d.toLocaleDateString("en-GB", {
		month: "long",
	})} ${d.getFullYear()} ${d.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	})}`;
}

export function SalesOrderDetailDialog({
	open,
	onOpenChange,
	salesOrderId,
}: Props) {
	const router = useRouter();
	const [state, setState] = useState<LoadState>({ status: "idle" });
	const [cancelOpen, setCancelOpen] = useState(false);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	useEffect(() => {
		if (!open || !salesOrderId) {
			setState({ status: "idle" });
			setFeedback(null);
			return;
		}
		let cancelled = false;
		setState({ status: "loading" });
		getSalesOrderDetailAction(salesOrderId)
			.then((res: SalesOrderDetailResult) => {
				if (cancelled) return;
				if (!res.ok) {
					setState({ status: "not_found" });
					return;
				}
				setState({
					status: "ready",
					order: res.order,
					items: res.items,
					payments: res.payments,
				});
			})
			.catch((err) => {
				if (cancelled) return;
				setState({
					status: "error",
					message: err instanceof Error ? err.message : "Failed to load order",
				});
			});
		return () => {
			cancelled = true;
		};
	}, [open, salesOrderId]);

	const order = state.status === "ready" ? state.order : null;
	const isCancellable =
		order !== null &&
		(order.status === "completed" || order.status === "draft");

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
					<DialogHeader className="sr-only">
						<DialogTitle>Sales order detail</DialogTitle>
						<DialogDescription>
							Items, payment details and payment history for this sales order.
						</DialogDescription>
					</DialogHeader>
					<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-4 sm:flex-row sm:p-6">
						{state.status === "loading" && <LoadingSkeleton />}
						{state.status === "not_found" && (
							<div className="flex flex-1 items-center justify-center rounded-md border bg-white p-12 text-muted-foreground text-sm">
								Sales order not found.
							</div>
						)}
						{state.status === "error" && (
							<div className="flex flex-1 items-center justify-center rounded-md border border-red-200 bg-red-50 p-12 text-red-800 text-sm">
								{state.message}
							</div>
						)}
						{state.status === "ready" && (
							<TooltipProvider delayDuration={200}>
								<LeftPanel order={state.order} items={state.items} />
								<RightPanel order={state.order} payments={state.payments} />
							</TooltipProvider>
						)}
					</div>
					{order !== null && (
						<div className="flex flex-col gap-2 border-t bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
							<div className="min-h-[20px] text-sm">
								{feedback && (
									<span
										className={
											feedback.type === "success"
												? "text-green-700"
												: "text-red-700"
										}
									>
										{feedback.message}
									</span>
								)}
								{!feedback && order.status === "cancelled" && (
									<span className="text-muted-foreground">
										This sales order is cancelled.
									</span>
								)}
							</div>
							{isCancellable && (
								<Button
									variant="outline"
									size="sm"
									className="self-end text-red-600 hover:bg-red-50 hover:text-red-700 sm:self-auto"
									onClick={() => {
										setFeedback(null);
										setCancelOpen(true);
									}}
								>
									<Ban className="mr-2 size-4" />
									Cancel order
								</Button>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>

			{order !== null && (
				<CancelOrderDialog
					open={cancelOpen}
					onOpenChange={setCancelOpen}
					salesOrderId={order.id}
					soNumber={order.so_number}
					onSuccess={(cnNumber) => {
						setFeedback({
							type: "success",
							message: `Order cancelled. Cancellation note: ${cnNumber}`,
						});
						router.refresh();
					}}
					onError={(msg) => setFeedback({ type: "error", message: msg })}
				/>
			)}
		</>
	);
}

function LoadingSkeleton() {
	return (
		<>
			<div className="flex-1 space-y-3">
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-96 w-full" />
			</div>
			<div className="sm:w-[360px]">
				<Skeleton className="h-full min-h-[500px] w-full" />
			</div>
		</>
	);
}

function LeftPanel({
	order,
	items,
}: {
	order: SalesOrderWithRelations;
	items: SaleItem[];
}) {
	const customerName = order.customer
		? fullName(order.customer.first_name, order.customer.last_name)
		: "Walk-in";
	const consultantName = order.consultant
		? fullName(order.consultant.first_name, order.consultant.last_name)
		: null;
	const totalPaid = Number(order.amount_paid ?? 0);
	const orderTotal = Number(order.total ?? 0);
	const paidRatio = orderTotal > 0 ? totalPaid / orderTotal : 0;

	return (
		<div className="flex min-w-0 flex-1 flex-col gap-3">
			<section className="rounded-md border bg-white p-4 shadow-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="font-semibold text-lg">{order.so_number}</h2>
						<p className="text-muted-foreground text-xs">
							({formatHeaderDate(order.sold_at)})
						</p>
					</div>
				</div>
				<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2 text-sm">
						<span className="flex size-7 items-center justify-center rounded-full bg-sky-100 font-semibold text-[11px] text-sky-800 uppercase">
							{customerName.slice(0, 2)}
						</span>
						<div>
							<div className="font-semibold text-blue-700 uppercase">
								{customerName}
							</div>
							{order.customer?.code && (
								<div className="text-[11px] text-muted-foreground">
									({order.customer.code})
								</div>
							)}
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<PlaceholderPill tooltip="Payment reallocation — Phase 2">
							Enable Payment Reallocation
						</PlaceholderPill>
						<PlaceholderPill tooltip="Reallocation — Phase 2">
							Reallocation
						</PlaceholderPill>
						<PlaceholderPill tooltip="Refunds — Phase 2">
							Refund
						</PlaceholderPill>
					</div>
				</div>
			</section>

			<section className="rounded-md border bg-white shadow-sm">
				<div className="grid grid-cols-[1.8fr_90px_90px_110px_90px] items-center border-b bg-muted/30 px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase">
					<div>Item(s)</div>
					<div className="text-right">Redeemed</div>
					<div className="text-right">Discount</div>
					<div className="text-right">Total</div>
					<div className="text-right">Paid</div>
				</div>
				<div className="divide-y">
					{items.map((item) => {
						const itemTotal = Number(item.total ?? 0);
						const itemPaid =
							orderTotal > 0 ? Math.min(itemTotal, itemTotal * paidRatio) : 0;
						return (
							<ItemRow
								key={item.id}
								item={item}
								itemPaid={itemPaid}
								consultantName={consultantName}
							/>
						);
					})}
					{items.length === 0 && (
						<div className="px-4 py-8 text-center text-muted-foreground text-sm">
							No line items.
						</div>
					)}
				</div>
			</section>
		</div>
	);
}

function ItemRow({
	item,
	itemPaid,
	consultantName,
}: {
	item: SaleItem;
	itemPaid: number;
	consultantName: string | null;
}) {
	const typeLabel =
		item.item_type === "service"
			? "SVC"
			: item.item_type === "product"
				? "PRD"
				: "CHG";
	const taxLabel =
		item.tax_name && item.tax_rate_pct != null
			? `${item.tax_name} (${Number(item.tax_rate_pct)}%)`
			: "LOCAL (0%)";
	const taxAmount = Number(item.tax_amount ?? 0);

	return (
		<div className="px-4 py-3 text-sm">
			<div className="grid grid-cols-[1.8fr_90px_90px_110px_90px] items-start gap-2">
				<div className="flex gap-2">
					<span className="mt-1 inline-block size-2 shrink-0 rounded-full bg-emerald-500" />
					<div className="min-w-0">
						<div className="font-semibold uppercase leading-snug">
							{item.item_name}
						</div>
						<div className="text-[11px] text-rose-600">
							({typeLabel}) {item.sku ?? "—"}
						</div>
						<div className="mt-2 text-[11px] text-muted-foreground">
							<div>QTY: {item.quantity}</div>
							<div>Price: MYR {money(item.unit_price)}</div>
						</div>
					</div>
				</div>
				<div className="text-right tabular-nums">{item.quantity}</div>
				<div className="text-right tabular-nums">
					MYR {money(item.discount)}
				</div>
				<div className="text-right tabular-nums">
					<div>MYR {money(item.total)}</div>
					<div className="mt-0.5 text-[10px] text-sky-600">
						Exclusive Tax
						<br />
						{taxLabel}:
						<br />
						MYR{money(taxAmount)}
					</div>
				</div>
				<div className="text-right tabular-nums">MYR {money(itemPaid)}</div>
			</div>

			{consultantName && (
				<div className="mt-3 flex items-center gap-2 text-[11px]">
					<span className="text-sky-600">Sales Order Allocation:</span>
					<span className="inline-flex items-center gap-1.5 rounded-full border bg-white px-2 py-0.5">
						<span className="inline-block size-4 rounded-full bg-muted" />
						<span className="font-semibold uppercase">{consultantName}</span>
						<span className="text-muted-foreground">(100.00%)</span>
					</span>
				</div>
			)}

			<details className="mt-2 text-[11px]">
				<summary className="cursor-pointer text-sky-600 marker:text-sky-600">
					Payment Allocation
				</summary>
				<div className="mt-1 rounded-md border border-dashed bg-muted/20 p-2 text-muted-foreground">
					Per-item payment allocation — Phase 2.
				</div>
			</details>
		</div>
	);
}

function RightPanel({
	order,
	payments,
}: {
	order: SalesOrderWithRelations;
	payments: PaymentWithProcessedBy[];
}) {
	const subtotal = Number(order.subtotal ?? 0);
	const total = Number(order.total ?? 0);
	const tax = Number(order.tax ?? 0);
	const outstanding = Number(order.outstanding ?? 0);
	const hasOutstanding = outstanding > 0.005;

	return (
		<aside className="flex w-full flex-col gap-3 sm:w-[360px] sm:shrink-0">
			<section className="rounded-md border bg-white p-4 shadow-sm">
				<h3 className="text-center font-semibold text-base">Payment Details</h3>
				<dl className="mt-3 space-y-2 text-sm">
					<DetailRow label="Sub Total" value={`MYR ${money(subtotal)}`} />
					<DetailRow label="Voucher" value={`(MYR 0.00)`} />
					<DetailRow label="Total" value={`MYR ${money(subtotal)}`} />
					<DetailRow
						label={
							<span className="text-sky-600">
								Total Tax Amount (MYR){" "}
								<span className="text-xs" aria-hidden>
									ⓘ
								</span>
							</span>
						}
						value={<span className="text-sky-600">MYR {money(tax)}</span>}
					/>
					<DetailRow label="Gross Total" value={`MYR ${money(total)}`} />
				</dl>

				<h4 className="mt-5 font-semibold text-sky-700 text-sm">
					Payment History:
				</h4>
				<div className="mt-1 border-b pb-1 text-[11px] text-muted-foreground">
					<div className="flex justify-between">
						<span>Invoice No. &amp; Date</span>
						<span>Amount</span>
					</div>
				</div>

				<div className="mt-2 space-y-4">
					{payments.length === 0 && (
						<p className="text-muted-foreground text-xs">No payments yet.</p>
					)}
					{payments.map((p, idx) => (
						<PaymentHistoryRow
							key={p.id}
							payment={p}
							isLast={idx === payments.length - 1}
						/>
					))}
				</div>

				{hasOutstanding && (
					<div className="mt-5 border-t pt-3 text-sm">
						<div className="flex items-center justify-between">
							<span className="font-semibold text-rose-600">Outstanding:</span>
							<span className="font-semibold text-rose-600 tabular-nums">
								MYR {money(outstanding)}
							</span>
						</div>
						<div className="mt-2 flex flex-col gap-1">
							<PlaceholderLink tooltip="Pay Now — Phase 2">
								Pay Now ?
							</PlaceholderLink>
							<PlaceholderLink tooltip="Write Off Outstanding — Phase 2">
								Write Off Outstanding Payment?
							</PlaceholderLink>
						</div>
					</div>
				)}
			</section>

			<section className="rounded-md border bg-white p-4 shadow-sm">
				<div className="flex items-center gap-1.5">
					<PlaceholderIcon tooltip="Edit remarks — Phase 2">
						<Pencil className="size-3.5" />
					</PlaceholderIcon>
					<h3 className="font-semibold text-sky-700 text-sm">Remarks:</h3>
				</div>
				{order.remarks ? (
					<p className="mt-2 whitespace-pre-line text-muted-foreground text-xs">
						{order.remarks}
					</p>
				) : (
					<p className="mt-2 text-muted-foreground text-xs italic">
						No remarks.
					</p>
				)}
			</section>
		</aside>
	);
}

function PaymentHistoryRow({
	payment,
	isLast,
}: {
	payment: PaymentWithProcessedBy;
	isLast: boolean;
}) {
	const methodName =
		payment.method?.name ??
		payment.payment_mode
			.split("_")
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(" ");

	return (
		<div className="text-sm">
			<div className="flex items-start justify-between gap-2">
				<div>
					<div className="font-semibold text-sky-700">{payment.invoice_no}</div>
					<p className="text-[11px] text-muted-foreground">
						{formatPaymentDate(payment.paid_at)}
					</p>
				</div>
				<div className="text-right">
					<div className="font-semibold tabular-nums">
						MYR {money(payment.amount)}
					</div>
					<PlaceholderLink
						tooltip={`${methodName} — details coming in Phase 2`}
					>
						{methodName}
					</PlaceholderLink>
				</div>
			</div>
			{payment.bank && (
				<p className="mt-1 text-[11px] text-muted-foreground">
					Bank: {payment.bank}
				</p>
			)}
			{payment.reference_no && (
				<p className="text-[11px] text-muted-foreground">
					Reference Number: {payment.reference_no}
				</p>
			)}
			{isLast && (
				<div className="mt-1">
					<PlaceholderLink tooltip="Revert last invoice — Phase 2">
						(Revert Last Invoice)
					</PlaceholderLink>
				</div>
			)}
		</div>
	);
}

function DetailRow({
	label,
	value,
}: {
	label: React.ReactNode;
	value: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between text-sm">
			<dt className="text-foreground">{label}</dt>
			<dd className="tabular-nums">{value}</dd>
		</div>
	);
}

function PlaceholderPill({
	children,
	tooltip,
}: {
	children: React.ReactNode;
	tooltip: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-disabled
					onClick={(e) => e.preventDefault()}
					className="inline-flex h-8 cursor-not-allowed items-center rounded-full border bg-background px-3 font-medium text-[11px] text-muted-foreground opacity-70"
				>
					{children}
				</button>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}

function PlaceholderLink({
	children,
	tooltip,
	className,
}: {
	children: React.ReactNode;
	tooltip: string;
	className?: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-disabled
					onClick={(e) => e.preventDefault()}
					className={cn(
						"cursor-not-allowed text-[11px] text-sky-600 underline decoration-dotted underline-offset-2 opacity-80",
						className,
					)}
				>
					{children}
				</button>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}

function PlaceholderIcon({
	children,
	tooltip,
}: {
	children: React.ReactNode;
	tooltip: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span
					aria-disabled
					className="inline-flex cursor-not-allowed text-sky-600 opacity-70"
				>
					{children}
				</span>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
