"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Lock, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useAppointmentTagList } from "@/components/brand-config/AppointmentConfigProvider";
import { CustomerFormDialog } from "@/components/customers/CustomerForm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CancelAppointmentDialog } from "@/components/appointments/CancelAppointmentDialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	createAppointmentAction,
	updateAppointmentAction,
} from "@/lib/actions/appointments";
import { buildLeadPrefill } from "@/lib/appointments/lead-prefill";
import {
	APPOINTMENT_STATUS_CONFIG,
	APPOINTMENT_STATUSES,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";
import { isWindowCoveredByShifts } from "@/lib/roster/week";
import {
	type AppointmentInput,
	appointmentInputSchema,
	LEAD_SOURCE_LABEL,
	LEAD_SOURCES,
	type LeadSource,
} from "@/lib/schemas/appointments";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { Customer, CustomerWithRelations } from "@/lib/services/customers";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount, Room } from "@/lib/services/outlets";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
	"h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const DURATION_PRESETS_MIN = [
	5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 90, 120, 150, 180, 240,
] as const;
const DEFAULT_DURATION_MIN = 60;

function formatDurationLabel(mins: number): string {
	if (mins < 60) return `${mins} min`;
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function diffMinutes(startIso: string, endIso: string): number {
	const s = new Date(startIso).getTime();
	const e = new Date(endIso).getTime();
	if (!Number.isFinite(s) || !Number.isFinite(e)) return 0;
	return Math.round((e - s) / 60000);
}

function addMinutesIso(iso: string, mins: number): string {
	const d = new Date(iso);
	d.setMinutes(d.getMinutes() + mins);
	return d.toISOString();
}

type BookingMode = "appointment" | "block";

type Props = {
	open: boolean;
	onClose: () => void;
	outletId: string;
	appointment: AppointmentWithRelations | null;
	prefill: {
		startAt: string;
		endAt: string;
		employeeId: string | null;
		roomId: string | null;
		customerId?: string | null;
	} | null;
	customers: CustomerWithRelations[];
	employees: RosterEmployee[];
	rooms: Room[];
	allOutlets: OutletWithRoomCount[];
	allEmployees: EmployeeWithRelations[];
	shifts?: EmployeeShift[];
	hideBlockTab?: boolean;
	onSuccess?: () => void;
};

function isoToLocalInputValue(iso: string): string {
	const d = new Date(iso);
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	const hh = String(d.getHours()).padStart(2, "0");
	const mi = String(d.getMinutes()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function localInputToIso(local: string): string {
	if (!local) return "";
	const d = new Date(local);
	return d.toISOString();
}

function buildDefaults(args: {
	outletId: string;
	appointment: AppointmentWithRelations | null;
	prefill: Props["prefill"];
	rooms: Room[];
}): AppointmentInput {
	const defaultRoomId = args.rooms[0]?.id ?? null;
	const a = args.appointment;
	if (a) {
		return {
			customer_id: a.customer_id,
			employee_id: a.employee_id,
			outlet_id: a.outlet_id,
			room_id: a.room_id ?? (a.is_time_block ? null : defaultRoomId),
			start_at: a.start_at,
			end_at: a.end_at,
			status: (a.status as AppointmentInput["status"]) ?? "pending",
			payment_status:
				(a.payment_status as AppointmentInput["payment_status"]) ?? "unpaid",
			notes: a.notes ?? undefined,
			tags: a.tags ?? [],
			is_time_block: a.is_time_block,
			block_title: a.block_title ?? undefined,
			lead_name: a.lead_name ?? undefined,
			lead_phone: a.lead_phone ?? undefined,
			lead_source: (a.lead_source as LeadSource | null) ?? null,
			lead_attended_by_id: a.lead_attended_by_id,
		};
	}
	const now = new Date();
	const fallbackStart = new Date(now);
	fallbackStart.setMinutes(0, 0, 0);
	const fallbackEnd = new Date(fallbackStart);
	fallbackEnd.setMinutes(fallbackStart.getMinutes() + DEFAULT_DURATION_MIN);
	return {
		customer_id: args.prefill?.customerId ?? null,
		employee_id: args.prefill?.employeeId ?? null,
		outlet_id: args.outletId,
		room_id: args.prefill?.roomId ?? defaultRoomId,
		start_at: args.prefill?.startAt ?? fallbackStart.toISOString(),
		end_at: args.prefill?.endAt ?? fallbackEnd.toISOString(),
		status: "pending",
		payment_status: "unpaid",
		notes: undefined,
		tags: [],
		is_time_block: false,
		block_title: undefined,
		lead_name: undefined,
		lead_phone: undefined,
		lead_source: null,
		lead_attended_by_id: null,
	};
}

function computeInitialIsLead(a: AppointmentWithRelations | null): boolean {
	if (!a || a.is_time_block) return false;
	return !a.customer_id && !!a.lead_name;
}

export function AppointmentDialog({
	open,
	onClose,
	outletId,
	appointment,
	prefill,
	customers,
	employees,
	rooms,
	allOutlets,
	allEmployees,
	shifts = [],
	hideBlockTab = false,
	onSuccess,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [customerSearch, setCustomerSearch] = useState("");
	const [isLead, setIsLead] = useState<boolean>(
		computeInitialIsLead(appointment),
	);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [convertOpen, setConvertOpen] = useState(false);
	const [newCustomerOpen, setNewCustomerOpen] = useState(false);
	const [extraCustomers, setExtraCustomers] = useState<CustomerWithRelations[]>(
		[],
	);

	const allCustomers = useMemo(
		() => [...extraCustomers, ...customers],
		[extraCustomers, customers],
	);

	const form = useForm<AppointmentInput>({
		resolver: zodResolver(appointmentInputSchema),
		defaultValues: buildDefaults({ outletId, appointment, prefill, rooms }),
	});

	useEffect(() => {
		if (open) {
			form.reset(buildDefaults({ outletId, appointment, prefill, rooms }));
			setServerError(null);
			setCustomerSearch("");
			setPickerOpen(false);
			setIsLead(computeInitialIsLead(appointment));
			setConvertOpen(false);
		}
	}, [open, outletId, appointment, prefill, rooms, form]);

	const startAt = form.watch("start_at");
	const endAt = form.watch("end_at");
	const isBlock = form.watch("is_time_block");
	const customerId = form.watch("customer_id");
	const tags = form.watch("tags");
	const status = form.watch("status");
	const leadName = form.watch("lead_name");
	const leadPhone = form.watch("lead_phone");
	const leadSource = form.watch("lead_source");
	const leadAttendedById = form.watch("lead_attended_by_id");
	const errors = form.formState.errors;

	const bookingMode: BookingMode = isBlock ? "block" : "appointment";

	const availableEmployeeIds = useMemo(() => {
		const ids = new Set<string>();
		if (!startAt || !endAt) return ids;
		for (const emp of employees) {
			const empShifts = shifts.filter((s) => s.employee_id === emp.id);
			if (isWindowCoveredByShifts(empShifts, startAt, endAt)) {
				ids.add(emp.id);
			}
		}
		return ids;
	}, [employees, shifts, startAt, endAt]);

	const selectedEmployeeId = form.watch("employee_id");
	const employeeOptions = useMemo(() => {
		return employees
			.map((emp) => ({
				emp,
				available: availableEmployeeIds.has(emp.id),
			}))
			.filter(
				({ emp, available }) => available || emp.id === selectedEmployeeId,
			);
	}, [employees, availableEmployeeIds, selectedEmployeeId]);

	const setBookingMode = (mode: BookingMode) => {
		const next = mode === "block";
		form.setValue("is_time_block", next, { shouldDirty: true });
		if (next) {
			form.setValue("customer_id", null, { shouldDirty: true });
			form.setValue("lead_name", undefined, { shouldDirty: true });
			form.setValue("lead_phone", undefined, { shouldDirty: true });
			form.setValue("lead_source", null, { shouldDirty: true });
			form.setValue("lead_attended_by_id", null, { shouldDirty: true });
			setIsLead(false);
			setPickerOpen(false);
		} else {
			setIsLead(computeInitialIsLead(appointment));
		}
	};

	const handleToggleLead = (next: boolean) => {
		setIsLead(next);
		setPickerOpen(false);
		if (next) {
			form.setValue("customer_id", null, { shouldDirty: true });
			form.setValue("status", "pending", { shouldDirty: true });
			setCustomerSearch("");
			if (!form.getValues("lead_source")) {
				form.setValue("lead_source", "walk_in", { shouldDirty: true });
			}
		} else {
			form.setValue("lead_name", undefined, { shouldDirty: true });
			form.setValue("lead_phone", undefined, { shouldDirty: true });
			form.setValue("lead_source", null, { shouldDirty: true });
			form.setValue("lead_attended_by_id", null, { shouldDirty: true });
		}
	};

	const selectedCustomer =
		allCustomers.find((c) => c.id === customerId) ?? null;

	const filteredCustomers = useMemo(() => {
		const sorted = [...allCustomers].sort((a, b) =>
			`${a.first_name} ${a.last_name ?? ""}`.localeCompare(
				`${b.first_name} ${b.last_name ?? ""}`,
			),
		);
		const q = customerSearch.trim().toLowerCase();
		if (!q) return sorted.slice(0, 12);
		const qDigits = q.replace(/\D/g, "");
		return sorted
			.filter((c) => {
				const name = `${c.first_name} ${c.last_name ?? ""}`.toLowerCase();
				const phoneDigits = c.phone.replace(/\D/g, "");
				const idRaw = (c.id_number ?? "").toLowerCase();
				const idDigits = idRaw.replace(/\D/g, "");
				return (
					name.includes(q) ||
					c.code.toLowerCase().includes(q) ||
					(qDigits.length > 0 && phoneDigits.includes(qDigits)) ||
					(idRaw.length > 0 && idRaw.includes(q)) ||
					(qDigits.length > 0 &&
						idDigits.length > 0 &&
						idDigits.includes(qDigits))
				);
			})
			.slice(0, 12);
	}, [allCustomers, customerSearch]);

	const pickCustomer = (id: string) => {
		form.setValue("customer_id", id, { shouldDirty: true });
		setCustomerSearch("");
		setPickerOpen(false);
	};

	const clearCustomerSelection = () => {
		form.setValue("customer_id", null, { shouldDirty: true });
		setCustomerSearch("");
		setPickerOpen(true);
	};

	const formRef = useRef<HTMLFormElement>(null);

	const onSubmit = form.handleSubmit(
		(values) => {
			startTransition(async () => {
				try {
					if (appointment) {
						await updateAppointmentAction(appointment.id, values);
					} else {
						await createAppointmentAction(values);
					}
					onSuccess?.();
					onClose();
				} catch (err) {
					setServerError(
						err instanceof Error ? err.message : "Something went wrong",
					);
				}
			});
		},
		(errors) => {
			const firstKey = Object.keys(errors)[0];
			if (!firstKey || !formRef.current) return;
			const el = formRef.current.querySelector<HTMLElement>(
				`[name="${firstKey}"]`,
			);
			if (el) {
				el.scrollIntoView({ block: "center", behavior: "smooth" });
				el.focus({ preventScroll: true });
			}
		},
	);


	const selectTag = (key: string) => {
		const next = tags[0] === key ? [] : [key];
		form.setValue("tags", next, { shouldDirty: true });
	};

	const showRegisterLead =
		!!appointment &&
		!appointment.customer_id &&
		!appointment.is_time_block &&
		!!appointment.lead_name &&
		isLead;

	const canConvertLead =
		!!appointment &&
		!appointment.customer_id &&
		!appointment.is_time_block &&
		!!appointment.lead_name;

	const headerLabel = appointment
		? appointment.is_time_block
			? "Edit time block"
			: "Edit appointment"
		: isBlock
			? "New time block"
			: "New appointment";

	return (
		<>
			<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
				<DialogContent
					preventOutsideClose
					className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
				>
					<DialogHeader className="border-b px-5 py-3">
						<DialogTitle className="text-base">{headerLabel}</DialogTitle>
						<DialogDescription
							className={appointment?.booking_ref ? "text-xs" : "sr-only"}
						>
							{appointment?.booking_ref ?? "Fill in the details below"}
						</DialogDescription>
					</DialogHeader>

					<form
						ref={formRef}
						onSubmit={onSubmit}
						className="flex min-h-0 flex-1 flex-col"
					>
						<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
							{/* Booking mode tabs */}
							{!hideBlockTab && (
								<div className="grid grid-cols-2 overflow-hidden rounded-md border">
									{(
										[
											["appointment", "Appointment", CalendarDays],
											["block", "Time block", Lock],
										] as const
									).map(([mode, label, Icon]) => {
										const active = bookingMode === mode;
										return (
											<button
												key={mode}
												type="button"
												onClick={() => setBookingMode(mode)}
												className={cn(
													"inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition",
													active
														? "bg-primary text-primary-foreground shadow-inner"
														: "bg-muted/40 text-muted-foreground hover:bg-muted",
												)}
											>
												<Icon className="size-4" />
												{label}
											</button>
										);
									})}
								</div>
							)}

							{/* Customer or block title */}
							{isBlock ? (
								<Field
									label="Block title"
									error={errors.block_title?.message}
									required
								>
									<Input
										placeholder="Lunch, Team meeting…"
										{...form.register("block_title")}
									/>
								</Field>
							) : (
								<CustomerSection
									isLead={isLead}
									onToggleLead={handleToggleLead}
									customerError={errors.customer_id?.message}
									leadNameError={errors.lead_name?.message}
									leadPhoneError={errors.lead_phone?.message}
									leadSourceError={errors.lead_source?.message}
									leadAttendedByError={errors.lead_attended_by_id?.message}
									selectedCustomer={selectedCustomer}
									leadName={leadName ?? ""}
									leadPhone={leadPhone ?? ""}
									leadSource={leadSource ?? null}
									leadAttendedById={leadAttendedById ?? null}
									search={customerSearch}
									pickerOpen={pickerOpen}
									setPickerOpen={setPickerOpen}
									setSearch={setCustomerSearch}
									candidates={filteredCustomers}
									employees={employees}
									showRegisterLead={showRegisterLead}
									onPickCustomer={pickCustomer}
									onClear={clearCustomerSelection}
									onLeadNameChange={(v) =>
										form.setValue("lead_name", v || undefined, {
											shouldDirty: true,
										})
									}
									onLeadPhoneChange={(v) =>
										form.setValue("lead_phone", v || undefined, {
											shouldDirty: true,
										})
									}
									onLeadSourceChange={(v) =>
										form.setValue("lead_source", v, { shouldDirty: true })
									}
									onLeadAttendedByChange={(v) =>
										form.setValue("lead_attended_by_id", v, {
											shouldDirty: true,
										})
									}
									onRegister={() => setConvertOpen(true)}
									onNewCustomer={() => setNewCustomerOpen(true)}
								/>
							)}

							{/* Time */}
							{(() => {
								const durationMin =
									startAt && endAt ? diffMinutes(startAt, endAt) : 0;
								const isPreset = (
									DURATION_PRESETS_MIN as readonly number[]
								).includes(durationMin);
								return (
									<div className="grid grid-cols-3 gap-3">
										<Field
											label="Start"
											error={errors.start_at?.message}
											required
										>
											<Input
												type="datetime-local"
												value={startAt ? isoToLocalInputValue(startAt) : ""}
												onChange={(e) => {
													const iso = localInputToIso(e.target.value);
													form.setValue("start_at", iso, { shouldDirty: true });
													const keep =
														durationMin > 0
															? durationMin
															: DEFAULT_DURATION_MIN;
													form.setValue("end_at", addMinutesIso(iso, keep), {
														shouldDirty: true,
													});
												}}
											/>
										</Field>
										<Field label="Duration">
											<select
												className={SELECT_CLASS}
												value={isPreset ? String(durationMin) : "custom"}
												onChange={(e) => {
													if (e.target.value === "custom") return;
													const mins = Number(e.target.value);
													form.setValue(
														"end_at",
														addMinutesIso(startAt, mins),
														{ shouldDirty: true },
													);
												}}
											>
												{!isPreset && (
													<option value="custom">
														Custom ({formatDurationLabel(durationMin)})
													</option>
												)}
												{DURATION_PRESETS_MIN.map((m) => (
													<option key={m} value={m}>
														{formatDurationLabel(m)}
													</option>
												))}
											</select>
										</Field>
										<Field label="End" error={errors.end_at?.message} required>
											<Input
												type="datetime-local"
												value={endAt ? isoToLocalInputValue(endAt) : ""}
												onChange={(e) =>
													form.setValue(
														"end_at",
														localInputToIso(e.target.value),
														{ shouldDirty: true },
													)
												}
											/>
										</Field>
									</div>
								);
							})()}

							{/* Resources */}
							<div className="grid grid-cols-2 gap-3">
								<Field label="Employee">
									<select
										className={SELECT_CLASS}
										value={form.watch("employee_id") ?? ""}
										onChange={(e) =>
											form.setValue("employee_id", e.target.value || null, {
												shouldDirty: true,
											})
										}
									>
										<option value="">— Unassigned —</option>
										{employeeOptions.map(({ emp, available }) => (
											<option key={emp.id} value={emp.id}>
												{emp.first_name} {emp.last_name}
												{available ? "" : " (not rostered)"}
											</option>
										))}
									</select>
								</Field>
								<Field label="Room">
									<select
										className={SELECT_CLASS}
										value={form.watch("room_id") ?? ""}
										onChange={(e) =>
											form.setValue("room_id", e.target.value || null, {
												shouldDirty: true,
											})
										}
										disabled={rooms.length === 0}
									>
										{rooms.length === 0 ? (
											<option value="">No rooms — add one in Outlets</option>
										) : (
											<>
												{isBlock && <option value="">— Unassigned —</option>}
												{rooms.map((r) => (
													<option key={r.id} value={r.id}>
														{r.name}
													</option>
												))}
											</>
										)}
									</select>
								</Field>
							</div>

							{!isBlock && (
								<>
									{/* Status — hidden for leads (they default to pending until
									    converted). 'completed' is excluded here in any case — it
									    only happens via Mark Complete FAB / Collect Payment RPC.
									    See docs/modules/02-appointments.md. */}
									{!isLead && (
										<Field label="Status">
											<div className="flex flex-wrap gap-1.5">
												{APPOINTMENT_STATUSES.filter(
													(s) => s !== "completed",
												).map((s) => (
													<StatusButton
														key={s}
														status={s}
														active={status === s}
														onClick={() =>
															form.setValue("status", s, {
																shouldDirty: true,
															})
														}
													/>
												))}
											</div>
										</Field>
									)}

									{/* Tag (single-select) */}
									<Field label="Tag">
										<TagPicker activeCode={tags[0]} onSelect={selectTag} />
									</Field>
								</>
							)}

							{/* Notes */}
							<Field label="Notes">
								<textarea
									rows={3}
									className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
									{...form.register("notes")}
								/>
							</Field>
						</div>

						<DialogFooter className="flex flex-col gap-2 border-t bg-muted/20 px-4 py-3 sm:flex-col sm:items-stretch">
							{(() => {
								const messages = Object.values(form.formState.errors)
									.map((e) => (e as { message?: string })?.message)
									.filter((m): m is string => !!m);
								if (!serverError && messages.length === 0) return null;
								return (
									<div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">
										{serverError ?? `Please fix: ${messages.join(" • ")}`}
									</div>
								);
							})()}
							<div className="flex items-center justify-between gap-2">
								<div>
									{appointment && (
										<Button
											type="button"
											variant="destructive"
											size="sm"
											onClick={() => setConfirmOpen(true)}
											disabled={pending}
										>
											<Trash2 className="size-4" />
											Cancel appointment
										</Button>
									)}
								</div>
								<div className="flex gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={onClose}
									>
										Cancel
									</Button>
									<Button type="submit" size="sm" disabled={pending}>
										{pending
											? "Saving…"
											: appointment
												? "Save changes"
												: isBlock
													? "Block slot"
													: "Create"}
									</Button>
								</div>
							</div>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{appointment && (
				<CancelAppointmentDialog
					open={confirmOpen}
					onOpenChange={setConfirmOpen}
					appointmentId={appointment.id}
					bookingRef={appointment.booking_ref ?? undefined}
					onSuccess={() => {
						setConfirmOpen(false);
						onClose();
					}}
				/>
			)}

			<CustomerFormDialog
				open={newCustomerOpen}
				customer={null}
				outlets={allOutlets}
				employees={allEmployees}
				defaultConsultantId={allEmployees[0]?.id ?? null}
				onClose={() => setNewCustomerOpen(false)}
				onCreated={(created) => {
					const entry: CustomerWithRelations = {
						...(created as Customer),
						home_outlet: null,
						consultant: null,
					};
					setExtraCustomers((prev) => [entry, ...prev]);
					form.setValue("customer_id", created.id, { shouldDirty: true });
					form.setValue("lead_name", undefined, { shouldDirty: true });
					form.setValue("lead_phone", undefined, { shouldDirty: true });
					form.setValue("lead_source", null, { shouldDirty: true });
					form.setValue("lead_attended_by_id", null, { shouldDirty: true });
					setIsLead(false);
					setCustomerSearch("");
					setPickerOpen(false);
				}}
			/>

			{convertOpen && appointment && canConvertLead && (
				<CustomerFormDialog
					open={convertOpen}
					customer={null}
					outlets={allOutlets}
					employees={allEmployees}
					defaultConsultantId={
						leadAttendedById ??
						appointment.employee_id ??
						allEmployees[0]?.id ??
						null
					}
					leadContext={{
						appointmentId: appointment.id,
						prefill: buildLeadPrefill({
							leadName,
							leadPhone,
							leadSource,
							leadAttendedById,
							outletId: appointment.outlet_id,
							fallbackConsultantId:
								appointment.employee_id ?? allEmployees[0]?.id ?? null,
						}),
					}}
					onClose={() => setConvertOpen(false)}
					onCreated={(created) => {
						const entry: CustomerWithRelations = {
							...(created as Customer),
							home_outlet: null,
							consultant: null,
						};
						setExtraCustomers((prev) => [entry, ...prev]);
						form.setValue("customer_id", created.id, { shouldDirty: true });
						form.setValue("lead_name", undefined, { shouldDirty: true });
						form.setValue("lead_phone", undefined, { shouldDirty: true });
						form.setValue("lead_source", null, { shouldDirty: true });
						form.setValue("lead_attended_by_id", null, { shouldDirty: true });
						setIsLead(false);
						setConvertOpen(false);
					}}
				/>
			)}
		</>
	);
}

// ─── Customer section ──────────────────────────────────────────────────────

function CustomerSection({
	isLead,
	onToggleLead,
	customerError,
	leadNameError,
	leadPhoneError,
	leadSourceError,
	leadAttendedByError,
	selectedCustomer,
	leadName,
	leadPhone,
	leadSource,
	leadAttendedById,
	search,
	pickerOpen,
	setPickerOpen,
	setSearch,
	candidates,
	employees,
	showRegisterLead,
	onPickCustomer,
	onClear,
	onLeadNameChange,
	onLeadPhoneChange,
	onLeadSourceChange,
	onLeadAttendedByChange,
	onRegister,
	onNewCustomer,
}: {
	isLead: boolean;
	onToggleLead: (v: boolean) => void;
	customerError?: string;
	leadNameError?: string;
	leadPhoneError?: string;
	leadSourceError?: string;
	leadAttendedByError?: string;
	selectedCustomer: CustomerWithRelations | null;
	leadName: string;
	leadPhone: string;
	leadSource: LeadSource | null;
	leadAttendedById: string | null;
	search: string;
	pickerOpen: boolean;
	setPickerOpen: (v: boolean) => void;
	setSearch: (v: string) => void;
	candidates: CustomerWithRelations[];
	employees: RosterEmployee[];
	showRegisterLead: boolean;
	onPickCustomer: (id: string) => void;
	onClear: () => void;
	onLeadNameChange: (v: string) => void;
	onLeadPhoneChange: (v: string) => void;
	onLeadSourceChange: (v: LeadSource) => void;
	onLeadAttendedByChange: (v: string | null) => void;
	onRegister: () => void;
	onNewCustomer: () => void;
}) {
	return (
		<div className="flex flex-col gap-3">
			<label
				htmlFor="appointment-is-lead"
				className={cn(
					"flex w-fit cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition",
					isLead
						? "border-amber-300 bg-amber-50 text-amber-900"
						: "border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-muted/40",
				)}
			>
				<Checkbox
					id="appointment-is-lead"
					checked={isLead}
					onCheckedChange={(v) => onToggleLead(v === true)}
				/>
				<span className="font-medium">This is a walk-in lead</span>
				<span className="text-[11px] opacity-80">(no customer record yet)</span>
			</label>

			{isLead ? (
				<div className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50/40 p-3">
					<Field label="Lead name" required error={leadNameError}>
						<Input
							placeholder="Walk-in customer name"
							value={leadName}
							onChange={(e) => onLeadNameChange(e.target.value)}
						/>
					</Field>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<Field label="Contact number" required error={leadPhoneError}>
							<Input
								type="tel"
								placeholder="+60 12-345 6789"
								value={leadPhone}
								onChange={(e) =>
									onLeadPhoneChange(e.target.value.replace(/[^0-9+\- ]/g, ""))
								}
							/>
						</Field>
						<Field label="Source" required error={leadSourceError}>
							<select
								className={SELECT_CLASS}
								value={leadSource ?? ""}
								onChange={(e) =>
									onLeadSourceChange(e.target.value as LeadSource)
								}
							>
								<option value="">Please choose…</option>
								{LEAD_SOURCES.map((s) => (
									<option key={s} value={s}>
										{LEAD_SOURCE_LABEL[s]}
									</option>
								))}
							</select>
						</Field>
					</div>
					<Field label="Lead attended by" required error={leadAttendedByError}>
						<select
							className={SELECT_CLASS}
							value={leadAttendedById ?? ""}
							onChange={(e) => onLeadAttendedByChange(e.target.value || null)}
						>
							<option value="">Please choose…</option>
							{employees.map((e) => (
								<option key={e.id} value={e.id}>
									{e.first_name} {e.last_name}
								</option>
							))}
						</select>
					</Field>
					{showRegisterLead && (
						<button
							type="button"
							onClick={onRegister}
							className="group mt-1 inline-flex w-full items-center justify-between gap-3 rounded-md border border-emerald-500 bg-emerald-600 px-4 py-3 text-left text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
						>
							<span className="flex items-center gap-2.5">
								<UserPlus className="size-4" />
								<span className="flex flex-col">
									<span>Register as Customer</span>
									<span className="font-normal text-[11px] text-emerald-50/90">
										Convert this walk-in lead into a permanent record
									</span>
								</span>
							</span>
							<span
								aria-hidden
								className="text-lg leading-none transition-transform group-hover:translate-x-0.5"
							>
								→
							</span>
						</button>
					)}
				</div>
			) : selectedCustomer ? (
				<Field label="Customer" required>
					<div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
						<div className="flex flex-col">
							<span className="font-medium">
								{selectedCustomer.first_name} {selectedCustomer.last_name ?? ""}
							</span>
							<span className="text-muted-foreground text-xs">
								{selectedCustomer.code} · {selectedCustomer.phone}
							</span>
						</div>
						<Button type="button" variant="ghost" size="sm" onClick={onClear}>
							Change
						</Button>
					</div>
				</Field>
			) : (
				<Field label="Customer" required error={customerError}>
					<div className="flex items-start gap-2">
						<div className="relative flex-1">
							<Input
								type="search"
								autoComplete="off"
								placeholder="Search customer by name, code, phone or IC…"
								value={search}
								onFocus={() => setPickerOpen(true)}
								onBlur={() => setPickerOpen(false)}
								onChange={(e) => {
									setSearch(e.target.value);
									setPickerOpen(true);
								}}
							/>
							{pickerOpen && candidates.length > 0 && (
								<div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover shadow-lg">
									{candidates.map((c) => (
										<button
											key={c.id}
											type="button"
											onMouseDown={(e) => e.preventDefault()}
											onClick={() => onPickCustomer(c.id)}
											className="flex w-full flex-col items-start border-b px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-muted"
										>
											<span className="font-medium">
												{c.first_name} {c.last_name ?? ""}
											</span>
											<span className="text-muted-foreground text-xs">
												{c.code} · {c.phone}
											</span>
										</button>
									))}
								</div>
							)}
							{pickerOpen && search.trim() && candidates.length === 0 && (
								<div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-md border bg-popover p-3 text-muted-foreground text-xs shadow-lg">
									No matches. Tick &ldquo;walk-in lead&rdquo; above, or click{" "}
									<span className="font-semibold text-emerald-700">New</span> to
									create a customer.
								</div>
							)}
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="shrink-0 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
							onMouseDown={(e) => e.preventDefault()}
							onClick={onNewCustomer}
						>
							<UserPlus className="size-3.5" />
							New
						</Button>
					</div>
				</Field>
			)}
		</div>
	);
}

function Field({
	label,
	required,
	error,
	children,
}: {
	label: string;
	required?: boolean;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
				{label}
				{required && <span className="ml-0.5 text-destructive">*</span>}
			</span>
			{children}
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
}

function StatusButton({
	status,
	active,
	onClick,
}: {
	status: AppointmentStatus;
	active: boolean;
	onClick: () => void;
}) {
	const cfg = APPOINTMENT_STATUS_CONFIG[status];
	const Icon = cfg.Icon;
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition",
				active ? cfg.badge : "bg-muted text-muted-foreground hover:bg-muted/80",
			)}
		>
			<Icon className="size-3.5" />
			{cfg.label}
		</button>
	);
}

function TagPicker({
	activeCode,
	onSelect,
}: {
	activeCode: string | undefined;
	onSelect: (code: string) => void;
}) {
	const tags = useAppointmentTagList();
	return (
		<div className="flex flex-wrap gap-1.5">
			{tags.map(({ code, config }) => {
				const active = activeCode === code;
				return (
					<button
						key={code}
						type="button"
						onClick={() => onSelect(code)}
						className={cn(
							"inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition",
							active
								? "border-transparent text-zinc-900"
								: "border-muted text-muted-foreground hover:bg-muted/60",
						)}
						style={active ? { backgroundColor: config.bg } : undefined}
					>
						<span
							className="inline-block size-2 rounded-full"
							style={{ backgroundColor: config.dot }}
						/>
						{config.label}
					</button>
				);
			})}
		</div>
	);
}
