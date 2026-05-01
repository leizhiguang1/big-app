"use client";

import { Ban, CreditCard, Loader2, Pencil, Receipt, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { redistribute } from "@/components/appointments/detail/collect-payment/helpers";
import type { Allocation } from "@/components/appointments/detail/collect-payment/types";
import { EmployeePicker } from "@/components/employees/EmployeePicker";
import { ChangePaymentMethodDialog } from "@/components/sales/ChangePaymentMethodDialog";
import { CustomerIdentityCard } from "@/components/customers/CustomerIdentityCard";
import { IssueRefundDialog } from "@/components/sales/IssueRefundDialog";
import { PayOutstandingDialog } from "@/components/sales/PayOutstandingDialog";
import { VoidSalesOrderDialog } from "@/components/sales/VoidSalesOrderDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PercentInput } from "@/components/ui/numeric-input";
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
	replaceSaleItemIncentivesAction,
	type SalesOrderDetailResult,
} from "@/lib/actions/sales";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type {
	PaymentWithProcessedBy,
	RefundNoteWithRefs,
	SaleItem,
	SaleItemIncentiveRow,
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
			refundNotes: RefundNoteWithRefs[];
			incentives: SaleItemIncentiveRow[];
			employees: EmployeeWithRelations[];
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
	const [voidOpen, setVoidOpen] = useState(false);
	const [refundOpen, setRefundOpen] = useState(false);
	const [recordPayOpen, setRecordPayOpen] = useState(false);
	const [changeMethodPayment, setChangeMethodPayment] =
		useState<PaymentWithProcessedBy | null>(null);
	const [editAllocMode, setEditAllocMode] = useState(false);
	const [editSlots, setEditSlots] = useState<Map<string, Allocation[]>>(
		() => new Map(),
	);
	const [isSavingAlloc, startSaveAlloc] = useTransition();
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	const reload = () => {
		setReloadKey((k) => k + 1);
		router.refresh();
	};

	const buildEditSlotsFromIncentives = (
		items: SaleItem[],
		incentives: SaleItemIncentiveRow[],
		fallbackEmployeeId: string | null,
	): Map<string, Allocation[]> => {
		const map = new Map<string, Allocation[]>();
		for (const item of items) {
			const lineIncentives = incentives.filter(
				(i) => i.sale_item_id === item.id,
			);
			const slots: Allocation[] = [];
			for (let i = 0; i < 3; i++) {
				const inc = lineIncentives[i];
				slots.push({
					employeeId: inc?.employee_id ?? "",
					percent: inc ? Number(inc.percent) : 0,
				});
			}
			if (lineIncentives.length === 0 && fallbackEmployeeId) {
				slots[0] = { employeeId: fallbackEmployeeId, percent: 100 };
			}
			map.set(item.id, slots);
		}
		return map;
	};

	const setLineEmployee = (
		lineId: string,
		idx: number,
		empId: string | null,
	) => {
		setEditSlots((prev) => {
			const cur = prev.get(lineId) ?? [
				{ employeeId: "", percent: 0 },
				{ employeeId: "", percent: 0 },
				{ employeeId: "", percent: 0 },
			];
			const next = redistribute(
				cur.map((a, i) =>
					i === idx ? { ...a, employeeId: empId ?? "" } : a,
				),
			);
			return new Map(prev).set(lineId, next);
		});
	};

	const setLinePercent = (lineId: string, idx: number, pct: number) => {
		setEditSlots((prev) => {
			const cur = prev.get(lineId);
			if (!cur) return prev;
			const next = cur.map((a, i) => (i === idx ? { ...a, percent: pct } : a));
			return new Map(prev).set(lineId, next);
		});
	};

	const applyLineToAll = (fromLineId: string) => {
		setEditSlots((prev) => {
			const source = prev.get(fromLineId);
			if (!source) return prev;
			const next = new Map(prev);
			for (const key of next.keys()) {
				next.set(
					key,
					source.map((a) => ({ ...a })),
				);
			}
			return next;
		});
	};

	const balanceLine = (lineId: string) => {
		setEditSlots((prev) => {
			const cur = prev.get(lineId);
			if (!cur) return prev;
			const filledIdx = cur.findIndex((a) => a.employeeId);
			if (filledIdx === -1) return prev;
			const sum = cur
				.filter((a) => a.employeeId)
				.reduce((s, a) => s + (a.percent || 0), 0);
			const delta = 100 - sum;
			const next = cur.map((a, i) =>
				i === filledIdx
					? {
							...a,
							percent: Math.max(
								0,
								Math.min(100, (a.percent || 0) + delta),
							),
						}
					: a,
			);
			return new Map(prev).set(lineId, next);
		});
	};

	useEffect(() => {
		if (!open || !salesOrderId) {
			setState({ status: "idle" });
			setFeedback(null);
			setEditAllocMode(false);
			setEditSlots(new Map());
			return;
		}
		let cancelled = false;
		setState((prev) =>
			prev.status === "ready" ? prev : { status: "loading" },
		);
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
					refundNotes: res.refundNotes,
					incentives: res.incentives,
					employees: res.employees,
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
	}, [open, salesOrderId, reloadKey]);

	const order = state.status === "ready" ? state.order : null;
	const isCancellable =
		order !== null &&
		(order.status === "completed" || order.status === "draft");
	const canRefund = order !== null && order.status === "completed";
	const isCancelled = order?.status === "cancelled";
	const appointmentRef = order?.appointment?.booking_ref ?? null;
	const outstanding = Number(order?.outstanding ?? 0);
	const canRecordPayment = order !== null && !isCancelled && outstanding > 0.005;

	const startEditAlloc = () => {
		if (state.status !== "ready") return;
		setEditSlots(
			buildEditSlotsFromIncentives(
				state.items,
				state.incentives,
				state.order.consultant?.id ?? null,
			),
		);
		setFeedback(null);
		setEditAllocMode(true);
	};

	const cancelEditAlloc = () => {
		setEditAllocMode(false);
		setEditSlots(new Map());
	};

	const saveEditAlloc = () => {
		if (state.status !== "ready" || !salesOrderId) return;
		for (const [lineId, slots] of editSlots.entries()) {
			const filled = slots.filter((a) => a.employeeId);
			if (filled.length === 0) continue;
			const sum = filled.reduce((s, a) => s + (a.percent || 0), 0);
			if (Math.abs(sum - 100) > 0.01) {
				const item = state.items.find((it) => it.id === lineId);
				setFeedback({
					type: "error",
					message: `${item?.item_name ?? "An item"} allocation must sum to 100%`,
				});
				return;
			}
		}
		startSaveAlloc(async () => {
			try {
				await Promise.all(
					Array.from(editSlots.entries()).map(([lineId, slots]) => {
						const filled = slots.filter((a) => a.employeeId);
						return replaceSaleItemIncentivesAction(
							salesOrderId,
							{
								sale_item_id: lineId,
								employees: filled.map((a) => ({
									employee_id: a.employeeId,
									percent: a.percent,
								})),
							},
							appointmentRef,
						);
					}),
				);
				setFeedback({ type: "success", message: "Allocation updated" });
				setEditAllocMode(false);
				setEditSlots(new Map());
				reload();
			} catch (err) {
				setFeedback({
					type: "error",
					message:
						err instanceof Error ? err.message : "Failed to save allocation",
				});
			}
		});
	};

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
					{order !== null && (
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-white px-4 py-2.5 sm:px-6">
							<span className="font-mono font-semibold text-base">
								{order.so_number}
							</span>
							{order.outlet && (
								<span className="text-muted-foreground text-xs">
									<span className="font-mono font-medium uppercase">
										{order.outlet.code}
									</span>{" "}
									· {order.outlet.name}
								</span>
							)}
						</div>
					)}
					{order?.status === "cancelled" && (
						<div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-red-800 text-sm sm:px-6">
							<Ban className="size-4 shrink-0" />
							<span className="font-semibold uppercase tracking-wide">
								Voided
							</span>
							<span className="text-red-700/80">
								· This sales order has been cancelled.
							</span>
						</div>
					)}
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
								<LeftPanel
									order={state.order}
									items={state.items}
									incentives={state.incentives}
									employees={state.employees}
									isCancelled={isCancelled}
									editAllocMode={editAllocMode}
									editSlots={editSlots}
									isSavingAlloc={isSavingAlloc}
									onStartEditAlloc={startEditAlloc}
									onCancelEditAlloc={cancelEditAlloc}
									onSaveEditAlloc={saveEditAlloc}
									onLineEmployeeChange={setLineEmployee}
									onLinePercentChange={setLinePercent}
									onLineBalance={balanceLine}
									onLineApplyToAll={applyLineToAll}
									canApplyToAll={state.items.length > 1}
								/>
								<RightPanel
									order={state.order}
									payments={state.payments}
									refundNotes={state.refundNotes}
									isCancelled={isCancelled}
									onChangeMethod={setChangeMethodPayment}
									onPayNow={() => {
										setFeedback(null);
										setRecordPayOpen(true);
									}}
								/>
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
							<div className="flex items-center gap-2 self-end sm:self-auto">
								{canRecordPayment && (
									<Button
										size="sm"
										className="bg-green-600 text-white hover:bg-green-700"
										onClick={() => {
											setFeedback(null);
											setRecordPayOpen(true);
										}}
									>
										<CreditCard className="mr-2 size-4" />
										Pay Now
									</Button>
								)}
								{canRefund && (
									<Button
										variant="outline"
										size="sm"
										className="text-amber-700 hover:bg-amber-50 hover:text-amber-800"
										onClick={() => {
											setFeedback(null);
											setRefundOpen(true);
										}}
									>
										<Undo2 className="mr-2 size-4" />
										Refund
									</Button>
								)}
								{canRefund && (
									<Button
										variant="outline"
										size="sm"
										disabled
										className="relative text-purple-700"
										title="Credit Note — in development (pending Cash Wallet)"
									>
										<Receipt className="mr-2 size-4" />
										Credit Note
										<span
											aria-hidden
											className="absolute -right-1 -top-1 size-1.5 rounded-full bg-amber-500 ring-1 ring-background"
										/>
									</Button>
								)}
								{isCancellable && (
									<Button
										variant="outline"
										size="sm"
										className="text-red-600 hover:bg-red-50 hover:text-red-700"
										onClick={() => {
											setFeedback(null);
											setVoidOpen(true);
										}}
									>
										<Ban className="mr-2 size-4" />
										Void
									</Button>
								)}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{state.status === "ready" && (
				<>
					<VoidSalesOrderDialog
						open={voidOpen}
						onOpenChange={setVoidOpen}
						salesOrderId={state.order.id}
						soNumber={state.order.so_number}
						outletName={state.order.outlet?.name ?? null}
						orderTotal={Number(state.order.total ?? 0)}
						items={state.items}
						onSuccess={({ cnNumber, rnNumber, refundAmount }) => {
							setFeedback({
								type: "success",
								message: `Voided. CN ${cnNumber} · RN ${rnNumber} · Refund MYR ${refundAmount.toFixed(2)}`,
							});
							setReloadKey((k) => k + 1);
							router.refresh();
						}}
						onError={(msg) => setFeedback({ type: "error", message: msg })}
					/>
					<IssueRefundDialog
						open={refundOpen}
						onOpenChange={setRefundOpen}
						salesOrderId={state.order.id}
						soNumber={state.order.so_number}
						orderTotal={Number(state.order.total ?? 0)}
						onSuccess={({ rnNumber, amount }) => {
							setFeedback({
								type: "success",
								message: `Refund issued · ${rnNumber} · MYR ${amount.toFixed(2)}`,
							});
							setReloadKey((k) => k + 1);
							router.refresh();
						}}
						onError={(msg) => setFeedback({ type: "error", message: msg })}
					/>
					<ChangePaymentMethodDialog
						open={changeMethodPayment != null}
						onOpenChange={(v) => {
							if (!v) setChangeMethodPayment(null);
						}}
						salesOrderId={state.order.id}
						appointmentRef={appointmentRef}
						payment={changeMethodPayment}
						onSuccess={(msg) => {
							setFeedback({ type: "success", message: msg });
							reload();
						}}
						onError={(msg) => setFeedback({ type: "error", message: msg })}
					/>
					<PayOutstandingDialog
						open={recordPayOpen}
						onOpenChange={setRecordPayOpen}
						salesOrderId={state.order.id}
						soNumber={state.order.so_number}
						outstanding={outstanding}
						total={Number(state.order.total ?? 0)}
						amountPaid={Number(state.order.amount_paid ?? 0)}
						items={state.items}
						existingPayments={state.payments}
						incentives={state.incentives}
						outletName={state.order.outlet?.name ?? null}
						appointmentRef={appointmentRef}
						onSuccess={(msg) => {
							setFeedback({ type: "success", message: msg });
							reload();
						}}
						onError={(msg) => setFeedback({ type: "error", message: msg })}
					/>
				</>
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
	incentives,
	employees,
	isCancelled,
	editAllocMode,
	editSlots,
	isSavingAlloc,
	onStartEditAlloc,
	onCancelEditAlloc,
	onSaveEditAlloc,
	onLineEmployeeChange,
	onLinePercentChange,
	onLineBalance,
	onLineApplyToAll,
	canApplyToAll,
}: {
	order: SalesOrderWithRelations;
	items: SaleItem[];
	incentives: SaleItemIncentiveRow[];
	employees: EmployeeWithRelations[];
	isCancelled: boolean;
	editAllocMode: boolean;
	editSlots: Map<string, Allocation[]>;
	isSavingAlloc: boolean;
	onStartEditAlloc: () => void;
	onCancelEditAlloc: () => void;
	onSaveEditAlloc: () => void;
	onLineEmployeeChange: (
		lineId: string,
		idx: number,
		empId: string | null,
	) => void;
	onLinePercentChange: (lineId: string, idx: number, pct: number) => void;
	onLineBalance: (lineId: string) => void;
	onLineApplyToAll: (lineId: string) => void;
	canApplyToAll: boolean;
}) {
	const incentivesByLine = new Map<string, SaleItemIncentiveRow[]>();
	for (const i of incentives) {
		const arr = incentivesByLine.get(i.sale_item_id) ?? [];
		arr.push(i);
		incentivesByLine.set(i.sale_item_id, arr);
	}
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
					<CustomerIdentityCard
						customer={order.customer}
						size="sm"
						showFlags
						fallbackLabel="Walk-in"
					/>
					<div className="flex flex-wrap gap-2">
						{editAllocMode ? (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={onCancelEditAlloc}
									disabled={isSavingAlloc}
								>
									Cancel
								</Button>
								<Button
									size="sm"
									onClick={onSaveEditAlloc}
									disabled={isSavingAlloc}
								>
									{isSavingAlloc && (
										<Loader2 className="mr-2 size-3.5 animate-spin" />
									)}
									Save changes
								</Button>
							</>
						) : isCancelled ? (
							<PlaceholderPill tooltip="Cancelled orders can't be edited">
								Edit Allocation
							</PlaceholderPill>
						) : (
							<Button
								variant="outline"
								size="sm"
								onClick={onStartEditAlloc}
							>
								<Pencil className="mr-2 size-3.5" />
								Edit Allocation
							</Button>
						)}
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
								lineIncentives={incentivesByLine.get(item.id) ?? []}
								employees={employees}
								editAllocMode={editAllocMode}
								editSlots={editSlots.get(item.id) ?? null}
								onLineEmployeeChange={onLineEmployeeChange}
								onLinePercentChange={onLinePercentChange}
								onLineBalance={onLineBalance}
								onLineApplyToAll={onLineApplyToAll}
								canApplyToAll={canApplyToAll}
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
	lineIncentives,
	employees,
	editAllocMode,
	editSlots,
	onLineEmployeeChange,
	onLinePercentChange,
	onLineBalance,
	onLineApplyToAll,
	canApplyToAll,
}: {
	item: SaleItem;
	itemPaid: number;
	lineIncentives: SaleItemIncentiveRow[];
	employees: EmployeeWithRelations[];
	editAllocMode: boolean;
	editSlots: Allocation[] | null;
	onLineEmployeeChange: (
		lineId: string,
		idx: number,
		empId: string | null,
	) => void;
	onLinePercentChange: (lineId: string, idx: number, pct: number) => void;
	onLineBalance: (lineId: string) => void;
	onLineApplyToAll: (lineId: string) => void;
	canApplyToAll: boolean;
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

			<div className="mt-3 text-[11px]">
				<span className="text-sky-600">Allocation:</span>
				{editAllocMode && editSlots ? (
					<LineAllocEditor
						slots={editSlots}
						employees={employees}
						onEmployee={(idx, id) =>
							onLineEmployeeChange(item.id, idx, id)
						}
						onPercent={(idx, pct) =>
							onLinePercentChange(item.id, idx, pct)
						}
						onBalance={() => onLineBalance(item.id)}
						onApplyToAll={
							canApplyToAll ? () => onLineApplyToAll(item.id) : null
						}
					/>
				) : (
					<span className="ml-2 inline-flex items-center gap-1.5 rounded-full border bg-white px-2 py-0.5">
						{lineIncentives.length === 0 ? (
							<span className="text-muted-foreground italic">
								No allocation
							</span>
						) : (
							<span>
								{lineIncentives
									.map((i) => {
										const name = i.employee
											? fullName(i.employee.first_name, i.employee.last_name)
											: "—";
										return `${name} (${Number(i.percent).toFixed(0)}%)`;
									})
									.join(", ")}
							</span>
						)}
					</span>
				)}
			</div>
		</div>
	);
}

function LineAllocEditor({
	slots,
	employees,
	onEmployee,
	onPercent,
	onBalance,
	onApplyToAll,
}: {
	slots: Allocation[];
	employees: EmployeeWithRelations[];
	onEmployee: (idx: number, empId: string | null) => void;
	onPercent: (idx: number, pct: number) => void;
	onBalance: () => void;
	onApplyToAll: (() => void) | null;
}) {
	const filled = slots.filter((a) => a.employeeId);
	const sum = filled.reduce((s, a) => s + (a.percent || 0), 0);
	const invalid = filled.length > 0 && Math.abs(sum - 100) > 0.01;
	return (
		<div className="mt-1 flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/20 p-2">
			{slots.map((slot, si) => (
				<div key={si} className="flex items-center gap-1">
					<EmployeePicker
						employees={employees}
						value={slot.employeeId || null}
						onChange={(id) => onEmployee(si, id)}
						size="sm"
						placeholder={`Employee ${si + 1}`}
					/>
					{slot.employeeId && (
						<>
							<PercentInput
								value={slot.percent}
								onChange={(n) => onPercent(si, n)}
								className="h-6 w-14 px-1 text-center text-[11px] tabular-nums"
								aria-label="Employee percent"
							/>
							<span className="text-[10px] text-muted-foreground">%</span>
						</>
					)}
				</div>
			))}
			{filled.length > 0 && (
				<span className="inline-flex items-center gap-1.5 text-[10px] tabular-nums text-muted-foreground">
					<span className={cn(invalid && "text-red-600 font-medium")}>
						{sum.toFixed(0)}%
					</span>
					{invalid && (
						<button
							type="button"
							onClick={onBalance}
							className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-amber-900 hover:bg-amber-50"
						>
							Balance
						</button>
					)}
				</span>
			)}
			{onApplyToAll && filled.length > 0 && !invalid && (
				<button
					type="button"
					onClick={onApplyToAll}
					className="rounded border border-blue-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-50"
				>
					Apply to all items
				</button>
			)}
		</div>
	);
}

function RightPanel({
	order,
	payments,
	refundNotes,
	isCancelled,
	onChangeMethod,
	onPayNow,
}: {
	order: SalesOrderWithRelations;
	payments: PaymentWithProcessedBy[];
	refundNotes: RefundNoteWithRefs[];
	isCancelled: boolean;
	onChangeMethod: (payment: PaymentWithProcessedBy) => void;
	onPayNow: () => void;
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
							isCancelled={isCancelled}
							onChangeMethod={onChangeMethod}
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
						<div className="mt-2">
							<button
								type="button"
								onClick={onPayNow}
								className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
							>
								<CreditCard className="size-3.5" />
								Pay Now
							</button>
						</div>
					</div>
				)}

				{refundNotes.length > 0 && (
					<div className="mt-5 border-t pt-3">
						<h4 className="font-semibold text-amber-700 text-sm">
							Refunds ({refundNotes.length}):
						</h4>
						<div className="mt-2 space-y-3">
							{refundNotes.map((r) => (
								<div key={r.id} className="text-sm">
									<div className="flex items-start justify-between gap-2">
										<div>
											<div className="flex items-center gap-1.5">
												<span className="font-semibold text-amber-700">
													{r.rn_number}
												</span>
												{r.cancellation_id === null && (
													<Badge variant="secondary" className="text-[9px]">
														Standalone
													</Badge>
												)}
											</div>
											<p className="text-[11px] text-muted-foreground">
												{formatPaymentDate(r.refunded_at)}
												{r.refund_method && ` · ${r.refund_method}`}
											</p>
											{r.notes && (
												<p className="mt-0.5 text-[11px] text-muted-foreground">
													{r.notes}
												</p>
											)}
										</div>
										<span className="font-medium text-amber-700 tabular-nums">
											-MYR {money(r.amount)}
										</span>
									</div>
								</div>
							))}
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
	isCancelled,
	onChangeMethod,
}: {
	payment: PaymentWithProcessedBy;
	isLast: boolean;
	isCancelled: boolean;
	onChangeMethod: (payment: PaymentWithProcessedBy) => void;
}) {
	const methodName =
		payment.method?.name ??
		payment.payment_mode
			.split("_")
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(" ");
	const isWallet = payment.payment_mode === "wallet";
	const canEditMethod = !isCancelled && !isWallet;

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
					{canEditMethod ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => onChangeMethod(payment)}
									className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline"
								>
									{methodName}
									<Pencil className="size-3" />
								</button>
							</TooltipTrigger>
							<TooltipContent>Change payment method</TooltipContent>
						</Tooltip>
					) : (
						<span className="text-[11px] text-muted-foreground">
							{methodName}
						</span>
					)}
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
