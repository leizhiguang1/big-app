"use client";

import { BellRing, Pencil, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import {
	ContextHeader,
	type ServiceChip,
	summarizeServices,
} from "@/components/appointments/detail/HistoryPanel";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	createFollowUpAction,
	deleteFollowUpAction,
	updateFollowUpAction,
} from "@/lib/actions/follow-ups";
import {
	FOLLOW_UP_REMINDER_METHODS,
	type FollowUpReminderMethod,
} from "@/lib/schemas/follow-ups";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { FollowUpWithRefs } from "@/lib/services/follow-ups";
import { cn } from "@/lib/utils";

type Props = {
	appointment: AppointmentWithRelations;
	followUps: FollowUpWithRefs[];
	allEmployees: EmployeeWithRelations[];
	outletCode: string | null;
	editingFollowUpId: string | null;
	onStartEdit: (id: string | null) => void;
	onToast: (message: string, variant?: Toast["variant"]) => void;
};

type FormState = {
	content: string;
	hasReminder: boolean;
	reminderDate: string;
	reminderMethod: FollowUpReminderMethod;
	reminderEmployeeId: string;
};

const EMPTY_FORM: FormState = {
	content: "",
	hasReminder: false,
	reminderDate: "",
	reminderMethod: "call",
	reminderEmployeeId: "",
};

function fromFollowUp(f: FollowUpWithRefs): FormState {
	return {
		content: f.content,
		hasReminder: f.has_reminder,
		reminderDate: f.reminder_date ?? "",
		reminderMethod: (f.reminder_method as FollowUpReminderMethod) ?? "call",
		reminderEmployeeId: f.reminder_employee_id ?? "",
	};
}

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

function authorLabel(f: FollowUpWithRefs): string {
	if (!f.author) return "—";
	return `${f.author.first_name} ${f.author.last_name}`.trim();
}

function reminderEmployeeLabel(
	f: FollowUpWithRefs,
	allEmployees: EmployeeWithRelations[],
): string | null {
	if (f.reminder_employee) {
		return `${f.reminder_employee.first_name} ${f.reminder_employee.last_name}`.trim();
	}
	if (!f.reminder_employee_id) return null;
	const e = allEmployees.find((x) => x.id === f.reminder_employee_id);
	return e ? `${e.first_name} ${e.last_name}`.trim() : null;
}

export function FollowUpTab({
	appointment,
	followUps,
	allEmployees,
	outletCode,
	editingFollowUpId,
	onStartEdit,
	onToast,
}: Props) {
	const router = useRouter();
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const isLead = !appointment.is_time_block && !appointment.customer_id;
	const isBlock = appointment.is_time_block;
	const customerId = appointment.customer_id;

	const editing = editingFollowUpId
		? (followUps.find((f) => f.id === editingFollowUpId) ?? null)
		: null;

	useEffect(() => {
		if (editing) setForm(fromFollowUp(editing));
		else setForm(EMPTY_FORM);
	}, [editing]);

	const refresh = () => router.refresh();

	const resetForm = () => {
		setForm(EMPTY_FORM);
		onStartEdit(null);
	};

	const buildPayload = () => {
		const content = form.content.trim();
		if (!content) return null;
		if (form.hasReminder) {
			if (!form.reminderDate) {
				onToast("Pick a reminder date", "error");
				return null;
			}
			return {
				content,
				has_reminder: true as const,
				reminder_date: form.reminderDate,
				reminder_method: form.reminderMethod,
				reminder_employee_id: form.reminderEmployeeId || null,
			};
		}
		return {
			content,
			has_reminder: false as const,
			reminder_date: null,
			reminder_method: null,
			reminder_employee_id: null,
		};
	};

	const handleCreate = () => {
		if (!customerId) return;
		const payload = buildPayload();
		if (!payload) return;
		startTransition(async () => {
			try {
				await createFollowUpAction(appointment.id, {
					appointment_id: appointment.id,
					customer_id: customerId,
					author_id: appointment.employee_id ?? null,
					...payload,
				});
				resetForm();
				onToast("Follow-up saved", "success");
				refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not save follow-up",
					"error",
				);
			}
		});
	};

	const handleUpdate = () => {
		if (!editing) return;
		const payload = buildPayload();
		if (!payload) return;
		startTransition(async () => {
			try {
				await updateFollowUpAction(appointment.id, editing.id, payload);
				resetForm();
				onToast("Follow-up updated", "success");
				refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not update follow-up",
					"error",
				);
			}
		});
	};

	const handleDelete = () => {
		if (!deleteId) return;
		const id = deleteId;
		startTransition(async () => {
			try {
				await deleteFollowUpAction(appointment.id, id);
				setDeleteId(null);
				if (editing?.id === id) resetForm();
				onToast("Follow-up deleted", "success");
				refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not delete follow-up",
					"error",
				);
			}
		});
	};

	if (isBlock) {
		return (
			<div className="rounded-md border bg-muted/20 p-6 text-center text-muted-foreground text-sm">
				Follow-ups don't apply to time blocks.
			</div>
		);
	}

	if (isLead) {
		return (
			<div className="rounded-md border bg-amber-50 p-6 text-center text-amber-900 text-sm">
				Register this walk-in lead as a customer to start recording follow-ups.
			</div>
		);
	}

	const onThisVisit = followUps.filter(
		(f) => f.appointment_id === appointment.id,
	);

	const canSubmit = form.content.trim().length > 0 && !pending;

	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-md border bg-card p-4">
				<div className="flex items-center justify-between">
					<div className="text-muted-foreground text-xs uppercase tracking-wide">
						{editing ? "Edit follow-up" : "New follow-up"}
					</div>
					{editing && (
						<button
							type="button"
							onClick={resetForm}
							className="text-muted-foreground text-xs hover:text-foreground"
						>
							Cancel edit
						</button>
					)}
				</div>
				<textarea
					value={form.content}
					onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
					rows={6}
					placeholder="Call back re: payment plan, remind about post-op care, schedule next cleaning…"
					className="mt-3 w-full resize-y rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
				/>

				<label className="mt-3 flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={form.hasReminder}
						onChange={(e) =>
							setForm((p) => ({ ...p, hasReminder: e.target.checked }))
						}
						className="size-4"
					/>
					<BellRing
						className={cn(
							"size-4",
							form.hasReminder ? "text-violet-600" : "text-muted-foreground",
						)}
					/>
					<span>Set a reminder</span>
				</label>

				{form.hasReminder && (
					<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
						<label className="flex flex-col gap-1 text-xs">
							<span className="text-muted-foreground">Date</span>
							<input
								type="date"
								value={form.reminderDate}
								onChange={(e) =>
									setForm((p) => ({ ...p, reminderDate: e.target.value }))
								}
								className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							/>
						</label>
						<label className="flex flex-col gap-1 text-xs">
							<span className="text-muted-foreground">Method</span>
							<select
								value={form.reminderMethod}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										reminderMethod: e.target.value as FollowUpReminderMethod,
									}))
								}
								className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								{FOLLOW_UP_REMINDER_METHODS.map((m) => (
									<option key={m} value={m}>
										{m === "call" ? "Call" : "WhatsApp"}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1 text-xs">
							<span className="text-muted-foreground">Employee</span>
							<select
								value={form.reminderEmployeeId}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										reminderEmployeeId: e.target.value,
									}))
								}
								className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								<option value="">Unassigned</option>
								{allEmployees.map((e) => (
									<option key={e.id} value={e.id}>
										{e.first_name} {e.last_name}
									</option>
								))}
							</select>
						</label>
					</div>
				)}

				<div className="mt-3 flex justify-end gap-2">
					<Button
						type="button"
						size="sm"
						onClick={editing ? handleUpdate : handleCreate}
						disabled={!canSubmit}
					>
						<Save className="size-3.5" />
						{editing ? "Save changes" : "Save follow-up"}
					</Button>
				</div>
			</div>

			<div className="rounded-md border bg-card p-4">
				<div className="text-muted-foreground text-xs uppercase tracking-wide">
					Follow-ups on this visit
				</div>
				<div className="mt-3 flex flex-col gap-3">
					{onThisVisit.length === 0 ? (
						<p className="text-muted-foreground text-sm italic">
							No follow-ups yet for this visit.
						</p>
					) : (
						onThisVisit.map((f) => (
							<FollowUpListRow
								key={f.id}
								followUp={f}
								isEditing={editing?.id === f.id}
								reminderEmployee={reminderEmployeeLabel(f, allEmployees)}
								bookingRef={appointment.booking_ref}
								outletCode={outletCode}
								appointmentDate={new Date(appointment.start_at)}
								serviceSummary={summarizeServices(appointment.line_items)}
								onEdit={() => onStartEdit(f.id)}
								onDelete={() => setDeleteId(f.id)}
							/>
						))
					)}
				</div>
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

function FollowUpListRow({
	followUp,
	isEditing,
	reminderEmployee,
	bookingRef,
	outletCode,
	appointmentDate,
	serviceSummary,
	onEdit,
	onDelete,
}: {
	followUp: FollowUpWithRefs;
	isEditing: boolean;
	reminderEmployee: string | null;
	bookingRef: string | null;
	outletCode: string | null;
	appointmentDate: Date | null;
	serviceSummary: ServiceChip[];
	onEdit: () => void;
	onDelete: () => void;
}) {
	const f = followUp;
	return (
		<div
			className={cn(
				"rounded border bg-background p-3 text-sm",
				isEditing && "border-amber-300 bg-amber-50/60",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="text-muted-foreground text-xs">
					{formatDateTime(new Date(f.created_at))} · {authorLabel(f)}
				</div>
				<div className="flex items-center gap-1">
					{!isEditing ? (
						<>
							<button
								type="button"
								onClick={onEdit}
								className="text-muted-foreground hover:text-foreground"
								aria-label="Edit follow-up"
							>
								<Pencil className="size-3.5" />
							</button>
							<button
								type="button"
								onClick={onDelete}
								className="text-muted-foreground hover:text-destructive"
								aria-label="Delete follow-up"
							>
								<Trash2 className="size-3.5" />
							</button>
						</>
					) : (
						<span className="rounded bg-amber-200/60 px-1.5 py-px font-semibold text-[10px] text-amber-900 uppercase tracking-wide">
							Editing above
						</span>
					)}
				</div>
			</div>
			<ContextHeader
				bookingRef={bookingRef}
				outletCode={outletCode}
				date={appointmentDate}
				serviceSummary={serviceSummary}
			/>
			<p className="mt-2 whitespace-pre-wrap">{f.content}</p>
			{f.has_reminder && f.reminder_date && (
				<div
					className={cn(
						"mt-2 inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px]",
						f.reminder_done
							? "border-emerald-200 bg-emerald-50 text-emerald-700"
							: "border-amber-200 bg-amber-50 text-amber-800",
					)}
				>
					<BellRing className="size-[11px]" />
					<span className="font-semibold capitalize">{f.reminder_method}</span>
					<span>· {new Date(f.reminder_date).toLocaleDateString()}</span>
					{reminderEmployee && <span>· {reminderEmployee}</span>}
					{f.reminder_done && <span>· done</span>}
				</div>
			)}
		</div>
	);
}
