"use client";

import { Plus, StickyNote } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CaseNoteRow } from "@/components/case-notes/CaseNoteRow";
import { NewNoteDialog } from "@/components/case-notes/NewNoteDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	createCustomerCaseNoteAction,
	deleteCustomerCaseNoteAction,
	updateCustomerCaseNoteAction,
} from "@/lib/actions/case-notes";
import type { CaseNoteWithContext } from "@/lib/services/case-notes";

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

	// Sort groups by most recent note descending
	return Array.from(map.values()).sort((a, b) => {
		const aTime = a.notes[0]?.created_at ?? "";
		const bTime = b.notes[0]?.created_at ?? "";
		return bTime.localeCompare(aTime);
	});
}

export function CustomerCaseNotesTab({ customerId, caseNotes }: Props) {
	const router = useRouter();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
	const [dialogOpen, setDialogOpen] = useState(false);
	const [pending, startTransition] = useTransition();
	const [localNotes, setLocalNotes] =
		useState<CaseNoteWithContext[]>(caseNotes);

	useEffect(() => {
		setLocalNotes(caseNotes);
	}, [caseNotes]);

	const refresh = () => startTransition(() => router.refresh());

	const groups = useMemo(() => buildGroups(localNotes), [localNotes]);

	const handleCreate = (content: string) => {
		const tempId = `temp-${crypto.randomUUID()}`;
		const optimistic: CaseNoteWithContext = {
			id: tempId,
			appointment_id: null,
			customer_id: customerId,
			employee_id: null,
			content,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			employee: null,
			appointment: null,
		};
		setLocalNotes((prev) => [optimistic, ...prev]);
		setDialogOpen(false);
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
				refresh();
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

	const toggleCollapse = (id: string) =>
		setCollapsedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					<StickyNote className="size-4" />
					<span className="tabular-nums">
						{localNotes.length}{" "}
						{localNotes.length === 1 ? "note" : "notes"} across{" "}
						{groups.length} {groups.length === 1 ? "visit" : "visits"}
					</span>
				</div>
				<button
					type="button"
					onClick={() => setDialogOpen(true)}
					className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 font-semibold text-sm text-white transition hover:bg-blue-700"
				>
					<Plus className="size-4" />
					New note
				</button>
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
										href={`/appointments/${group.appointmentId}`}
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
							/>
						))}
					</div>
				))
			)}

			<NewNoteDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSave={handleCreate}
				pending={pending}
			/>

			<ConfirmDialog
				open={deleteId !== null}
				onOpenChange={(o) => !o && setDeleteId(null)}
				title="Delete this case note?"
				description="This removes the note permanently."
				confirmLabel="Delete"
				pending={pending}
				onConfirm={handleDelete}
			/>
		</div>
	);
}
