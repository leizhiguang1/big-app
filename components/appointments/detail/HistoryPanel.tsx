"use client";

import {
	BellRing,
	ChevronDown,
	ChevronUp,
	ExternalLink,
	Layers,
	Maximize2,
	MessageSquare,
	Minimize2,
	Pencil,
	Phone,
	Pin,
	PinOff,
	Receipt,
	RotateCcw,
	StickyNote,
	Trash2,
	XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	cancelBillingForAppointmentAction,
	revertBillingForAppointmentAction,
} from "@/lib/actions/appointments";
import {
	cancelCaseNoteAction,
	revertCaseNoteAction,
	setCaseNotePinAction,
} from "@/lib/actions/case-notes";
import {
	deleteFollowUpAction,
	setFollowUpPinAction,
} from "@/lib/actions/follow-ups";
import {
	APPOINTMENT_PAYMENT_MODE_LABEL,
	type AppointmentPaymentMode,
} from "@/lib/constants/appointment-status";
import type { CustomerLineItem } from "@/lib/services/appointment-line-items";
import type { CustomerAppointmentSummary } from "@/lib/services/appointments";
import type { CaseNoteWithContext } from "@/lib/services/case-notes";
import type { FollowUpWithRefs } from "@/lib/services/follow-ups";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Shared tiny tooltip-wrapped icon button                           */
/* ------------------------------------------------------------------ */

function IconBtn({
	label,
	onClick,
	className,
	disabled,
	children,
}: {
	label: string;
	onClick: () => void;
	className: string;
	disabled?: boolean;
	children: React.ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					disabled={disabled}
					aria-label={label}
					className={cn(
						"flex size-[22px] items-center justify-center rounded-full transition disabled:opacity-50",
						className,
					)}
				>
					{children}
				</button>
			</TooltipTrigger>
			<TooltipContent side="top">{label}</TooltipContent>
		</Tooltip>
	);
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type HistoryMode = "all" | "casenotes" | "billing";

type BillingThread = {
	kind: "billing";
	id: string;
	date: Date;
	appointmentId: string;
	bookingRef: string;
	paymentStatus: string;
	paidVia: string | null;
	servedBy: string | null;
	items: CustomerLineItem[];
	total: number;
	isCurrent: boolean;
	isCancelled: boolean;
};

type NoteThread = {
	kind: "note";
	id: string;
	date: Date;
	note: CaseNoteWithContext;
	bookingRef: string | null;
	appointmentId: string | null;
	isCurrent: boolean;
	isPinned: boolean;
	isCancelled: boolean;
};

type Thread = BillingThread | NoteThread;

type Props = {
	currentAppointmentId: string;
	caseNotes: CaseNoteWithContext[];
	customerBillingHistory: CustomerLineItem[];
	customerHistory: CustomerAppointmentSummary[];
	onToast: (message: string, variant?: Toast["variant"]) => void;
	onEditNote?: (noteId: string, content: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatDayMonthYear(d: Date) {
	return d.toLocaleDateString(undefined, {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatWeekdayTime(d: Date) {
	return `${d.toLocaleDateString(undefined, { weekday: "short" })} · ${d.toLocaleTimeString(
		undefined,
		{ hour: "numeric", minute: "2-digit", hour12: true },
	)}`;
}

function authorLabel(n: CaseNoteWithContext): string {
	if (!n.employee) return "—";
	return `${n.employee.first_name} ${n.employee.last_name}`.trim();
}

function buildThreads(
	caseNotes: CaseNoteWithContext[],
	billing: CustomerLineItem[],
	customerHistory: CustomerAppointmentSummary[],
	currentAppointmentId: string,
	pinnedBillingIds: Set<string>,
): { threads: Thread[]; noteCount: number; billingCount: number } {
	const refByAppointment = new Map<string, string>();
	for (const a of customerHistory) refByAppointment.set(a.id, a.booking_ref);

	const byAppointment = new Map<
		string,
		{
			bookingRef: string;
			date: Date;
			paymentStatus: string;
			paidVia: string | null;
			servedBy: string | null;
			items: CustomerLineItem[];
			total: number;
			allCancelled: boolean;
		}
	>();
	for (const b of billing) {
		if (!b.appointment) continue;
		const aptId = b.appointment.id;
		const total = Number(b.total ?? b.quantity * b.unit_price);
		const existing = byAppointment.get(aptId);
		if (existing) {
			existing.items.push(b);
			existing.total += total;
			if (!b.is_cancelled) existing.allCancelled = false;
		} else {
			const emp = b.appointment.employee;
			byAppointment.set(aptId, {
				bookingRef: b.appointment.booking_ref,
				date: new Date(b.appointment.start_at),
				paymentStatus: b.appointment.payment_status,
				paidVia: b.appointment.paid_via,
				servedBy: emp ? `${emp.first_name} ${emp.last_name}`.trim() : null,
				items: [b],
				total,
				allCancelled: b.is_cancelled,
			});
		}
	}

	const threads: Thread[] = [];
	for (const [appointmentId, g] of byAppointment) {
		threads.push({
			kind: "billing",
			id: `b-${appointmentId}`,
			date: g.date,
			appointmentId,
			bookingRef: g.bookingRef,
			paymentStatus: g.paymentStatus,
			paidVia: g.paidVia,
			servedBy: g.servedBy,
			items: g.items,
			total: g.total,
			isCurrent: appointmentId === currentAppointmentId,
			isCancelled: g.allCancelled,
		});
	}

	for (const n of caseNotes) {
		threads.push({
			kind: "note",
			id: `n-${n.id}`,
			date: new Date(n.created_at),
			note: n,
			appointmentId: n.appointment_id ?? null,
			bookingRef: n.appointment_id
				? (refByAppointment.get(n.appointment_id) ?? null)
				: null,
			isCurrent: n.appointment_id === currentAppointmentId,
			isPinned: n.is_pinned,
			isCancelled: n.is_cancelled,
		});
	}

	threads.sort((a, b) => {
		const aPinned =
			(a.kind === "note" && a.isPinned) ||
			(a.kind === "billing" && pinnedBillingIds.has(a.id))
				? 1
				: 0;
		const bPinned =
			(b.kind === "note" && b.isPinned) ||
			(b.kind === "billing" && pinnedBillingIds.has(b.id))
				? 1
				: 0;
		if (aPinned !== bPinned) return bPinned - aPinned;
		return b.date.getTime() - a.date.getTime();
	});
	return {
		threads,
		noteCount: caseNotes.length,
		billingCount: byAppointment.size,
	};
}

/* ------------------------------------------------------------------ */
/*  HistoryPanel (case notes + billing)                               */
/* ------------------------------------------------------------------ */

export function HistoryPanel({
	currentAppointmentId,
	caseNotes,
	customerBillingHistory,
	customerHistory,
	onToast,
	onEditNote,
}: Props) {
	const router = useRouter();
	const [mode, setMode] = useState<HistoryMode>("all");
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
	const [pinnedBillingIds, setPinnedBillingIds] = useState<Set<string>>(
		new Set(),
	);
	const [pending, startTransition] = useTransition();

	const toggleBillingPin = (id: string) =>
		setPinnedBillingIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const { threads, noteCount, billingCount } = useMemo(
		() =>
			buildThreads(
				caseNotes,
				customerBillingHistory,
				customerHistory,
				currentAppointmentId,
				pinnedBillingIds,
			),
		[
			caseNotes,
			customerBillingHistory,
			customerHistory,
			currentAppointmentId,
			pinnedBillingIds,
		],
	);

	const visible = useMemo(() => {
		return threads.filter((t) => {
			if (mode === "casenotes") return t.kind === "note";
			if (mode === "billing") return t.kind === "billing";
			return true;
		});
	}, [threads, mode]);

	const allCollapsed =
		visible.length > 0 && visible.every((t) => collapsedIds.has(t.id));

	const toggleCollapse = (id: string) =>
		setCollapsedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const cycleMode = () =>
		setMode((m) =>
			m === "all" ? "casenotes" : m === "casenotes" ? "billing" : "all",
		);

	const toggleAll = () => {
		if (allCollapsed) setCollapsedIds(new Set());
		else setCollapsedIds(new Set(visible.map((v) => v.id)));
	};

	const handleToggleNotePin = (noteId: string, currentPinned: boolean) => {
		startTransition(async () => {
			try {
				await setCaseNotePinAction(
					currentAppointmentId,
					noteId,
					!currentPinned,
				);
				onToast(currentPinned ? "Unpinned" : "Pinned to top", "success");
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not update pin",
					"error",
				);
			}
		});
	};

	const handleCancelNote = (noteId: string) => {
		startTransition(async () => {
			try {
				await cancelCaseNoteAction(currentAppointmentId, noteId);
				onToast("Note cancelled", "success");
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not cancel note",
					"error",
				);
			}
		});
	};

	const handleRevertNote = (noteId: string) => {
		startTransition(async () => {
			try {
				await revertCaseNoteAction(currentAppointmentId, noteId);
				onToast("Note restored", "success");
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not restore note",
					"error",
				);
			}
		});
	};

	const handleCancelBilling = (targetAppointmentId: string) => {
		startTransition(async () => {
			try {
				await cancelBillingForAppointmentAction(
					currentAppointmentId,
					targetAppointmentId,
				);
				onToast("Billing cancelled", "success");
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not cancel billing",
					"error",
				);
			}
		});
	};

	const handleRevertBilling = (targetAppointmentId: string) => {
		startTransition(async () => {
			try {
				await revertBillingForAppointmentAction(
					currentAppointmentId,
					targetAppointmentId,
				);
				onToast("Billing restored", "success");
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not restore billing",
					"error",
				);
			}
		});
	};

	return (
		<div className="flex h-full w-full flex-col overflow-hidden rounded-md border bg-card">
			<div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
				<div className="font-bold text-[12px] text-foreground tracking-wide">
					HISTORY
				</div>
				<div className="ml-auto flex items-center gap-1">
					<button
						type="button"
						aria-label="Cycle timeline filter"
						onClick={cycleMode}
						disabled={threads.length === 0}
						title={
							mode === "all"
								? `All · ${noteCount} notes, ${billingCount} billing`
								: mode === "casenotes"
									? `Case notes only · ${noteCount}`
									: `Billing only · ${billingCount}`
						}
						className={cn(
							"flex h-7 items-center gap-1 rounded border px-1.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
							mode === "casenotes" &&
								"border-amber-300 bg-amber-50 text-amber-700",
							mode === "billing" &&
								"border-emerald-300 bg-emerald-50 text-emerald-700",
							mode === "all" &&
								"border-border bg-muted/40 text-muted-foreground",
						)}
					>
						{mode === "all" ? (
							<>
								<Layers className="size-[14px]" />
								<span className="tabular-nums">{noteCount + billingCount}</span>
							</>
						) : mode === "casenotes" ? (
							<>
								<StickyNote className="size-[14px]" />
								<span className="tabular-nums">{noteCount}</span>
							</>
						) : (
							<>
								<Receipt className="size-[14px]" />
								<span className="tabular-nums">{billingCount}</span>
							</>
						)}
					</button>
					<button
						type="button"
						aria-label={allCollapsed ? "Expand all" : "Collapse all"}
						title={allCollapsed ? "Expand all" : "Collapse all"}
						onClick={toggleAll}
						disabled={visible.length === 0}
						className="flex size-7 items-center justify-center rounded border border-border bg-muted/40 text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-40"
					>
						{allCollapsed ? (
							<Maximize2 className="size-[14px]" />
						) : (
							<Minimize2 className="size-[14px]" />
						)}
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{threads.length === 0 ? (
					<div className="p-5 text-center text-muted-foreground text-sm">
						No history
					</div>
				) : visible.length === 0 ? (
					<div className="p-5 text-center text-muted-foreground text-xs leading-relaxed">
						Nothing for this view.
						<div className="mt-2">
							Use the timeline icon to change the filter.
						</div>
					</div>
				) : (
					visible.map((t) =>
						t.kind === "billing" ? (
							<BillingRow
								key={t.id}
								item={t}
								collapsed={collapsedIds.has(t.id)}
								pinned={pinnedBillingIds.has(t.id)}
								onToggle={() => toggleCollapse(t.id)}
								onTogglePin={() => toggleBillingPin(t.id)}
								onCancel={() => handleCancelBilling(t.appointmentId)}
								onRevert={() => handleRevertBilling(t.appointmentId)}
								onJump={
									t.isCurrent
										? undefined
										: () => router.push(`/appointments/${t.appointmentId}`)
								}
							/>
						) : (
							<NoteRow
								key={t.id}
								item={t}
								collapsed={collapsedIds.has(t.id)}
								onToggle={() => toggleCollapse(t.id)}
								onTogglePin={() =>
									handleToggleNotePin(t.note.id, t.isPinned)
								}
								onEdit={
									onEditNote && !t.isCancelled
										? () => onEditNote(t.note.id, t.note.content)
										: undefined
								}
								onCancel={() => handleCancelNote(t.note.id)}
								onRevert={() => handleRevertNote(t.note.id)}
								onJump={
									t.appointmentId && !t.isCurrent
										? () =>
												router.push(`/appointments/${t.appointmentId ?? ""}`)
										: undefined
								}
							/>
						),
					)
				)}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  BillingRow                                                        */
/* ------------------------------------------------------------------ */

const PAYMENT_STATUS_STYLES: Record<string, string> = {
	paid: "bg-emerald-600 text-white",
	partial: "bg-amber-500 text-white",
	unpaid: "bg-slate-400 text-white",
};

function paymentModeLabel(mode: string | null): string | null {
	if (!mode) return null;
	return APPOINTMENT_PAYMENT_MODE_LABEL[mode as AppointmentPaymentMode] ?? mode;
}

function BillingRow({
	item,
	collapsed,
	pinned,
	onToggle,
	onTogglePin,
	onCancel,
	onRevert,
	onJump,
}: {
	item: BillingThread;
	collapsed: boolean;
	pinned: boolean;
	onToggle: () => void;
	onTogglePin: () => void;
	onCancel: () => void;
	onRevert: () => void;
	onJump?: () => void;
}) {
	const paymentStatusClass =
		PAYMENT_STATUS_STYLES[item.paymentStatus] ?? "bg-slate-400 text-white";
	const payMode = paymentModeLabel(item.paidVia);
	const cancelled = item.isCancelled;

	return (
		<div
			className={cn(
				"border-b border-border/60 bg-muted/10 px-2 py-2",
				item.isCurrent &&
					"border-l-[3px] border-l-emerald-600 bg-emerald-50/40",
				pinned && !cancelled && "bg-amber-50/50",
				cancelled && "opacity-60",
			)}
		>
			<div
				className={cn(
					"rounded-sm border border-dashed border-border bg-background px-3 py-2.5 font-mono text-[11px] text-foreground shadow-sm",
					cancelled && "bg-muted/30",
				)}
			>
				<div className="flex items-start gap-1.5">
					<button
						type="button"
						aria-expanded={!collapsed}
						aria-label={collapsed ? "Expand receipt" : "Collapse receipt"}
						onClick={onToggle}
						className="mt-px shrink-0 text-muted-foreground hover:text-foreground"
					>
						{collapsed ? (
							<ChevronDown className="size-[14px]" />
						) : (
							<ChevronUp className="size-[14px]" />
						)}
					</button>
					<div className="flex-1">
						<div className="flex items-center gap-1.5">
							<Receipt className="size-[12px] text-emerald-600" />
							<span
								className={cn(
									"font-bold text-[11px] uppercase tracking-wide",
									cancelled && "line-through",
								)}
							>
								Receipt
							</span>
							{pinned && <Pin className="size-[10px] text-amber-600" />}
							{cancelled && (
								<span className="rounded bg-slate-400 px-1.5 py-px font-bold text-[9px] text-white">
									CANCELLED
								</span>
							)}
							{item.isCurrent && !cancelled && (
								<span className="rounded bg-emerald-600 px-1.5 py-px font-bold text-[9px] text-white">
									CURRENT
								</span>
							)}
							<div className="ml-auto flex items-center gap-1">
								<IconBtn
									label={pinned ? "Unpin" : "Pin to top"}
									onClick={onTogglePin}
									className={
										pinned
											? "bg-amber-500 text-white hover:bg-amber-600"
											: "border border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100"
									}
								>
									{pinned ? (
										<PinOff className="size-[11px]" />
									) : (
										<Pin className="size-[11px]" />
									)}
								</IconBtn>
								{onJump && (
									<IconBtn
										label="Go to appointment"
										onClick={onJump}
										className="bg-emerald-500 text-white hover:bg-emerald-600"
									>
										<ExternalLink className="size-[11px]" />
									</IconBtn>
								)}
								{cancelled ? (
									<IconBtn
										label="Restore billing"
										onClick={onRevert}
																			className="bg-blue-500 text-white hover:bg-blue-600"
									>
										<RotateCcw className="size-[11px]" />
									</IconBtn>
								) : (
									<IconBtn
										label="Cancel billing"
										onClick={onCancel}
																			className="bg-rose-500 text-white hover:bg-rose-600"
									>
										<XCircle className="size-[11px]" />
									</IconBtn>
								)}
								{!cancelled && (
									<span
										className={cn(
											"rounded px-1.5 py-px font-bold text-[9px] uppercase tracking-wide",
											paymentStatusClass,
										)}
									>
										{item.paymentStatus}
									</span>
								)}
							</div>
						</div>
						<div className="mt-[2px] text-[10px] text-muted-foreground">
							{formatDayMonthYear(item.date)} · {formatWeekdayTime(item.date)}
						</div>
					</div>
				</div>

				<div className="mt-2 border-border/70 border-t border-dashed pt-2">
					<div className="flex items-baseline justify-between gap-2">
						<span className="text-[9px] text-muted-foreground uppercase tracking-wide">
							Booking Ref
						</span>
						<button
							type="button"
							onClick={onJump}
							disabled={!onJump}
							className="truncate text-right font-bold text-[11px] tabular-nums hover:underline disabled:cursor-default disabled:no-underline"
						>
							{item.bookingRef || "—"}
						</button>
					</div>
					{item.servedBy && (
						<div className="flex items-baseline justify-between gap-2">
							<span className="text-[9px] text-muted-foreground uppercase tracking-wide">
								Served By
							</span>
							<span className="truncate text-right text-[10px]">
								{item.servedBy}
							</span>
						</div>
					)}
				</div>

				{!collapsed && (
					<>
						<div className="mt-2 border-border/70 border-t border-dashed pt-1.5">
							<div className="flex gap-1 pb-1 font-semibold text-[9px] text-muted-foreground uppercase tracking-wide">
								<span className="flex-1">Description</span>
								<span className="w-[50px] text-right">Qty × Price</span>
								<span className="w-[48px] text-right">Amount</span>
							</div>
							<div className="space-y-1">
								{item.items.map((bi) => {
									const lineTotal = Number(
										bi.total ?? bi.quantity * bi.unit_price,
									);
									const qty = Number(bi.quantity);
									const price = Number(bi.unit_price);
									const itemCancelled = bi.is_cancelled;
									return (
										<div
											key={bi.id}
											className={cn(
												"flex gap-1 text-[10px]",
												itemCancelled && "line-through opacity-50",
											)}
										>
											<div className="flex-1 min-w-0">
												<div className="truncate">{bi.description}</div>
												{bi.service?.sku && (
													<div className="truncate text-[9px] text-muted-foreground">
														{bi.service.sku}
													</div>
												)}
											</div>
											<div className="w-[50px] shrink-0 text-right tabular-nums text-muted-foreground">
												{qty % 1 === 0 ? qty : qty.toFixed(2)} ×{" "}
												{price.toFixed(2)}
											</div>
											<div className="w-[48px] shrink-0 text-right tabular-nums font-semibold">
												{lineTotal.toFixed(2)}
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="mt-2 border-border/70 border-t border-dashed pt-1.5">
							<div className="flex justify-between text-[10px] text-muted-foreground">
								<span>Sub Total (MYR)</span>
								<span
									className={cn(
										"tabular-nums",
										cancelled && "line-through",
									)}
								>
									{item.total.toFixed(2)}
								</span>
							</div>
							<div
								className={cn(
									"mt-0.5 flex justify-between font-bold text-[11px]",
									cancelled && "line-through",
								)}
							>
								<span>TOTAL (MYR)</span>
								<span className="tabular-nums">{item.total.toFixed(2)}</span>
							</div>
						</div>

						{payMode && !cancelled && (
							<div className="mt-2 border-border/70 border-t border-dashed pt-1.5">
								<div className="flex justify-between text-[10px]">
									<span className="text-muted-foreground uppercase tracking-wide text-[9px]">
										Payment
									</span>
									<span className="font-semibold">{payMode}</span>
								</div>
							</div>
						)}
					</>
				)}

				{collapsed && (
					<div className="mt-2 flex justify-between border-border/70 border-t border-dashed pt-1.5 text-[10px]">
						<span className="text-muted-foreground">
							{item.items.length} line{item.items.length !== 1 ? "s" : ""}
							{payMode && !cancelled && ` · ${payMode}`}
						</span>
						<span
							className={cn(
								"font-bold tabular-nums",
								cancelled && "line-through",
							)}
						>
							RM {item.total.toFixed(2)}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  NoteRow                                                           */
/* ------------------------------------------------------------------ */

function NoteRow({
	item,
	collapsed,
	onToggle,
	onTogglePin,
	onEdit,
	onCancel,
	onRevert,
	onJump,
}: {
	item: NoteThread;
	collapsed: boolean;
	onToggle: () => void;
	onTogglePin: () => void;
	onEdit?: () => void;
	onCancel: () => void;
	onRevert: () => void;
	onJump?: () => void;
}) {
	const content = item.note.content ?? "";
	const pinned = item.isPinned;
	const cancelled = item.isCancelled;
	return (
		<div
			className={cn(
				"border-b border-border/60 px-3.5 py-2.5",
				item.isCurrent && "border-l-[3px] border-l-blue-600 bg-blue-50/50",
				pinned && !cancelled && "bg-amber-50/50",
				cancelled && "opacity-60",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div>
					<div className="flex items-center gap-1.5">
						<StickyNote className="size-[12px] text-blue-600" />
						<span
							className={cn(
								"font-bold text-[12px] text-foreground",
								cancelled && "line-through",
							)}
						>
							{formatDayMonthYear(item.date)}
						</span>
						{pinned && <Pin className="size-[10px] text-amber-600" />}
						{cancelled && (
							<span className="rounded bg-slate-400 px-1.5 py-px font-bold text-[9px] text-white">
								CANCELLED
							</span>
						)}
						{item.isCurrent && !cancelled && (
							<span className="rounded bg-blue-600 px-1.5 py-px font-bold text-[9px] text-white">
								CURRENT
							</span>
						)}
					</div>
					<div className="mt-0.5 text-[11px] text-muted-foreground">
						{formatWeekdayTime(item.date)}
					</div>
				</div>
				<div className="flex items-center gap-1">
					{cancelled ? (
						<IconBtn
							label="Restore note"
							onClick={onRevert}
													className="bg-blue-500 text-white hover:bg-blue-600"
						>
							<RotateCcw className="size-[11px]" />
						</IconBtn>
					) : (
						<>
							<IconBtn
								label={pinned ? "Unpin" : "Pin to top"}
								onClick={onTogglePin}
															className={
									pinned
										? "bg-amber-500 text-white hover:bg-amber-600"
										: "border border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100"
								}
							>
								{pinned ? (
									<PinOff className="size-[11px]" />
								) : (
									<Pin className="size-[11px]" />
								)}
							</IconBtn>
							{onJump && (
								<IconBtn
									label="Go to appointment"
									onClick={onJump}
									className="bg-blue-500 text-white hover:bg-blue-600"
								>
									<ExternalLink className="size-[11px]" />
								</IconBtn>
							)}
							{onEdit && (
								<IconBtn
									label="Edit"
									onClick={onEdit}
									className="bg-emerald-500 text-white hover:bg-emerald-600"
								>
									<Pencil className="size-[11px]" />
								</IconBtn>
							)}
							<IconBtn
								label="Cancel note"
								onClick={onCancel}
															className="bg-rose-500 text-white hover:bg-rose-600"
							>
								<XCircle className="size-[11px]" />
							</IconBtn>
						</>
					)}
				</div>
			</div>
			{item.bookingRef && (
				<button
					type="button"
					onClick={onJump}
					disabled={!onJump}
					className="mt-1 block text-left font-bold text-[10px] text-foreground tabular-nums hover:underline disabled:cursor-default disabled:no-underline"
				>
					{item.bookingRef}
				</button>
			)}
			<button
				type="button"
				aria-expanded={!collapsed}
				onClick={onToggle}
				className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
			>
				{collapsed ? (
					<ChevronDown className="size-[11px]" />
				) : (
					<ChevronUp className="size-[11px]" />
				)}
				<span>{collapsed ? "Show" : "Hide"} note</span>
			</button>
			{!collapsed && (
				<p
					className={cn(
						"mt-1 whitespace-pre-wrap wrap-break-word text-[11px] text-muted-foreground leading-snug",
						cancelled && "line-through",
					)}
				>
					{content === "" ? (
						<span className="text-muted-foreground/50">(empty note)</span>
					) : (
						content
					)}
				</p>
			)}
			<div className="mt-1.5 text-[9px] text-muted-foreground/80">
				Last updated by: {authorLabel(item.note)}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  FollowUpHistoryPanel                                              */
/* ------------------------------------------------------------------ */

type FollowUpThread = {
	id: string;
	date: Date;
	followUp: FollowUpWithRefs;
	bookingRef: string | null;
	appointmentId: string;
	isCurrent: boolean;
	isPinned: boolean;
};

function followUpAuthorLabel(f: FollowUpWithRefs): string {
	if (!f.author) return "—";
	return `${f.author.first_name} ${f.author.last_name}`.trim();
}

function reminderEmployeeLabel(f: FollowUpWithRefs): string | null {
	if (!f.reminder_employee) return null;
	return `${f.reminder_employee.first_name} ${f.reminder_employee.last_name}`.trim();
}

function formatReminderDate(iso: string): string {
	const [y, m, d] = iso.split("-").map(Number);
	if (!y || !m || !d) return iso;
	return new Date(y, m - 1, d).toLocaleDateString(undefined, {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

type FollowUpHistoryPanelProps = {
	currentAppointmentId: string;
	followUps: FollowUpWithRefs[];
	customerHistory: CustomerAppointmentSummary[];
	onToast: (message: string, variant?: Toast["variant"]) => void;
	onEdit: (followUp: FollowUpWithRefs) => void;
};

export function FollowUpHistoryPanel({
	currentAppointmentId,
	followUps,
	customerHistory,
	onToast,
	onEdit,
}: FollowUpHistoryPanelProps) {
	const router = useRouter();
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const threads = useMemo<FollowUpThread[]>(() => {
		const refByAppointment = new Map<string, string>();
		for (const a of customerHistory) refByAppointment.set(a.id, a.booking_ref);
		return followUps
			.map((f) => ({
				id: `f-${f.id}`,
				date: new Date(f.created_at),
				followUp: f,
				appointmentId: f.appointment_id,
				bookingRef: refByAppointment.get(f.appointment_id) ?? null,
				isCurrent: f.appointment_id === currentAppointmentId,
				isPinned: f.is_pinned,
			}))
			.sort((a, b) => {
				const aPinned = a.isPinned ? 1 : 0;
				const bPinned = b.isPinned ? 1 : 0;
				if (aPinned !== bPinned) return bPinned - aPinned;
				return b.date.getTime() - a.date.getTime();
			});
	}, [followUps, customerHistory, currentAppointmentId]);

	const allCollapsed =
		threads.length > 0 && threads.every((t) => collapsedIds.has(t.id));

	const toggleCollapse = (id: string) =>
		setCollapsedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const toggleAll = () => {
		if (allCollapsed) setCollapsedIds(new Set());
		else setCollapsedIds(new Set(threads.map((t) => t.id)));
	};

	const handleTogglePin = (followUpId: string, currentPinned: boolean) => {
		startTransition(async () => {
			try {
				await setFollowUpPinAction(
					currentAppointmentId,
					followUpId,
					!currentPinned,
				);
				onToast(currentPinned ? "Unpinned" : "Pinned to top", "success");
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not update pin",
					"error",
				);
			}
		});
	};

	const handleDelete = () => {
		if (!deleteId) return;
		startTransition(async () => {
			try {
				await deleteFollowUpAction(currentAppointmentId, deleteId);
				setDeleteId(null);
				onToast("Follow-up deleted", "success");
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not delete follow-up",
					"error",
				);
			}
		});
	};

	return (
		<div className="flex h-full w-full flex-col overflow-hidden rounded-md border bg-card">
			<div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
				<div className="font-bold text-[12px] text-foreground tracking-wide">
					FOLLOW-UPS
				</div>
				<div className="ml-auto flex items-center gap-1">
					<div
						title={`${threads.length} follow-up${threads.length === 1 ? "" : "s"}`}
						className="flex h-7 items-center gap-1 rounded border border-violet-300 bg-violet-50 px-1.5 font-semibold text-[10px] text-violet-700"
					>
						<Layers className="size-[14px]" />
						<span className="tabular-nums">{threads.length}</span>
					</div>
					<button
						type="button"
						aria-label={allCollapsed ? "Expand all" : "Collapse all"}
						title={allCollapsed ? "Expand all" : "Collapse all"}
						onClick={toggleAll}
						disabled={threads.length === 0}
						className="flex size-7 items-center justify-center rounded border border-border bg-muted/40 text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-40"
					>
						{allCollapsed ? (
							<Maximize2 className="size-[14px]" />
						) : (
							<Minimize2 className="size-[14px]" />
						)}
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{threads.length === 0 ? (
					<div className="p-5 text-center text-muted-foreground text-sm">
						No follow-ups yet
					</div>
				) : (
					threads.map((t) => (
						<FollowUpRow
							key={t.id}
							item={t}
							collapsed={collapsedIds.has(t.id)}
							onToggle={() => toggleCollapse(t.id)}
							onTogglePin={() =>
								handleTogglePin(t.followUp.id, t.isPinned)
							}
							onEdit={() => onEdit(t.followUp)}
							onDelete={() => setDeleteId(t.followUp.id)}
							onJump={
								t.isCurrent
									? undefined
									: () => router.push(`/appointments/${t.appointmentId}`)
							}
						/>
					))
				)}
			</div>

			<ConfirmDialog
				open={deleteId !== null}
				onOpenChange={(o) => !o && setDeleteId(null)}
				title="Delete this follow-up?"
				description="This removes the follow-up permanently."
				confirmLabel="Delete"
				pending={pending}
				onConfirm={handleDelete}
			/>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  FollowUpRow                                                       */
/* ------------------------------------------------------------------ */

function FollowUpRow({
	item,
	collapsed,
	onToggle,
	onTogglePin,
	onEdit,
	onDelete,
	onJump,
}: {
	item: FollowUpThread;
	collapsed: boolean;
	onToggle: () => void;
	onTogglePin: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onJump?: () => void;
}) {
	const f = item.followUp;
	const pinned = item.isPinned;
	const ReminderIcon = f.reminder_method === "whatsapp" ? MessageSquare : Phone;
	const reminderLabel = f.reminder_method === "whatsapp" ? "WhatsApp" : "Call";
	const reminderEmp = reminderEmployeeLabel(f);
	return (
		<div
			className={cn(
				"border-b border-border/60 px-3.5 py-2.5",
				item.isCurrent && "border-l-[3px] border-l-violet-600 bg-violet-50/40",
				pinned && "bg-amber-50/50",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div>
					<div className="flex items-center gap-1.5">
						<BellRing className="size-[12px] text-violet-600" />
						<span className="font-bold text-[12px] text-foreground">
							{formatDayMonthYear(item.date)}
						</span>
						{pinned && <Pin className="size-[10px] text-amber-600" />}
						{item.isCurrent && (
							<span className="rounded bg-violet-600 px-1.5 py-px font-bold text-[9px] text-white">
								CURRENT
							</span>
						)}
					</div>
					<div className="mt-0.5 text-[11px] text-muted-foreground">
						{formatWeekdayTime(item.date)}
					</div>
				</div>
				<div className="flex items-center gap-1">
					<IconBtn
						label={pinned ? "Unpin" : "Pin to top"}
						onClick={onTogglePin}
											className={
							pinned
								? "bg-amber-500 text-white hover:bg-amber-600"
								: "border border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100"
						}
					>
						{pinned ? (
							<PinOff className="size-[11px]" />
						) : (
							<Pin className="size-[11px]" />
						)}
					</IconBtn>
					{onJump && (
						<IconBtn
							label="Go to appointment"
							onClick={onJump}
							className="bg-violet-500 text-white hover:bg-violet-600"
						>
							<ExternalLink className="size-[11px]" />
						</IconBtn>
					)}
					<IconBtn
						label="Edit follow-up"
						onClick={onEdit}
						className="bg-emerald-500 text-white hover:bg-emerald-600"
					>
						<Pencil className="size-[11px]" />
					</IconBtn>
					<IconBtn
						label="Delete follow-up"
						onClick={onDelete}
						className="bg-rose-500 text-white hover:bg-rose-600"
					>
						<Trash2 className="size-[11px]" />
					</IconBtn>
				</div>
			</div>
			{item.bookingRef && (
				<button
					type="button"
					onClick={onJump}
					disabled={!onJump}
					className="mt-1 block text-left font-bold text-[10px] text-foreground tabular-nums hover:underline disabled:cursor-default disabled:no-underline"
				>
					{item.bookingRef}
				</button>
			)}
			<button
				type="button"
				aria-expanded={!collapsed}
				onClick={onToggle}
				className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
			>
				{collapsed ? (
					<ChevronDown className="size-[11px]" />
				) : (
					<ChevronUp className="size-[11px]" />
				)}
				<span>{collapsed ? "Show" : "Hide"} details</span>
			</button>
			{!collapsed && (
				<>
					<p className="mt-1 whitespace-pre-wrap wrap-break-word text-[11px] text-muted-foreground leading-snug">
						{f.content === "" ? (
							<span className="text-muted-foreground/50">(empty)</span>
						) : (
							f.content
						)}
					</p>
					{f.has_reminder && f.reminder_date && (
						<div
							className={cn(
								"mt-2 flex items-start gap-1.5 rounded border px-2 py-1.5 text-[10px]",
								f.reminder_done
									? "border-emerald-200 bg-emerald-50 text-emerald-700"
									: "border-amber-200 bg-amber-50 text-amber-800",
							)}
						>
							<ReminderIcon className="mt-px size-[11px] shrink-0" />
							<div className="flex-1">
								<div className="font-semibold">
									{reminderLabel} · {formatReminderDate(f.reminder_date)}
									{f.reminder_done && " · done"}
								</div>
								{reminderEmp && (
									<div className="mt-px text-[9px] opacity-80">
										Assigned to {reminderEmp}
									</div>
								)}
							</div>
						</div>
					)}
				</>
			)}
			<div className="mt-1.5 text-[9px] text-muted-foreground/80">
				Last updated by: {followUpAuthorLabel(f)}
			</div>
		</div>
	);
}
