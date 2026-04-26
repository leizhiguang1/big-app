"use client";

import { BellRing, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
	AppointmentToastStack,
	type Toast,
} from "@/components/appointments/AppointmentToastStack";
import { FollowUpHistoryPanel } from "@/components/appointments/detail/HistoryPanel";
import { Button } from "@/components/ui/button";
import {
	createCustomerFollowUpAction,
	updateCustomerFollowUpAction,
} from "@/lib/actions/follow-ups";
import {
	FOLLOW_UP_REMINDER_METHODS,
	type FollowUpReminderMethod,
} from "@/lib/schemas/follow-ups";
import type { CustomerLineItem } from "@/lib/services/appointment-line-items";
import type { CustomerAppointmentSummary } from "@/lib/services/appointments";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { FollowUpWithRefs } from "@/lib/services/follow-ups";
import { cn } from "@/lib/utils";

type Props = {
	customerId: string;
	followUps: FollowUpWithRefs[];
	customerHistory: CustomerAppointmentSummary[];
	lineItems: CustomerLineItem[];
	allEmployees: EmployeeWithRelations[];
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

export function CustomerFollowUpsTab({
	customerId,
	followUps,
	customerHistory,
	lineItems,
	allEmployees,
}: Props) {
	const router = useRouter();
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const [toasts, setToasts] = useState<Toast[]>([]);

	const editing = editingId
		? (followUps.find((f) => f.id === editingId) ?? null)
		: null;

	useEffect(() => {
		if (editing) setForm(fromFollowUp(editing));
		else setForm(EMPTY_FORM);
	}, [editing]);

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

	const refresh = () => startTransition(() => router.refresh());

	const resetForm = () => {
		setForm(EMPTY_FORM);
		setEditingId(null);
	};

	const buildPayload = () => {
		const content = form.content.trim();
		if (!content) return null;
		if (form.hasReminder) {
			if (!form.reminderDate) {
				showToast("Pick a reminder date", "error");
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
		const payload = buildPayload();
		if (!payload) return;
		startTransition(async () => {
			try {
				await createCustomerFollowUpAction(customerId, {
					appointment_id: null,
					customer_id: customerId,
					author_id: null,
					...payload,
				});
				resetForm();
				showToast("Follow-up saved", "success");
				refresh();
			} catch (err) {
				showToast(
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
				await updateCustomerFollowUpAction(customerId, editing.id, payload);
				resetForm();
				showToast("Follow-up updated", "success");
				refresh();
			} catch (err) {
				showToast(
					err instanceof Error ? err.message : "Could not update follow-up",
					"error",
				);
			}
		});
	};

	const canSubmit = form.content.trim().length > 0 && !pending;

	return (
		<div className="flex flex-col gap-4 lg:flex-row">
			<main className="flex min-w-0 flex-1 flex-col gap-4">
				<div
					className={cn(
						"rounded-md border bg-card p-4",
						editing && "border-amber-300 bg-amber-50/30",
					)}
				>
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
						onChange={(e) =>
							setForm((p) => ({ ...p, content: e.target.value }))
						}
						rows={8}
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
			</main>

			<aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)] lg:w-[340px] lg:shrink-0">
				<FollowUpHistoryPanel
					scope={{ kind: "customer", customerId }}
					followUps={followUps}
					customerHistory={customerHistory}
					customerBillingHistory={lineItems}
					onToast={showToast}
					onEdit={(f) => setEditingId(f.id)}
				/>
			</aside>

			<AppointmentToastStack toasts={toasts} onDismiss={dismissToast} />
		</div>
	);
}
