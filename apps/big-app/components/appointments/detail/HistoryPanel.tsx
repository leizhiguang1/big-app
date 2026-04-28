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
import { Fragment, useMemo, useState, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	cancelBillingForAppointmentAction,
	cancelBillingForCustomerAction,
	revertBillingForAppointmentAction,
	revertBillingForCustomerAction,
} from "@/lib/actions/appointments";
import {
	cancelCaseNoteAction,
	cancelCustomerCaseNoteAction,
	revertCaseNoteAction,
	revertCustomerCaseNoteAction,
	setCaseNotePinAction,
	setCustomerCaseNotePinAction,
} from "@/lib/actions/case-notes";
import {
	deleteCustomerFollowUpAction,
	deleteFollowUpAction,
	setCustomerFollowUpPinAction,
	setFollowUpPinAction,
} from "@/lib/actions/follow-ups";
import {
	APPOINTMENT_PAYMENT_MODE_LABEL,
	type AppointmentPaymentMode,
} from "@/lib/constants/appointment-status";
import type {
	AppointmentLineItem,
	CustomerLineItem,
} from "@/lib/services/appointment-line-items";
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
/*  Shared compact appointment-context header                         */
/* ------------------------------------------------------------------ */

function Pipe() {
	return (
		<span aria-hidden className="font-semibold text-foreground/70">
			|
		</span>
	);
}

export function ContextHeader({
	bookingRef,
	outletCode,
	date,
	serviceSummary,
	onJump,
}: {
	bookingRef: string | null;
	outletCode: string | null;
	date: Date | null;
	serviceSummary: ServiceChip[];
	onJump?: () => void;
}) {
	const hasServices = serviceSummary.length > 0;
	if (!bookingRef && !outletCode && !date && !hasServices) return null;
	const segments: { key: string; node: React.ReactNode }[] = [];
	if (bookingRef) {
		segments.push({
			key: "bref",
			node: (
				<button
					type="button"
					onClick={onJump}
					disabled={!onJump}
					className="font-bold text-foreground tabular-nums hover:underline disabled:cursor-default disabled:no-underline"
				>
					{bookingRef}
				</button>
			),
		});
	}
	if (outletCode) {
		segments.push({
			key: "outlet",
			node: (
				<span className="font-semibold text-foreground uppercase tracking-wide">
					{outletCode}
				</span>
			),
		});
	}
	if (date) {
		segments.push({
			key: "date",
			node: (
				<span className="text-foreground tabular-nums">
					{formatDateTimeNumeric(date)}
				</span>
			),
		});
	}
	for (let i = 0; i < serviceSummary.length; i++) {
		const chip = serviceSummary[i];
		const color = chip.truncated ? "text-muted-foreground" : "text-sky-600";
		segments.push({
			key: `svc-${chip.label}-${i}`,
			node: <span className={cn("font-semibold", color)}>{chip.label}</span>,
		});
	}

	return (
		<div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[10px] leading-tight">
			{segments.map((seg, i) => (
				<Fragment key={seg.key}>
					{i > 0 && <Pipe />}
					{seg.node}
				</Fragment>
			))}
		</div>
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
	outletCode: string | null;
	serviceSummary: ServiceChip[];
	paymentStatus: string;
	paidVia: string | null;
	servedBy: string | null;
	salesOrderNumber: string | null;
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
	outletCode: string | null;
	serviceSummary: ServiceChip[];
	appointmentDate: Date | null;
	appointmentId: string | null;
	isCurrent: boolean;
	isPinned: boolean;
	isCancelled: boolean;
};

type Thread = BillingThread | NoteThread;

export type HistoryScope =
	| { kind: "appointment"; appointmentId: string }
	| { kind: "customer"; customerId: string };

type Props = {
	scope: HistoryScope;
	caseNotes: CaseNoteWithContext[];
	customerBillingHistory: CustomerLineItem[];
	customerHistory: CustomerAppointmentSummary[];
	currentAppointmentLineItems?: AppointmentLineItem[];
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

function pad2(n: number) {
	return n < 10 ? `0${n}` : String(n);
}

function formatDateTimeNumeric(d: Date) {
	const dd = pad2(d.getDate());
	const mm = pad2(d.getMonth() + 1);
	const yyyy = d.getFullYear();
	const hour24 = d.getHours();
	const ampm = hour24 >= 12 ? "PM" : "AM";
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
	const minute = pad2(d.getMinutes());
	return `${dd}/${mm}/${yyyy} ${hour12}:${minute} ${ampm}`;
}

function formatDateTime24(d: Date) {
	const dd = pad2(d.getDate());
	const mm = pad2(d.getMonth() + 1);
	const yyyy = d.getFullYear();
	const hh = pad2(d.getHours());
	const min = pad2(d.getMinutes());
	const ss = pad2(d.getSeconds());
	return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

function ordinal(n: number) {
	const s = ["th", "st", "nd", "rd"];
	const v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatHeaderDate(d: Date) {
	const month = d.toLocaleDateString("en-US", { month: "short" });
	const year = d.getFullYear();
	return `${ordinal(d.getDate())} ${month} ${year}`;
}

function formatHeaderTime(d: Date) {
	const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
	const hour24 = d.getHours();
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
	const ampm = hour24 >= 12 ? "PM" : "AM";
	return `${weekday} · ${pad2(hour12)}:${pad2(d.getMinutes())} ${ampm}`;
}

const SERVICE_SUMMARY_MAX = 120;

type SummarizableItem = {
	description: string;
	quantity: number | string;
	is_cancelled?: boolean;
};

export type ServiceChip = { label: string; truncated?: true };

export function summarizeServices(items: SummarizableItem[]): ServiceChip[] {
	if (items.length === 0) return [];
	const grouped = new Map<string, number>();
	for (const it of items) {
		if (it.is_cancelled) continue;
		const desc = it.description.trim();
		if (!desc) continue;
		const qty = Number(it.quantity);
		grouped.set(
			desc,
			(grouped.get(desc) ?? 0) + (Number.isFinite(qty) ? qty : 0),
		);
	}
	const chips: ServiceChip[] = [];
	let length = 0;
	for (const [desc, qty] of grouped) {
		const piece = `${desc} ×${qty % 1 === 0 ? qty : qty.toFixed(2)}`;
		const sep = chips.length === 0 ? 0 : 3;
		if (length + sep + piece.length > SERVICE_SUMMARY_MAX) {
			chips.push({ label: "…", truncated: true });
			break;
		}
		chips.push({ label: piece });
		length += sep + piece.length;
	}
	return chips;
}

function authorLabel(n: CaseNoteWithContext): string {
	if (!n.employee) return "—";
	return `${n.employee.first_name} ${n.employee.last_name}`.trim();
}

type AppointmentMeta = {
	bookingRef: string;
	outletCode: string | null;
	startAt: Date | null;
	serviceSummary: ServiceChip[];
};

function buildMetaByAppointment(
	customerHistory: CustomerAppointmentSummary[],
	billing: CustomerLineItem[],
	currentAppointmentId: string | null,
	currentAppointmentLineItems: AppointmentLineItem[] | undefined,
): Map<string, AppointmentMeta> {
	const meta = new Map<string, AppointmentMeta>();
	for (const a of customerHistory) {
		meta.set(a.id, {
			bookingRef: a.booking_ref,
			outletCode: a.outlet?.code ?? null,
			startAt: new Date(a.start_at),
			serviceSummary: [],
		});
	}

	const itemsByAppointment = new Map<string, CustomerLineItem[]>();
	for (const b of billing) {
		if (!b.appointment) continue;
		const list = itemsByAppointment.get(b.appointment.id);
		if (list) list.push(b);
		else itemsByAppointment.set(b.appointment.id, [b]);
	}
	for (const [aptId, items] of itemsByAppointment) {
		const existing = meta.get(aptId);
		const summary = summarizeServices(items);
		if (existing) {
			existing.serviceSummary = summary;
		} else {
			const first = items[0];
			meta.set(aptId, {
				bookingRef: first.appointment?.booking_ref ?? "",
				outletCode: null,
				startAt: first.appointment
					? new Date(first.appointment.start_at)
					: null,
				serviceSummary: summary,
			});
		}
	}

	if (currentAppointmentId && currentAppointmentLineItems?.length) {
		const summary = summarizeServices(currentAppointmentLineItems);
		const existing = meta.get(currentAppointmentId);
		if (existing) {
			if (summary.length) existing.serviceSummary = summary;
		} else if (summary.length) {
			meta.set(currentAppointmentId, {
				bookingRef: "",
				outletCode: null,
				startAt: null,
				serviceSummary: summary,
			});
		}
	}
	return meta;
}

function buildThreads(
	caseNotes: CaseNoteWithContext[],
	billing: CustomerLineItem[],
	customerHistory: CustomerAppointmentSummary[],
	currentAppointmentId: string,
	pinnedBillingIds: Set<string>,
	currentAppointmentLineItems: AppointmentLineItem[] | undefined,
): { threads: Thread[]; noteCount: number; billingCount: number } {
	const meta = buildMetaByAppointment(
		customerHistory,
		billing,
		currentAppointmentId,
		currentAppointmentLineItems,
	);

	const byAppointment = new Map<
		string,
		{
			bookingRef: string;
			date: Date;
			paymentStatus: string;
			paidVia: string | null;
			servedBy: string | null;
			salesOrderNumber: string | null;
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
			const activeSo = b.appointment.sales_orders?.find(
				(so) => so.status !== "cancelled",
			);
			byAppointment.set(aptId, {
				bookingRef: b.appointment.booking_ref,
				date: new Date(b.appointment.start_at),
				paymentStatus: b.appointment.payment_status,
				paidVia: b.appointment.paid_via,
				servedBy: emp ? `${emp.first_name} ${emp.last_name}`.trim() : null,
				salesOrderNumber: activeSo?.so_number ?? null,
				items: [b],
				total,
				allCancelled: b.is_cancelled,
			});
		}
	}

	const threads: Thread[] = [];
	for (const [appointmentId, g] of byAppointment) {
		const m = meta.get(appointmentId);
		threads.push({
			kind: "billing",
			id: `b-${appointmentId}`,
			date: g.date,
			appointmentId,
			bookingRef: g.bookingRef,
			outletCode: m?.outletCode ?? null,
			serviceSummary: summarizeServices(g.items),
			paymentStatus: g.paymentStatus,
			paidVia: g.paidVia,
			servedBy: g.servedBy,
			salesOrderNumber: g.salesOrderNumber,
			items: g.items,
			total: g.total,
			isCurrent: appointmentId === currentAppointmentId,
			isCancelled: g.allCancelled,
		});
	}

	for (const n of caseNotes) {
		const m = n.appointment_id ? meta.get(n.appointment_id) : null;
		threads.push({
			kind: "note",
			id: `n-${n.id}`,
			date: new Date(n.created_at),
			note: n,
			appointmentId: n.appointment_id ?? null,
			bookingRef: m?.bookingRef ?? null,
			outletCode: m?.outletCode ?? null,
			serviceSummary: m?.serviceSummary ?? [],
			appointmentDate: m?.startAt ?? null,
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
	scope,
	caseNotes,
	customerBillingHistory,
	customerHistory,
	currentAppointmentLineItems,
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
	const currentAppointmentId =
		scope.kind === "appointment" ? scope.appointmentId : "";

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
				currentAppointmentLineItems,
			),
		[
			caseNotes,
			customerBillingHistory,
			customerHistory,
			currentAppointmentId,
			pinnedBillingIds,
			currentAppointmentLineItems,
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
				if (scope.kind === "appointment") {
					await setCaseNotePinAction(
						scope.appointmentId,
						noteId,
						!currentPinned,
					);
				} else {
					await setCustomerCaseNotePinAction(
						scope.customerId,
						noteId,
						!currentPinned,
					);
				}
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
				if (scope.kind === "appointment") {
					await cancelCaseNoteAction(scope.appointmentId, noteId);
				} else {
					await cancelCustomerCaseNoteAction(scope.customerId, noteId);
				}
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
				if (scope.kind === "appointment") {
					await revertCaseNoteAction(scope.appointmentId, noteId);
				} else {
					await revertCustomerCaseNoteAction(scope.customerId, noteId);
				}
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
				if (scope.kind === "appointment") {
					await cancelBillingForAppointmentAction(
						scope.appointmentId,
						targetAppointmentId,
					);
				} else {
					await cancelBillingForCustomerAction(
						scope.customerId,
						targetAppointmentId,
					);
				}
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
				if (scope.kind === "appointment") {
					await revertBillingForAppointmentAction(
						scope.appointmentId,
						targetAppointmentId,
					);
				} else {
					await revertBillingForCustomerAction(
						scope.customerId,
						targetAppointmentId,
					);
				}
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
										: () =>
												router.push(
													`/appointments/${t.bookingRef ?? t.appointmentId}`,
												)
								}
							/>
						) : (
							<NoteRow
								key={t.id}
								item={t}
								collapsed={collapsedIds.has(t.id)}
								onToggle={() => toggleCollapse(t.id)}
								onTogglePin={() => handleToggleNotePin(t.note.id, t.isPinned)}
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
												router.push(
													`/appointments/${t.bookingRef ?? t.appointmentId}`,
												)
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
				"border-b border-border/60 bg-card px-2 py-2",
				item.isCurrent &&
					"border-l-[3px] border-l-emerald-600 bg-emerald-50/40",
				pinned && !cancelled && "bg-amber-50/50",
				cancelled && "opacity-60",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<button
					type="button"
					onClick={onToggle}
					aria-expanded={!collapsed}
					className="min-w-0 flex-1 text-left"
				>
					<div
						className={cn(
							"font-bold text-[12px] text-foreground",
							cancelled && "line-through",
						)}
					>
						{formatHeaderDate(item.date)}
					</div>
					<div className="text-[10px] text-muted-foreground">
						{formatHeaderTime(item.date)}
					</div>
				</button>
				<div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
					{pinned && <Pin className="size-[10px] text-amber-600" />}
					{cancelled && (
						<span className="rounded bg-slate-400 px-1.5 py-px font-bold text-[9px] text-white">
							CANCELLED
						</span>
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
				</div>
			</div>

			<ContextHeader
				bookingRef={item.bookingRef}
				outletCode={item.outletCode}
				date={item.date}
				serviceSummary={item.serviceSummary}
				onJump={onJump}
			/>

			{!collapsed && (
				<>
					<dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[11px]">
						{item.salesOrderNumber && (
							<>
								<dt className="text-muted-foreground">Sales Order # :</dt>
								<dd className="text-right font-bold tabular-nums">
									{item.salesOrderNumber}
								</dd>
							</>
						)}
						<dt className="text-muted-foreground">Date :</dt>
						<dd className="text-right tabular-nums">
							{formatDateTime24(item.date)}
						</dd>
						{item.servedBy && (
							<>
								<dt className="text-muted-foreground">Served By :</dt>
								<dd className="truncate text-right uppercase tracking-wide">
									{item.servedBy}
								</dd>
							</>
						)}
					</dl>

					<div className="mt-2 grid grid-cols-[minmax(0,1fr)_38px_24px_52px_52px_52px] gap-x-1 border-border border-b pb-1 font-semibold text-[9px] text-muted-foreground uppercase leading-tight tracking-wide">
						<span>Description</span>
						<span className="text-center">Item Code</span>
						<span className="text-center">Qty</span>
						<span className="text-right">U/Price</span>
						<span className="text-right">Discount</span>
						<span className="text-right">Amount</span>
					</div>
					<div className="divide-y divide-border/40">
						{item.items.map((bi) => {
							const qty = Number(bi.quantity);
							const price = Number(bi.unit_price);
							const lineTotal = Number(bi.total ?? qty * price);
							const discount = Math.max(0, qty * price - lineTotal);
							const itemCancelled = bi.is_cancelled;
							return (
								<div
									key={bi.id}
									className={cn(
										"grid grid-cols-[minmax(0,1fr)_38px_24px_52px_52px_52px] gap-x-1 py-1.5 text-[11px] leading-tight",
										itemCancelled && "line-through opacity-50",
									)}
								>
									<div className="min-w-0 break-words">{bi.description}</div>
									<div className="break-all text-center text-[10px] text-muted-foreground tabular-nums">
										{bi.service?.sku ?? "—"}
									</div>
									<div className="text-center tabular-nums">
										{qty % 1 === 0 ? qty : qty.toFixed(2)}
									</div>
									<div className="text-right tabular-nums">
										{price.toFixed(2)}
									</div>
									<div className="text-right tabular-nums">
										<div>{discount.toFixed(2)}</div>
										<div className="break-words text-[9px] text-muted-foreground">
											(LOCAL 0%): 0.00
										</div>
									</div>
									<div className="text-right font-semibold tabular-nums">
										{lineTotal.toFixed(2)}
									</div>
								</div>
							);
						})}
					</div>

					<dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 text-[11px]">
						<dt className="font-bold uppercase tracking-wide">
							Sub Total (MYR)
						</dt>
						<dd
							className={cn(
								"text-right font-bold tabular-nums",
								cancelled && "line-through",
							)}
						>
							{item.total.toFixed(2)}
						</dd>
					</dl>

					<div className="mt-2">
						<div className="border-foreground/40 border-b pb-0.5 font-semibold text-[10px] uppercase tracking-wide">
							Discounts
						</div>
						<dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 text-[11px]">
							<dt className="text-muted-foreground">Voucher (MYR)</dt>
							<dd className="text-right tabular-nums">0.00</dd>
						</dl>
					</div>

					<dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 text-[11px]">
						<dt className="font-bold uppercase tracking-wide">
							Gross Total (MYR)
						</dt>
						<dd
							className={cn(
								"text-right font-bold tabular-nums",
								cancelled && "line-through",
							)}
						>
							{item.total.toFixed(2)}
						</dd>
					</dl>

					<div className="mt-2">
						<div className="border-foreground/40 border-b pb-0.5 font-semibold text-[10px] uppercase tracking-wide">
							Payment Details
						</div>
						<dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 text-[11px]">
							<dt className="text-muted-foreground">
								Tendered Amount (before Tax) (MYR)
							</dt>
							<dd
								className={cn(
									"text-right tabular-nums",
									cancelled && "line-through",
								)}
							>
								{item.total.toFixed(2)}
							</dd>
							<dt className="text-muted-foreground">Total Tax Amount (MYR)</dt>
							<dd className="text-right tabular-nums">0.00</dd>
							<dt className="text-muted-foreground">Payment Type</dt>
							<dd className="text-right">{payMode ?? "—"}</dd>
						</dl>
					</div>
				</>
			)}

			{collapsed && (
				<div className="mt-2 flex justify-between text-[11px]">
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
			<ContextHeader
				bookingRef={item.bookingRef}
				outletCode={item.outletCode}
				date={item.appointmentDate}
				serviceSummary={item.serviceSummary}
				onJump={onJump}
			/>
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
	outletCode: string | null;
	serviceSummary: ServiceChip[];
	appointmentDate: Date | null;
	appointmentId: string | null;
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
	scope: HistoryScope;
	followUps: FollowUpWithRefs[];
	customerHistory: CustomerAppointmentSummary[];
	customerBillingHistory?: CustomerLineItem[];
	currentAppointmentLineItems?: AppointmentLineItem[];
	onToast: (message: string, variant?: Toast["variant"]) => void;
	onEdit: (followUp: FollowUpWithRefs) => void;
};

export function FollowUpHistoryPanel({
	scope,
	followUps,
	customerHistory,
	customerBillingHistory,
	currentAppointmentLineItems,
	onToast,
	onEdit,
}: FollowUpHistoryPanelProps) {
	const router = useRouter();
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const currentAppointmentId =
		scope.kind === "appointment" ? scope.appointmentId : null;

	const threads = useMemo<FollowUpThread[]>(() => {
		const meta = buildMetaByAppointment(
			customerHistory,
			customerBillingHistory ?? [],
			currentAppointmentId,
			currentAppointmentLineItems,
		);
		return followUps
			.map((f) => {
				const m = f.appointment_id ? meta.get(f.appointment_id) : null;
				return {
					id: `f-${f.id}`,
					date: new Date(f.created_at),
					followUp: f,
					appointmentId: f.appointment_id,
					bookingRef: m?.bookingRef ?? null,
					outletCode: m?.outletCode ?? null,
					serviceSummary: m?.serviceSummary ?? [],
					appointmentDate: m?.startAt ?? null,
					isCurrent:
						f.appointment_id != null &&
						f.appointment_id === currentAppointmentId,
					isPinned: f.is_pinned,
				};
			})
			.sort((a, b) => {
				const aPinned = a.isPinned ? 1 : 0;
				const bPinned = b.isPinned ? 1 : 0;
				if (aPinned !== bPinned) return bPinned - aPinned;
				return b.date.getTime() - a.date.getTime();
			});
	}, [
		followUps,
		customerHistory,
		customerBillingHistory,
		currentAppointmentLineItems,
		currentAppointmentId,
	]);

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
				if (scope.kind === "appointment") {
					await setFollowUpPinAction(
						scope.appointmentId,
						followUpId,
						!currentPinned,
					);
				} else {
					await setCustomerFollowUpPinAction(
						scope.customerId,
						followUpId,
						!currentPinned,
					);
				}
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
				if (scope.kind === "appointment") {
					await deleteFollowUpAction(scope.appointmentId, deleteId);
				} else {
					await deleteCustomerFollowUpAction(scope.customerId, deleteId);
				}
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
							onTogglePin={() => handleTogglePin(t.followUp.id, t.isPinned)}
							onEdit={() => onEdit(t.followUp)}
							onDelete={() => setDeleteId(t.followUp.id)}
							onJump={
								t.isCurrent || t.appointmentId == null
									? undefined
									: () =>
											router.push(
												`/appointments/${t.bookingRef ?? t.appointmentId}`,
											)
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
			<ContextHeader
				bookingRef={item.bookingRef}
				outletCode={item.outletCode}
				date={item.appointmentDate}
				serviceSummary={item.serviceSummary}
				onJump={onJump}
			/>
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
