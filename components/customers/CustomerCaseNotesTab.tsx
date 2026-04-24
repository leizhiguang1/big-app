"use client";

import {
	BookMarked,
	FileBadge,
	FileText,
	Grid3x3,
	ImagePlus,
	Pill,
	Save,
	StickyNote,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CaseNoteRow } from "@/components/case-notes/CaseNoteRow";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	cancelCustomerCaseNoteAction,
	createCustomerCaseNoteAction,
	deleteCustomerCaseNoteAction,
	revertCustomerCaseNoteAction,
	setCustomerCaseNotePinAction,
	updateCustomerCaseNoteAction,
} from "@/lib/actions/case-notes";
import type { CaseNoteWithContext } from "@/lib/services/case-notes";
import { cn } from "@/lib/utils";

type Props = {
	customerId: string;
	caseNotes: CaseNoteWithContext[];
};

type NoteGroup = {
	key: string;
	appointmentId: string | null;
	bookingRef: string | null;
	startAt: string | null;
	notes: CaseNoteWithContext[];
};

function buildGroups(notes: CaseNoteWithContext[]): NoteGroup[] {
	const map = new Map<string, NoteGroup>();

	for (const n of notes) {
		const key = n.appointment_id ?? "standalone";
		if (!map.has(key)) {
			map.set(key, {
				key,
				appointmentId: n.appointment_id,
				bookingRef: n.appointment?.booking_ref ?? null,
				startAt: n.appointment?.start_at ?? null,
				notes: [],
			});
		}
		map.get(key)!.notes.push(n);
	}

	return Array.from(map.values()).sort((a, b) => {
		const aTime = a.notes.reduce(
			(acc, n) => (n.created_at > acc ? n.created_at : acc),
			"",
		);
		const bTime = b.notes.reduce(
			(acc, n) => (n.created_at > acc ? n.created_at : acc),
			"",
		);
		return bTime.localeCompare(aTime);
	});
}

export function CustomerCaseNotesTab({ customerId, caseNotes }: Props) {
	const router = useRouter();
	const [draft, setDraft] = useState("");
	const [editingFromHistoryId, setEditingFromHistoryId] = useState<
		string | null
	>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [cancelId, setCancelId] = useState<string | null>(null);
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
	const [pending, startTransition] = useTransition();
	const [localNotes, setLocalNotes] =
		useState<CaseNoteWithContext[]>(caseNotes);

	useEffect(() => {
		setLocalNotes(caseNotes);
	}, [caseNotes]);

	const refresh = () => startTransition(() => router.refresh());

	const groups = useMemo(() => buildGroups(localNotes), [localNotes]);

	const clearDraft = () => {
		setDraft("");
		setEditingFromHistoryId(null);
	};

	const handleSave = () => {
		if (!draft.trim()) return;
		const content = draft.trim();

		if (editingFromHistoryId) {
			const id = editingFromHistoryId;
			setLocalNotes((prev) =>
				prev.map((n) => (n.id === id ? { ...n, content } : n)),
			);
			clearDraft();
			startTransition(async () => {
				try {
					await updateCustomerCaseNoteAction(customerId, id, { content });
					refresh();
				} catch {
					refresh();
				}
			});
			return;
		}

		const tempId = `temp-${crypto.randomUUID()}`;
		const optimistic: CaseNoteWithContext = {
			id: tempId,
			appointment_id: null,
			customer_id: customerId,
			employee_id: null,
			content,
			is_pinned: false,
			is_cancelled: false,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			employee: null,
			appointment: null,
		};
		setLocalNotes((prev) => [optimistic, ...prev]);
		clearDraft();
		startTransition(async () => {
			try {
				await createCustomerCaseNoteAction(customerId, {
					appointment_id: null,
					customer_id: customerId,
					content,
				});
				refresh();
			} catch {
				setLocalNotes((prev) => prev.filter((n) => n.id !== tempId));
				setDraft(content);
			}
		});
	};

	const handleUpdate = () => {
		if (!editingId || !editContent.trim()) return;
		const id = editingId;
		const content = editContent.trim();
		setLocalNotes((prev) =>
			prev.map((n) => (n.id === id ? { ...n, content } : n)),
		);
		setEditingId(null);
		setEditContent("");
		startTransition(async () => {
			try {
				await updateCustomerCaseNoteAction(customerId, id, { content });
				refresh();
			} catch {
				refresh();
			}
		});
	};

	const handleDelete = () => {
		if (!deleteId) return;
		const id = deleteId;
		setLocalNotes((prev) => prev.filter((n) => n.id !== id));
		setDeleteId(null);
		startTransition(async () => {
			try {
				await deleteCustomerCaseNoteAction(customerId, id);
				refresh();
			} catch {
				refresh();
			}
		});
	};

	const handleTogglePin = (id: string, currentPinned: boolean) => {
		setLocalNotes((prev) =>
			prev.map((n) => (n.id === id ? { ...n, is_pinned: !currentPinned } : n)),
		);
		startTransition(async () => {
			try {
				await setCustomerCaseNotePinAction(customerId, id, !currentPinned);
				refresh();
			} catch {
				refresh();
			}
		});
	};

	const handleConfirmCancel = () => {
		if (!cancelId) return;
		const id = cancelId;
		setLocalNotes((prev) =>
			prev.map((n) => (n.id === id ? { ...n, is_cancelled: true } : n)),
		);
		setCancelId(null);
		startTransition(async () => {
			try {
				await cancelCustomerCaseNoteAction(customerId, id);
				refresh();
			} catch {
				refresh();
			}
		});
	};

	const handleRevert = (id: string) => {
		setLocalNotes((prev) =>
			prev.map((n) => (n.id === id ? { ...n, is_cancelled: false } : n)),
		);
		startTransition(async () => {
			try {
				await revertCustomerCaseNoteAction(customerId, id);
				refresh();
			} catch {
				refresh();
			}
		});
	};

	const toggleCollapse = (id: string) =>
		setCollapsedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	return (
		<div className="flex flex-col gap-4">
			<div
				className={cn(
					"rounded-md border bg-card p-4",
					editingFromHistoryId && "border-amber-300 bg-amber-50/30",
				)}
			>
				<div className="flex items-center justify-between">
					<div className="text-muted-foreground text-xs uppercase tracking-wide">
						{editingFromHistoryId ? "Editing note" : "New case note"}
					</div>
					<CaseNoteToolbar />
				</div>
				<textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					rows={6}
					placeholder="Chief complaint, findings, procedure details, medication…"
					className="mt-3 w-full resize-y rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
				/>
				<div className="mt-3 flex items-center justify-end gap-2">
					{editingFromHistoryId && (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={clearDraft}
						>
							Cancel
						</Button>
					)}
					<Button
						type="button"
						size="sm"
						onClick={handleSave}
						disabled={!draft.trim() || pending}
					>
						<Save className="size-3.5" />
						{editingFromHistoryId ? "Update note" : "Save note"}
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<StickyNote className="size-4" />
				<span className="tabular-nums">
					{localNotes.length} {localNotes.length === 1 ? "note" : "notes"} across{" "}
					{groups.length} {groups.length === 1 ? "visit" : "visits"}
				</span>
			</div>

			{groups.length === 0 ? (
				<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
					No case notes yet.
				</div>
			) : (
				groups.map((group) => (
					<div
						key={group.key}
						className="overflow-hidden rounded-md border bg-card"
					>
						<div className="flex items-center justify-between border-b bg-muted/30 px-3.5 py-2.5">
							{group.appointmentId ? (
								<div className="flex items-center gap-2 text-xs">
									<Link
										href={`/appointments/${group.bookingRef ?? group.appointmentId}`}
										className="font-mono font-semibold text-sky-600 hover:underline"
									>
										{group.bookingRef ?? group.appointmentId}
									</Link>
									{group.startAt && (
										<span className="text-muted-foreground">
											{new Date(group.startAt).toLocaleDateString(undefined, {
												day: "2-digit",
												month: "short",
												year: "numeric",
											})}
										</span>
									)}
								</div>
							) : (
								<div className="text-muted-foreground text-xs">
									General notes
								</div>
							)}
							<span className="text-[10px] text-muted-foreground tabular-nums">
								{group.notes.length}{" "}
								{group.notes.length === 1 ? "note" : "notes"}
							</span>
						</div>

						{group.notes.map((n) => (
							<CaseNoteRow
								key={n.id}
								note={n}
								collapsed={collapsedIds.has(n.id)}
								isEditing={editingId === n.id}
								editContent={editContent}
								pending={pending}
								onToggle={() => toggleCollapse(n.id)}
								onEditStart={() => {
									setEditingId(n.id);
									setEditContent(n.content);
								}}
								onEditCancel={() => {
									setEditingId(null);
									setEditContent("");
								}}
								onEditChange={setEditContent}
								onEditSave={handleUpdate}
								onDelete={() => setDeleteId(n.id)}
								onTogglePin={() => handleTogglePin(n.id, n.is_pinned)}
								onCancel={() => setCancelId(n.id)}
								onRevert={() => handleRevert(n.id)}
							/>
						))}
					</div>
				))
			)}

			<ConfirmDialog
				open={deleteId !== null}
				onOpenChange={(o) => !o && setDeleteId(null)}
				title="Delete this case note?"
				description="This removes the note permanently."
				confirmLabel="Delete"
				pending={pending}
				onConfirm={handleDelete}
			/>

			<ConfirmDialog
				open={cancelId !== null}
				onOpenChange={(o) => !o && setCancelId(null)}
				title="Cancel this case note?"
				description="The note stays on the record marked as cancelled. You can restore it later."
				confirmLabel="Cancel note"
				pending={pending}
				onConfirm={handleConfirmCancel}
			/>
		</div>
	);
}

function CaseNoteToolbar() {
	return (
		<div className="flex items-center gap-1">
			<StubButton
				icon={ImagePlus}
				label="Annotate image"
				description="Draw arrows, circles, and notes on an x-ray or intra-oral photo, then attach it to this case note."
			/>
			<StubButton
				icon={FileText}
				label="Note templates"
				description="Insert a pre-written clinical template (scaling, extraction, consult, etc.) to avoid re-typing the same structure."
			/>
			<StubButton
				icon={Pill}
				label="Prescription"
				description="Write, save, and print a prescription slip."
			/>
			<StubButton
				icon={FileBadge}
				label="Medical certificate"
				description="Issue an MC. Open this customer's appointment to add an MC tied to that visit."
			/>
			<StubButton
				icon={BookMarked}
				label="ICD-10 lookup"
				description="Search the ICD-10 catalogue and attach standardised diagnosis codes to this case note."
			/>
			<StubButton
				icon={Grid3x3}
				label="Dental chart"
				description="Open the interactive tooth chart to record findings, treatments, and restorations per tooth."
			/>
		</div>
	);
}

function StubButton({
	icon: Icon,
	label,
	description,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	description: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={label}
					aria-disabled="true"
					data-stub="true"
					onClick={() => {}}
					className="flex size-8 cursor-not-allowed items-center justify-center rounded-md bg-blue-600/50 text-white shadow-sm transition hover:bg-blue-600/60"
				>
					<Icon className="size-4" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="top" className="max-w-xs items-start px-3 py-2">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<span className="font-semibold">{label}</span>
						<span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-900">
							Coming soon
						</span>
					</div>
					<p className="text-[11px] leading-snug text-background/75">
						{description}
					</p>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
