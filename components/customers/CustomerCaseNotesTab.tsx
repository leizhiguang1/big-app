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
import { useCallback, useEffect, useState, useTransition } from "react";
import {
	AppointmentToastStack,
	type Toast,
} from "@/components/appointments/AppointmentToastStack";
import { HistoryPanel } from "@/components/appointments/detail/HistoryPanel";
import { AddMcDialog } from "@/components/medical-certificates/AddMcDialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	createCustomerCaseNoteAction,
	updateCustomerCaseNoteAction,
} from "@/lib/actions/case-notes";
import type { CustomerLineItem } from "@/lib/services/appointment-line-items";
import type { CustomerAppointmentSummary } from "@/lib/services/appointments";
import type { CaseNoteWithContext } from "@/lib/services/case-notes";
import { cn } from "@/lib/utils";

type Props = {
	customerId: string;
	caseNotes: CaseNoteWithContext[];
	lineItems: CustomerLineItem[];
	customerHistory: CustomerAppointmentSummary[];
	outletId: string;
	issuingEmployeeId: string | null;
};

export function CustomerCaseNotesTab({
	customerId,
	caseNotes,
	lineItems,
	customerHistory,
	outletId,
	issuingEmployeeId,
}: Props) {
	const router = useRouter();
	const [draft, setDraft] = useState("");
	const [editingFromHistoryId, setEditingFromHistoryId] = useState<
		string | null
	>(null);
	const [pendingEdit, setPendingEdit] = useState<{
		noteId: string;
		content: string;
	} | null>(null);
	const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
	const [mcDialogOpen, setMcDialogOpen] = useState(false);
	const [pending, startTransition] = useTransition();
	const [localNotes, setLocalNotes] =
		useState<CaseNoteWithContext[]>(caseNotes);
	const [toasts, setToasts] = useState<Toast[]>([]);

	useEffect(() => {
		setLocalNotes(caseNotes);
	}, [caseNotes]);

	const showToast = useCallback(
		(message: string, variant: Toast["variant"] = "default") => {
			const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			setToasts((prev) => [...prev, { id, message, variant }]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, 2000);
		},
		[],
	);

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	useEffect(() => {
		if (pendingEdit == null) return;
		if (draft.trim()) {
			setOverwriteConfirmOpen(true);
		} else {
			setDraft(pendingEdit.content);
			setEditingFromHistoryId(pendingEdit.noteId);
			setPendingEdit(null);
		}
	}, [pendingEdit]); // eslint-disable-line react-hooks/exhaustive-deps

	const refresh = () => startTransition(() => router.refresh());

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
					showToast("Note updated", "success");
					refresh();
				} catch (err) {
					showToast(
						err instanceof Error ? err.message : "Could not update note",
						"error",
					);
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
					employee_id: null,
					content,
				});
				showToast("Note saved", "success");
				refresh();
			} catch (err) {
				setLocalNotes((prev) => prev.filter((n) => n.id !== tempId));
				setDraft(content);
				showToast(
					err instanceof Error ? err.message : "Could not save note",
					"error",
				);
			}
		});
	};

	return (
		<div className="flex flex-col gap-4 lg:flex-row">
			<main className="flex min-w-0 flex-1 flex-col gap-4">
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
						<CaseNoteToolbar onOpenMc={() => setMcDialogOpen(true)} />
					</div>
					<textarea
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						rows={10}
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
			</main>

			<aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)] lg:w-[340px] lg:shrink-0">
				<HistoryPanel
					scope={{ kind: "customer", customerId }}
					caseNotes={localNotes}
					customerBillingHistory={lineItems}
					customerHistory={customerHistory}
					onToast={showToast}
					onEditNote={(noteId, content) =>
						setPendingEdit({ noteId, content })
					}
				/>
			</aside>

			<ConfirmDialog
				open={overwriteConfirmOpen}
				onOpenChange={(o) => {
					if (!o) {
						setOverwriteConfirmOpen(false);
						setPendingEdit(null);
					}
				}}
				title="Overwrite current draft?"
				description="The editor already has text. Loading this note will replace it."
				confirmLabel="Replace"
				onConfirm={() => {
					setDraft(pendingEdit?.content ?? "");
					setEditingFromHistoryId(pendingEdit?.noteId ?? null);
					setOverwriteConfirmOpen(false);
					setPendingEdit(null);
				}}
			/>

			<AddMcDialog
				open={mcDialogOpen}
				onClose={() => setMcDialogOpen(false)}
				appointmentId={null}
				customerId={customerId}
				outletId={outletId}
				issuingEmployeeId={issuingEmployeeId}
				defaultStartDate={new Date().toISOString().slice(0, 10)}
				onCreated={(result) => {
					showToast(`Medical certificate ${result.code} saved`, "success");
					refresh();
				}}
			/>

			<AppointmentToastStack toasts={toasts} onDismiss={dismissToast} />
		</div>
	);
}

function CaseNoteToolbar({ onOpenMc }: { onOpenMc: () => void }) {
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
			<ToolbarButton
				icon={FileBadge}
				label="Medical certificate"
				description="Issue an MC for this customer."
				onClick={onOpenMc}
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

function ToolbarButton({
	icon: Icon,
	label,
	description,
	onClick,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	description: string;
	onClick: () => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={label}
					onClick={onClick}
					className="flex size-8 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm transition hover:bg-blue-700"
				>
					<Icon className="size-4" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="top" className="max-w-xs items-start px-3 py-2">
				<div className="flex flex-col gap-1">
					<span className="font-semibold">{label}</span>
					<p className="text-[11px] leading-snug text-background/75">
						{description}
					</p>
				</div>
			</TooltipContent>
		</Tooltip>
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
