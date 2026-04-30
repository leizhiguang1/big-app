"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useOptimistic,
	useState,
	useTransition,
} from "react";
import { AppointmentContextMenu } from "@/components/appointments/AppointmentContextMenu";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import {
	AppointmentToastStack,
	type Toast,
} from "@/components/appointments/AppointmentToastStack";
import { CancelAppointmentDialog } from "@/components/appointments/CancelAppointmentDialog";
import { DayView } from "@/components/appointments/DayView";
import { GridView } from "@/components/appointments/GridView";
import { ListView } from "@/components/appointments/ListView";
import { MonthView } from "@/components/appointments/MonthView";
import { ResourceFilterNotice } from "@/components/appointments/ResourceFilterNotice";
import { WeekView } from "@/components/appointments/WeekView";
import { useAppointmentNotifications } from "@/components/notifications/AppointmentNotificationsProvider";
import { CreateButton } from "@/components/ui/create-button";
import { useOutletPath } from "@/hooks/use-outlet-path";
import {
	rescheduleAppointmentAction,
	setAppointmentStatusAction,
} from "@/lib/actions/appointments";
import type { ColumnKey } from "@/lib/appointments/columns";
import {
	buildLocalIso,
	type DisplayStyle,
	type TimeScope,
} from "@/lib/calendar/layout";
import { APPOINTMENT_STATUS_NOTIFICATIONS } from "@/lib/constants/appointment-notifications";
import {
	APPOINTMENT_STATUS_CONFIG,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";
import {
	addDays,
	findNextRosteredDate,
	fmtDate,
	getWeekStart,
	isWindowCoveredByShifts,
	parseDate,
	shiftCoversDate,
} from "@/lib/roster/week";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount, Room } from "@/lib/services/outlets";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { ResourceFilter } from "./AppointmentsFilterBar";

const DEFAULT_CREATE_DURATION_MIN = 15;

type Props = {
	display: DisplayStyle;
	scope: TimeScope;
	resource: ResourceFilter;
	dateStr: string;
	weekStart: string;
	outletId: string;
	appointments: AppointmentWithRelations[];
	customers: CustomerWithRelations[];
	employees: RosterEmployee[];
	rooms: Room[];
	services: ServiceWithCategory[];
	allOutlets: OutletWithRoomCount[];
	allEmployees: EmployeeWithRelations[];
	shifts: EmployeeShift[];
	columnOrder: ColumnKey[];
	visibleColumns: ColumnKey[];
	onDrillInToDay: (dateStr: string) => void;
};

type DialogState =
	| { kind: "edit"; appointment: AppointmentWithRelations }
	| {
			kind: "create";
			startAt: string;
			endAt: string;
			employeeId: string | null;
			roomId: string | null;
	  }
	| null;

type ContextState = {
	x: number;
	y: number;
	appointment: AppointmentWithRelations;
} | null;

export function AppointmentsCalendar({
	display,
	scope,
	resource,
	dateStr,
	weekStart,
	outletId,
	appointments,
	customers,
	employees,
	rooms,
	services,
	allOutlets,
	allEmployees,
	shifts,
	columnOrder,
	visibleColumns,
	onDrillInToDay,
}: Props) {
	const [dialog, setDialog] = useState<DialogState>(null);
	const [contextMenu, setContextMenu] = useState<ContextState>(null);
	const [toasts, setToasts] = useState<Toast[]>([]);
	const [cancelTarget, setCancelTarget] =
		useState<AppointmentWithRelations | null>(null);
	const router = useRouter();
	const path = useOutletPath();
	const { showStatusToast, suppressNextRealtime } =
		useAppointmentNotifications();

	useEffect(() => {
		document.body.classList.remove("dragging-appt");
		const clear = () => document.body.classList.remove("dragging-appt");
		window.addEventListener("pointerup", clear, true);
		window.addEventListener("dragend", clear, true);
		window.addEventListener("drop", clear, true);
		return () => {
			window.removeEventListener("pointerup", clear, true);
			window.removeEventListener("dragend", clear, true);
			window.removeEventListener("drop", clear, true);
			clear();
		};
	}, []);
	const searchParams = useSearchParams();
	const [isStatusPending, startTransition] = useTransition();

	type OptimisticPatch =
		| { kind: "status"; id: string; status: AppointmentStatus }
		| {
				kind: "reschedule";
				id: string;
				start_at: string;
				end_at: string;
				employee_id?: string | null;
				room_id?: string | null;
		  };

	const [optimisticAppointments, applyOptimistic] = useOptimistic<
		AppointmentWithRelations[],
		OptimisticPatch
	>(appointments, (current, patch) =>
		current.map((a) => {
			if (a.id !== patch.id) return a;
			if (patch.kind === "status") return { ...a, status: patch.status };
			return {
				...a,
				start_at: patch.start_at,
				end_at: patch.end_at,
				...(patch.employee_id !== undefined
					? { employee_id: patch.employee_id }
					: {}),
				...(patch.room_id !== undefined ? { room_id: patch.room_id } : {}),
			};
		}),
	);

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

	const viewRange = useMemo(() => {
		const date = parseDate(dateStr);
		if (display === "calendar" && scope === "month") {
			const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
			const gridStart = getWeekStart(firstOfMonth);
			return {
				from: gridStart.getTime(),
				to: addDays(gridStart, 42).getTime(),
			};
		}
		if (scope === "week") {
			const start = getWeekStart(date);
			return { from: start.getTime(), to: addDays(start, 7).getTime() };
		}
		// day
		const start = new Date(date);
		start.setHours(0, 0, 0, 0);
		return { from: start.getTime(), to: addDays(start, 1).getTime() };
	}, [display, scope, dateStr]);

	const viewAppointments = useMemo(() => {
		return optimisticAppointments.filter((a) => {
			const t = new Date(a.start_at).getTime();
			return t >= viewRange.from && t < viewRange.to;
		});
	}, [optimisticAppointments, viewRange]);

	const searchQuery = searchParams.get("q") ?? "";
	const filteredAppointments = useMemo(() => {
		if (!searchQuery.trim()) return viewAppointments;
		const q = searchQuery.toLowerCase();
		return viewAppointments.filter((a) => {
			if (a.is_time_block) return a.block_title?.toLowerCase().includes(q);
			const name = a.customer
				? `${a.customer.first_name} ${a.customer.last_name ?? ""}`.toLowerCase()
				: (a.lead_name ?? "").toLowerCase();
			const phone = a.customer?.phone ?? a.lead_phone ?? "";
			const ref = (a.booking_ref ?? "").toLowerCase();
			const emp = a.employee
				? `${a.employee.first_name} ${a.employee.last_name}`.toLowerCase()
				: "";
			return (
				name.includes(q) ||
				ref.includes(q) ||
				emp.includes(q) ||
				phone.includes(q)
			);
		});
	}, [viewAppointments, searchQuery]);

	const openCreateAt = (args: {
		dateStr: string;
		hour: number;
		minute: number;
		durationMinutes?: number;
		employeeId?: string | null;
		roomId?: string | null;
	}) => {
		const startIso = buildLocalIso(args.dateStr, args.hour, args.minute);
		const end = new Date(startIso);
		end.setMinutes(
			end.getMinutes() + (args.durationMinutes ?? DEFAULT_CREATE_DURATION_MIN),
		);
		setDialog({
			kind: "create",
			startAt: startIso,
			endAt: end.toISOString(),
			employeeId: args.employeeId ?? null,
			roomId: args.roomId ?? null,
		});
	};

	const navigateToDay = (next: string) => {
		onDrillInToDay(next);
		const params = new URLSearchParams(searchParams.toString());
		params.set("date", next);
		startTransition(() =>
			router.push(path(`/appointments?${params.toString()}`)),
		);
	};

	const jumpToDate = (next: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("date", next);
		startTransition(() =>
			router.push(path(`/appointments?${params.toString()}`)),
		);
	};

	const clearResourceFilter = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("resource");
		params.delete("eid");
		params.delete("rid");
		const qs = params.toString();
		startTransition(() =>
			router.push(qs ? path(`/appointments?${qs}`) : path("/appointments")),
		);
	};

	const filterEmployeeName = useMemo(() => {
		if (resource.mode !== "employee" || !resource.value) return null;
		const e = employees.find((emp) => emp.id === resource.value);
		return e ? `${e.first_name} ${e.last_name}` : null;
	}, [resource, employees]);

	const offRosterFilter = useMemo(() => {
		if (resource.mode !== "employee" || !resource.value) return null;
		const emp = employees.find((e) => e.id === resource.value);
		if (!emp) return null;
		const empShifts = shifts.filter((s) => s.employee_id === resource.value);
		const date = parseDate(dateStr);
		const scopeDates: string[] = [];
		if (scope === "day") {
			scopeDates.push(dateStr);
		} else if (scope === "week") {
			const start = getWeekStart(date);
			for (let i = 0; i < 7; i++) {
				scopeDates.push(fmtDate(addDays(start, i)));
			}
		} else {
			const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
			const gridStart = getWeekStart(firstOfMonth);
			for (let i = 0; i < 42; i++) {
				scopeDates.push(fmtDate(addDays(gridStart, i)));
			}
		}
		const rostered = scopeDates.some((d) =>
			empShifts.some((s) => shiftCoversDate(s, d)),
		);
		if (rostered) return null;
		const lastInScope = scopeDates[scopeDates.length - 1];
		const searchFrom = fmtDate(addDays(parseDate(lastInScope), 1));
		const next = findNextRosteredDate(empShifts, searchFrom);
		return {
			employeeName: `${emp.first_name} ${emp.last_name}`,
			nextRosteredDate: next,
		};
	}, [resource, employees, shifts, scope, dateStr]);

	const handleContextMenu = useCallback(
		(e: React.MouseEvent, a: AppointmentWithRelations) => {
			setContextMenu({ x: e.clientX, y: e.clientY, appointment: a });
		},
		[],
	);

	const handleSetStatus = (
		a: AppointmentWithRelations,
		status: AppointmentStatus,
	) => {
		if (isStatusPending) return;
		suppressNextRealtime(a.id);
		const notif = APPOINTMENT_STATUS_NOTIFICATIONS[status];
		if (notif.enabled) {
			showStatusToast(
				{
					customerName: a.customer
						? `${a.customer.first_name} ${a.customer.last_name ?? ""}`.trim()
						: (a.lead_name ?? "Customer"),
					employeeName: a.employee
						? `${a.employee.first_name} ${a.employee.last_name}`.trim()
						: null,
					roomName: a.room?.name ?? null,
				},
				status,
			);
		}
		startTransition(async () => {
			applyOptimistic({ kind: "status", id: a.id, status });
			try {
				await setAppointmentStatusAction(a.id, { status });
				if (!notif.enabled) {
					showToast(
						`Marked ${APPOINTMENT_STATUS_CONFIG[status].label}`,
						"success",
					);
				}
			} catch (err) {
				showToast(
					err instanceof Error ? err.message : "Status update failed",
					"error",
				);
			}
		});
	};

	const handleReschedule = (
		id: string,
		target: {
			dateStr: string;
			hour: number;
			minute: number;
			employeeId?: string | null;
			roomId?: string | null;
		},
	) => {
		const apt = optimisticAppointments.find((a) => a.id === id);
		if (!apt) return;
		const startIso = buildLocalIso(target.dateStr, target.hour, target.minute);
		const durationMs =
			new Date(apt.end_at).getTime() - new Date(apt.start_at).getTime();
		const endIso = new Date(
			new Date(startIso).getTime() + durationMs,
		).toISOString();
		if (
			apt.start_at === startIso &&
			apt.end_at === endIso &&
			(target.employeeId === undefined ||
				target.employeeId === apt.employee_id) &&
			(target.roomId === undefined || target.roomId === apt.room_id)
		) {
			return;
		}
		const input: Record<string, unknown> = {
			start_at: startIso,
			end_at: endIso,
		};
		if (target.employeeId !== undefined) input.employee_id = target.employeeId;
		if (target.roomId !== undefined) input.room_id = target.roomId;
		startTransition(async () => {
			applyOptimistic({
				kind: "reschedule",
				id,
				start_at: startIso,
				end_at: endIso,
				...(target.employeeId !== undefined
					? { employee_id: target.employeeId }
					: {}),
				...(target.roomId !== undefined ? { room_id: target.roomId } : {}),
			});
			try {
				await rescheduleAppointmentAction(id, input);
				const nextEmployeeId =
					target.employeeId !== undefined ? target.employeeId : apt.employee_id;
				if (nextEmployeeId) {
					const empShifts = shifts.filter(
						(s) => s.employee_id === nextEmployeeId,
					);
					if (!isWindowCoveredByShifts(empShifts, startIso, endIso)) {
						const emp = employees.find((e) => e.id === nextEmployeeId);
						const name = emp
							? `${emp.first_name} ${emp.last_name}`.trim()
							: "Employee";
						showToast(`Rescheduled — ${name} is not rostered for this time.`);
					} else {
						showToast("Rescheduled", "success");
					}
				} else {
					showToast("Rescheduled", "success");
				}
			} catch (err) {
				showToast(
					err instanceof Error ? err.message : "Reschedule failed",
					"error",
				);
			}
		});
	};

	const handleResize = (id: string, endIso: string) => {
		const apt = optimisticAppointments.find((a) => a.id === id);
		if (!apt || apt.end_at === endIso) return;
		startTransition(async () => {
			applyOptimistic({
				kind: "reschedule",
				id,
				start_at: apt.start_at,
				end_at: endIso,
			});
			try {
				await rescheduleAppointmentAction(id, {
					start_at: apt.start_at,
					end_at: endIso,
				});
				showToast("Duration updated", "success");
			} catch (err) {
				showToast(
					err instanceof Error ? err.message : "Resize failed",
					"error",
				);
			}
		});
	};

	const handleDelete = (a: AppointmentWithRelations) => {
		setCancelTarget(a);
	};

	const renderView = () => {
		if (display === "list") {
			return (
				<ListView
					appointments={filteredAppointments}
					columnOrder={columnOrder}
					visibleColumns={visibleColumns}
					filterEmployeeName={filterEmployeeName}
					onClearFilter={clearResourceFilter}
					onAppointmentClick={(a) =>
						router.push(path(`/appointments/${a.booking_ref}`))
					}
					onAppointmentContextMenu={handleContextMenu}
				/>
			);
		}
		if (display === "grid") {
			return (
				<GridView
					scope={scope === "month" ? "week" : scope}
					dateStr={dateStr}
					weekStart={weekStart}
					appointments={filteredAppointments}
					onAppointmentClick={(a) =>
						router.push(path(`/appointments/${a.booking_ref}`))
					}
					onAppointmentContextMenu={handleContextMenu}
					onDayClick={navigateToDay}
				/>
			);
		}
		// display === "calendar"
		if (scope === "month") {
			return (
				<MonthView
					dateStr={dateStr}
					appointments={filteredAppointments}
					onDayClick={navigateToDay}
					onAppointmentClick={(a) =>
						router.push(path(`/appointments/${a.booking_ref}`))
					}
				/>
			);
		}
		if (scope === "week") {
			return (
				<WeekView
					weekStart={weekStart}
					appointments={filteredAppointments}
					onCellClick={openCreateAt}
					onAppointmentClick={(a) =>
						router.push(path(`/appointments/${a.booking_ref}`))
					}
					onAppointmentContextMenu={handleContextMenu}
					onReschedule={handleReschedule}
					onResize={handleResize}
				/>
			);
		}
		return (
			<DayView
				dateStr={dateStr}
				resourceMode={resource.mode}
				appointments={filteredAppointments}
				employees={employees}
				rooms={rooms}
				shifts={shifts}
				filterEmployeeName={filterEmployeeName}
				onClearFilter={clearResourceFilter}
				onCellClick={openCreateAt}
				onAppointmentClick={(a) =>
					router.push(path(`/appointments/${a.booking_ref}`))
				}
				onAppointmentContextMenu={handleContextMenu}
				onReschedule={handleReschedule}
				onResize={handleResize}
			/>
		);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex justify-end">
				<CreateButton
					type="button"
					size="sm"
					onClick={() => {
						const baseDate = fmtDate(new Date());
						const start = new Date(`${baseDate}T09:00`);
						const end = new Date(start);
						end.setMinutes(end.getMinutes() + DEFAULT_CREATE_DURATION_MIN);
						setDialog({
							kind: "create",
							startAt: start.toISOString(),
							endAt: end.toISOString(),
							employeeId: null,
							roomId: rooms[0]?.id ?? null,
						});
					}}
				>
					New appointment
				</CreateButton>
			</div>

			{offRosterFilter && (
				<ResourceFilterNotice
					employeeName={offRosterFilter.employeeName}
					scopeLabel={scope}
					nextRosteredDate={offRosterFilter.nextRosteredDate}
					onClearFilter={clearResourceFilter}
					onJumpToDate={jumpToDate}
				/>
			)}

			{renderView()}

			{dialog && (
				<AppointmentDialog
					open
					onClose={() => setDialog(null)}
					outletId={outletId}
					appointment={dialog.kind === "edit" ? dialog.appointment : null}
					prefill={
						dialog.kind === "create"
							? {
									startAt: dialog.startAt,
									endAt: dialog.endAt,
									employeeId: dialog.employeeId,
									roomId: dialog.roomId,
								}
							: null
					}
					customers={customers}
					employees={employees}
					rooms={rooms}
					allOutlets={allOutlets}
					allEmployees={allEmployees}
					shifts={shifts}
				/>
			)}

			{contextMenu && (
				<AppointmentContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					appointment={contextMenu.appointment}
					onClose={() => setContextMenu(null)}
					onSetStatus={(status) =>
						handleSetStatus(contextMenu.appointment, status)
					}
					onEdit={() =>
						setDialog({ kind: "edit", appointment: contextMenu.appointment })
					}
					onDelete={() => handleDelete(contextMenu.appointment)}
				/>
			)}

			<CancelAppointmentDialog
				open={cancelTarget !== null}
				onOpenChange={(open) => {
					if (!open) setCancelTarget(null);
				}}
				appointmentId={cancelTarget?.id ?? ""}
				bookingRef={cancelTarget?.booking_ref ?? undefined}
				onSuccess={() => showToast("Appointment cancelled", "success")}
				onError={(message) => showToast(message, "error")}
				onReschedule={() => {
					if (cancelTarget)
						setDialog({ kind: "edit", appointment: cancelTarget });
				}}
			/>

			<AppointmentToastStack toasts={toasts} onDismiss={dismissToast} />
		</div>
	);
}
