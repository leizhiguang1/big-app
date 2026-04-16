"use client";

import {
	BookMarked,
	FileBadge,
	FileText,
	Grid3x3,
	ImagePlus,
	Pill,
	Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { CaseNoteRow } from "@/components/case-notes/CaseNoteRow";
import { AddMcDialog } from "@/components/medical-certificates/AddMcDialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	createCaseNoteAction,
	deleteCaseNoteAction,
	updateCaseNoteAction,
} from "@/lib/actions/case-notes";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { CaseNoteWithContext } from "@/lib/services/case-notes";

type Props = {
	appointment: AppointmentWithRelations;
	caseNotes: CaseNoteWithContext[];
	onToast: (message: string, variant?: Toast["variant"]) => void;
};

export function CaseNotesTab({ appointment, caseNotes, onToast }: Props) {
	const router = useRouter();
	const [draft, setDraft] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
	const [mcDialogOpen, setMcDialogOpen] = useState(false);
	const [pending, startTransition] = useTransition();
	const [localNotes, setLocalNotes] = useState<CaseNoteWithContext[]>(caseNotes);

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
		const optimistic: CaseNoteWithContext = {
			id: tempId,
			appointment_id: appointment.id,
			customer_id: customerId,
			employee_id: appointment.employee_id ?? null,
			content,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			employee: null,
			appointment: null,
		};
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

	const toggleCollapse = (id: string) =>
		setCollapsedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

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
				<div className="flex items-center justify-between">
					<div className="text-muted-foreground text-xs uppercase tracking-wide">
						New case note
					</div>
					<CaseNoteToolbar onAddMc={() => setMcDialogOpen(true)} />
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

			<div className="rounded-md border bg-card">
				<div className="border-b px-4 py-2.5 text-muted-foreground text-xs uppercase tracking-wide">
					Notes on this visit
				</div>
				{notesOnThisVisit.length === 0 ? (
					<p className="p-4 text-muted-foreground text-sm italic">
						No notes yet for this visit.
					</p>
				) : (
					notesOnThisVisit.map((n) => (
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
					))
				)}
			</div>

			<ConfirmDialog
				open={deleteId !== null}
				onOpenChange={(o) => !o && setDeleteId(null)}
				title="Delete this case note?"
				description="This removes the note permanently."
				confirmLabel="Delete"
				pending={pending}
				onConfirm={handleDelete}
			/>

			{customerId && (
				<AddMcDialog
					open={mcDialogOpen}
					onClose={() => setMcDialogOpen(false)}
					appointmentId={appointment.id}
					customerId={customerId}
					outletId={appointment.outlet_id}
					issuingEmployeeId={appointment.employee_id ?? null}
					defaultStartDate={new Date(appointment.start_at)
						.toISOString()
						.slice(0, 10)}
					onCreated={(result) => {
						onToast(`Medical certificate ${result.code} saved`, "success");
						window.open(`/medical-certificates/${result.id}`, "_blank");
						refresh();
					}}
				/>
			)}
		</div>
	);
}

function CaseNoteToolbar({ onAddMc }: { onAddMc: () => void }) {
	return (
		<div className="flex items-center gap-1">
			<StubButton icon={ImagePlus} label="Annotate image to insert" />
			<StubButton icon={FileText} label="Templates" />
			<StubButton icon={Pill} label="Add prescription" />
			<ToolbarButton
				icon={FileBadge}
				label="Add medical certificate"
				onClick={onAddMc}
			/>
			<StubButton icon={BookMarked} label="ICD-10 code lookup" />
			<StubButton icon={Grid3x3} label="Dental chart" />
		</div>
	);
}

function ToolbarButton({
	icon: Icon,
	label,
	onClick,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	onClick: () => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					aria-label={label}
					className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
				>
					<Icon className="size-4" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="top">{label}</TooltipContent>
		</Tooltip>
	);
}

function StubButton({
	icon: Icon,
	label,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
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
					className="flex size-8 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/60 transition hover:bg-muted"
				>
					<Icon className="size-4" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="top">{label}</TooltipContent>
		</Tooltip>
	);
}
