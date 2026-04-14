"use client";

import { Pencil, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	createCaseNoteAction,
	deleteCaseNoteAction,
	updateCaseNoteAction,
} from "@/lib/actions/case-notes";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { CaseNoteWithAuthor } from "@/lib/services/case-notes";

type Props = {
	appointment: AppointmentWithRelations;
	caseNotes: CaseNoteWithAuthor[];
	onToast: (message: string, variant?: Toast["variant"]) => void;
};

function formatDateTime(d: Date): string {
	return `${d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	})} · ${d.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	})}`;
}

function authorLabel(n: CaseNoteWithAuthor): string {
	if (!n.employee) return "—";
	return `${n.employee.first_name} ${n.employee.last_name}`.trim();
}

export function CaseNotesTab({ appointment, caseNotes, onToast }: Props) {
	const router = useRouter();
	const [draft, setDraft] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [, startTransition] = useTransition();
	const [localNotes, setLocalNotes] = useState<CaseNoteWithAuthor[]>(caseNotes);

	useEffect(() => {
		setLocalNotes(caseNotes);
	}, [caseNotes]);

	const isLead = !appointment.is_time_block && !appointment.customer_id;
	const isBlock = appointment.is_time_block;
	const customerId = appointment.customer_id;

	const refresh = () => startTransition(() => router.refresh());

	const handleAdd = () => {
		if (!customerId || !draft.trim()) return;
		const content = draft.trim();
		const tempId = `temp-${crypto.randomUUID()}`;
		const optimistic: CaseNoteWithAuthor = {
			id: tempId,
			appointment_id: appointment.id,
			customer_id: customerId,
			employee_id: appointment.employee_id ?? null,
			content,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			employee: null,
		} as CaseNoteWithAuthor;
		setLocalNotes((prev) => [...prev, optimistic]);
		setDraft("");
		startTransition(async () => {
			try {
				await createCaseNoteAction(appointment.id, {
					appointment_id: appointment.id,
					customer_id: customerId,
					employee_id: appointment.employee_id ?? null,
					content,
				});
				onToast("Note saved", "success");
				refresh();
			} catch (err) {
				setLocalNotes((prev) => prev.filter((n) => n.id !== tempId));
				setDraft(content);
				onToast(
					err instanceof Error ? err.message : "Could not save note",
					"error",
				);
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
				await updateCaseNoteAction(appointment.id, id, { content });
				onToast("Note updated", "success");
				refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not update note",
					"error",
				);
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
				await deleteCaseNoteAction(appointment.id, id);
				onToast("Note deleted", "success");
				refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not delete note",
					"error",
				);
				refresh();
			}
		});
	};

	if (isBlock) {
		return (
			<div className="rounded-md border bg-muted/20 p-6 text-center text-muted-foreground text-sm">
				Case notes don't apply to time blocks.
			</div>
		);
	}

	if (isLead) {
		return (
			<div className="rounded-md border bg-amber-50 p-6 text-center text-amber-900 text-sm">
				Register this walk-in lead as a customer to start recording case notes.
			</div>
		);
	}

	const notesOnThisVisit = localNotes.filter(
		(n) => n.appointment_id === appointment.id,
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-md border bg-card p-4">
				<div className="text-muted-foreground text-xs uppercase tracking-wide">
					New case note
				</div>
				<textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					rows={6}
					placeholder="Chief complaint, findings, procedure details, medication…"
					className="mt-3 w-full resize-y rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
				/>
				<div className="mt-3 flex justify-end">
					<Button
						type="button"
						size="sm"
						onClick={handleAdd}
						disabled={!draft.trim()}
					>
						<Save className="size-3.5" />
						Save note
					</Button>
				</div>
			</div>

			<div className="rounded-md border bg-card p-4">
				<div className="text-muted-foreground text-xs uppercase tracking-wide">
					Notes on this visit
				</div>
				<div className="mt-3 flex flex-col gap-3">
					{notesOnThisVisit.length === 0 ? (
						<p className="text-muted-foreground text-sm italic">
							No notes yet for this visit.
						</p>
					) : (
						notesOnThisVisit.map((n) => (
							<NoteRow
								key={n.id}
								note={n}
								isEditing={editingId === n.id}
								editContent={editContent}
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
						))
					)}
				</div>
			</div>

			<ConfirmDialog
				open={deleteId !== null}
				onOpenChange={(o) => !o && setDeleteId(null)}
				title="Delete this case note?"
				description="This removes the note permanently."
				confirmLabel="Delete"
				onConfirm={handleDelete}
			/>
		</div>
	);
}

function NoteRow({
	note,
	isEditing,
	editContent,
	onEditStart,
	onEditCancel,
	onEditChange,
	onEditSave,
	onDelete,
}: {
	note: CaseNoteWithAuthor;
	isEditing: boolean;
	editContent: string;
	onEditStart: () => void;
	onEditCancel: () => void;
	onEditChange: (v: string) => void;
	onEditSave: () => void;
	onDelete: () => void;
}) {
	return (
		<div className="rounded border bg-background p-3 text-sm">
			<div className="flex items-center justify-between gap-2">
				<div className="text-muted-foreground text-xs">
					{formatDateTime(new Date(note.created_at))} · {authorLabel(note)}
				</div>
				<div className="flex items-center gap-1">
					{!isEditing ? (
						<>
							<button
								type="button"
								onClick={onEditStart}
								className="text-muted-foreground hover:text-foreground"
								aria-label="Edit note"
							>
								<Pencil className="size-3.5" />
							</button>
							<button
								type="button"
								onClick={onDelete}
								className="text-muted-foreground hover:text-destructive"
								aria-label="Delete note"
							>
								<Trash2 className="size-3.5" />
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								onClick={onEditSave}
								disabled={!editContent.trim()}
								className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
								aria-label="Save edit"
							>
								<Save className="size-3.5" />
							</button>
							<button
								type="button"
								onClick={onEditCancel}
								className="text-muted-foreground hover:text-foreground"
								aria-label="Cancel edit"
							>
								<X className="size-3.5" />
							</button>
						</>
					)}
				</div>
			</div>
			{isEditing ? (
				<textarea
					value={editContent}
					onChange={(e) => onEditChange(e.target.value)}
					rows={4}
					className="mt-2 w-full resize-y rounded-md border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
				/>
			) : (
				<p className="mt-2 whitespace-pre-wrap">{note.content}</p>
			)}
		</div>
	);
}
