"use client";

import {
	Banknote,
	ChevronDown,
	ChevronUp,
	Layers,
	Maximize2,
	Minimize2,
	PanelLeftClose,
	Pencil,
	Save,
	StickyNote,
	Trash2,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	deleteCaseNoteAction,
	updateCaseNoteAction,
} from "@/lib/actions/case-notes";
import type { CustomerAppointmentSummary } from "@/lib/services/appointments";
import type { CustomerBillingEntry } from "@/lib/services/billing-entries";
import type { CaseNoteWithAuthor } from "@/lib/services/case-notes";
import { cn } from "@/lib/utils";

type HistoryMode = "all" | "casenotes" | "billing";

type BillingThread = {
	kind: "billing";
	id: string;
	date: Date;
	appointmentId: string;
	bookingRef: string;
	paymentStatus: string;
	items: CustomerBillingEntry[];
	total: number;
	isCurrent: boolean;
};

type NoteThread = {
	kind: "note";
	id: string;
	date: Date;
	note: CaseNoteWithAuthor;
	bookingRef: string | null;
	appointmentId: string | null;
	isCurrent: boolean;
};

type Thread = BillingThread | NoteThread;

type Props = {
	currentAppointmentId: string;
	caseNotes: CaseNoteWithAuthor[];
	customerBillingHistory: CustomerBillingEntry[];
	customerHistory: CustomerAppointmentSummary[];
	onClose: () => void;
	onToast: (message: string, variant?: Toast["variant"]) => void;
};

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

function authorLabel(n: CaseNoteWithAuthor): string {
	if (!n.employee) return "—";
	return `${n.employee.first_name} ${n.employee.last_name}`.trim();
}

function buildThreads(
	caseNotes: CaseNoteWithAuthor[],
	billing: CustomerBillingEntry[],
	customerHistory: CustomerAppointmentSummary[],
	currentAppointmentId: string,
): { threads: Thread[]; noteCount: number; billingCount: number } {
	const refByAppointment = new Map<string, string>();
	for (const a of customerHistory) refByAppointment.set(a.id, a.booking_ref);

	const byAppointment = new Map<
		string,
		{
			bookingRef: string;
			date: Date;
			paymentStatus: string;
			items: CustomerBillingEntry[];
			total: number;
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
		} else {
			byAppointment.set(aptId, {
				bookingRef: b.appointment.booking_ref,
				date: new Date(b.appointment.start_at),
				paymentStatus: b.appointment.payment_status,
				items: [b],
				total,
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
			items: g.items,
			total: g.total,
			isCurrent: appointmentId === currentAppointmentId,
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
		});
	}

	threads.sort((a, b) => b.date.getTime() - a.date.getTime());
	return {
		threads,
		noteCount: caseNotes.length,
		billingCount: byAppointment.size,
	};
}

export function HistoryPanel({
	currentAppointmentId,
	caseNotes,
	customerBillingHistory,
	customerHistory,
	onClose,
	onToast,
}: Props) {
	const router = useRouter();
	const [mode, setMode] = useState<HistoryMode>("all");
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
	const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");
	const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const { threads, noteCount, billingCount } = useMemo(
		() =>
			buildThreads(
				caseNotes,
				customerBillingHistory,
				customerHistory,
				currentAppointmentId,
			),
		[
			caseNotes,
			customerBillingHistory,
			customerHistory,
			currentAppointmentId,
		],
	);

	const visible = useMemo(
		() =>
			threads.filter((t) => {
				if (mode === "casenotes") return t.kind === "note";
				if (mode === "billing") return t.kind === "billing";
				return true;
			}),
		[threads, mode],
	);

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

	const handleUpdate = () => {
		if (!editingNoteId || !editContent.trim()) return;
		startTransition(async () => {
			try {
				await updateCaseNoteAction(currentAppointmentId, editingNoteId, {
					content: editContent.trim(),
				});
				setEditingNoteId(null);
				setEditContent("");
				onToast("Note updated", "success");
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not update note",
					"error",
				);
			}
		});
	};

	const handleDelete = () => {
		if (!deleteNoteId) return;
		startTransition(async () => {
			try {
				await deleteCaseNoteAction(currentAppointmentId, deleteNoteId);
				setDeleteNoteId(null);
				onToast("Note deleted", "success");
				router.refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not delete note",
					"error",
				);
			}
		});
	};

	return (
		<aside className="sticky top-4 flex h-[calc(100vh-8rem)] w-[340px] shrink-0 flex-col overflow-hidden rounded-md border bg-card">
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
							mode === "all" && "border-border bg-muted/40 text-muted-foreground",
						)}
					>
						{mode === "all" ? (
							<>
								<Layers className="size-[14px]" />
								<span className="tabular-nums">
									{noteCount + billingCount}
								</span>
							</>
						) : mode === "casenotes" ? (
							<>
								<StickyNote className="size-[14px]" />
								<span className="tabular-nums">{noteCount}</span>
							</>
						) : (
							<>
								<Banknote className="size-[14px]" />
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
					<button
						type="button"
						aria-label="Close history panel"
						onClick={onClose}
						className="flex size-7 items-center justify-center rounded text-muted-foreground transition hover:bg-muted"
					>
						<PanelLeftClose className="size-[14px]" />
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
								onToggle={() => toggleCollapse(t.id)}
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
								isEditing={editingNoteId === t.note.id}
								editContent={editContent}
								pending={pending}
								onToggle={() => toggleCollapse(t.id)}
								onEditStart={() => {
									setEditingNoteId(t.note.id);
									setEditContent(t.note.content);
									setCollapsedIds((prev) => {
										const next = new Set(prev);
										next.delete(t.id);
										return next;
									});
								}}
								onEditCancel={() => {
									setEditingNoteId(null);
									setEditContent("");
								}}
								onEditChange={setEditContent}
								onEditSave={handleUpdate}
								onDelete={() => setDeleteNoteId(t.note.id)}
								onJump={
									t.appointmentId && !t.isCurrent
										? () =>
												router.push(
													`/appointments/${t.appointmentId ?? ""}`,
												)
										: undefined
								}
							/>
						),
					)
				)}
			</div>

			<ConfirmDialog
				open={deleteNoteId !== null}
				onOpenChange={(o) => !o && setDeleteNoteId(null)}
				title="Delete this case note?"
				description="This removes the note permanently."
				confirmLabel="Delete"
				pending={pending}
				onConfirm={handleDelete}
			/>
		</aside>
	);
}

function BillingRow({
	item,
	collapsed,
	onToggle,
	onJump,
}: {
	item: BillingThread;
	collapsed: boolean;
	onToggle: () => void;
	onJump?: () => void;
}) {
	return (
		<div
			className={cn(
				"border-b border-border/60 px-4 py-2.5",
				item.isCurrent &&
					"border-l-[3px] border-l-emerald-600 bg-emerald-50/60",
			)}
		>
			<div className="mb-1 flex items-center gap-1.5">
				<button
					type="button"
					aria-expanded={!collapsed}
					aria-label={collapsed ? "Expand" : "Collapse"}
					onClick={onToggle}
					className="flex shrink-0 items-center text-muted-foreground hover:text-foreground"
				>
					{collapsed ? (
						<ChevronDown className="size-[14px]" />
					) : (
						<ChevronUp className="size-[14px]" />
					)}
				</button>
				<Banknote className="size-[12px] text-emerald-600" />
				<span className="font-semibold text-[11px] text-muted-foreground">
					{formatDayMonthYear(item.date)}
				</span>
				{item.isCurrent && (
					<span className="rounded bg-emerald-600 px-1.5 py-[1px] font-bold text-[9px] text-white">
						CURRENT
					</span>
				)}
				<span className="ml-auto text-[9px] text-muted-foreground uppercase tracking-wide">
					{item.paymentStatus}
				</span>
			</div>
			<button
				type="button"
				onClick={onJump}
				disabled={!onJump}
				className="mb-1 block text-left font-semibold text-[12px] text-foreground tabular-nums hover:underline disabled:cursor-default disabled:no-underline"
			>
				{item.bookingRef || "No Ref"}
			</button>
			{!collapsed ? (
				<>
					{item.items.map((bi) => (
						<div
							key={bi.id}
							className="flex justify-between gap-2 text-[11px] text-muted-foreground leading-relaxed"
						>
							<span className="truncate">
								{bi.description}
								{bi.quantity > 1 && ` ×${bi.quantity}`}
							</span>
							<span className="shrink-0 tabular-nums">
								{Number(bi.total ?? bi.quantity * bi.unit_price).toFixed(2)}
							</span>
						</div>
					))}
					<div className="mt-1 text-right font-bold text-[11px] text-foreground tabular-nums">
						RM {item.total.toFixed(2)}
					</div>
				</>
			) : (
				<div className="text-right text-[11px] text-muted-foreground tabular-nums">
					RM {item.total.toFixed(2)} · {item.items.length} line
					{item.items.length !== 1 ? "s" : ""}
				</div>
			)}
		</div>
	);
}

function NoteRow({
	item,
	collapsed,
	isEditing,
	editContent,
	pending,
	onToggle,
	onEditStart,
	onEditCancel,
	onEditChange,
	onEditSave,
	onDelete,
	onJump,
}: {
	item: NoteThread;
	collapsed: boolean;
	isEditing: boolean;
	editContent: string;
	pending: boolean;
	onToggle: () => void;
	onEditStart: () => void;
	onEditCancel: () => void;
	onEditChange: (v: string) => void;
	onEditSave: () => void;
	onDelete: () => void;
	onJump?: () => void;
}) {
	const content = item.note.content ?? "";
	return (
		<div
			className={cn(
				"border-b border-border/60 px-3.5 py-2.5",
				item.isCurrent && "border-l-[3px] border-l-blue-600 bg-blue-50/50",
				isEditing && "bg-amber-50",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div>
					<div className="flex items-center gap-1.5">
						<StickyNote className="size-[12px] text-blue-600" />
						<span className="font-bold text-[12px] text-foreground">
							{formatDayMonthYear(item.date)}
						</span>
						{item.isCurrent && (
							<span className="rounded bg-blue-600 px-1.5 py-[1px] font-bold text-[9px] text-white">
								CURRENT
							</span>
						)}
					</div>
					<div className="mt-0.5 text-[11px] text-muted-foreground">
						{formatWeekdayTime(item.date)}
					</div>
				</div>
				<div className="flex items-center gap-1">
					{!isEditing ? (
						<>
							<button
								type="button"
								onClick={onEditStart}
								aria-label="Edit note"
								className="flex size-[22px] items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600"
							>
								<Pencil className="size-[11px]" />
							</button>
							<button
								type="button"
								onClick={onDelete}
								aria-label="Delete note"
								className="flex size-[22px] items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600"
							>
								<Trash2 className="size-[11px]" />
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								onClick={onEditSave}
								disabled={pending || !editContent.trim()}
								aria-label="Save"
								className="flex size-[22px] items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:opacity-50"
							>
								<Save className="size-[11px]" />
							</button>
							<button
								type="button"
								onClick={onEditCancel}
								aria-label="Cancel"
								className="flex size-[22px] items-center justify-center rounded-full bg-slate-400 text-white transition hover:bg-slate-500"
							>
								<X className="size-[11px]" />
							</button>
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
			{!isEditing && (
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
			)}
			{isEditing ? (
				<textarea
					value={editContent}
					onChange={(e) => onEditChange(e.target.value)}
					rows={4}
					className="mt-2 w-full resize-y rounded-md border bg-background p-2 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
				/>
			) : (
				!collapsed && (
					<p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-muted-foreground leading-snug">
						{content === "" ? (
							<span className="text-muted-foreground/50">(empty note)</span>
						) : (
							content
						)}
					</p>
				)
			)}
			<div className="mt-1.5 text-[9px] text-muted-foreground/80">
				Last updated by: {authorLabel(item.note)}
			</div>
		</div>
	);
}
