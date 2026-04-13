import { redirect } from "next/navigation";
import { AppointmentsCalendar } from "@/components/appointments/AppointmentsCalendar";
import {
	AppointmentsFilterBar,
	type ResourceFilter,
} from "@/components/appointments/AppointmentsFilterBar";
import {
	type DisplayStyle,
	type TimeScope,
	VALID_SCOPES,
} from "@/lib/calendar/layout";
import { getServerContext } from "@/lib/context/server";
import { addDays, fmtDate, getWeekStart, parseDate } from "@/lib/roster/week";
import {
	type AppointmentWithRelations,
	listAppointmentsForRange,
} from "@/lib/services/appointments";
import { listCustomers } from "@/lib/services/customers";
import { listBookableEmployeesForOutlet } from "@/lib/services/employee-shifts";
import { listEmployees } from "@/lib/services/employees";
import { listOutlets, listRooms } from "@/lib/services/outlets";
import { listServices } from "@/lib/services/services";

function parseDisplay(v: string | undefined): DisplayStyle {
	if (v === "list" || v === "grid") return v;
	return "calendar";
}

function parseScope(v: string | undefined, display: DisplayStyle): TimeScope {
	const allowed = VALID_SCOPES[display];
	if (v === "day" || v === "week" || v === "month") {
		if (allowed.includes(v)) return v;
	}
	return allowed[0];
}

function localDateIso(date: Date): string {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	).toISOString();
}

function rangeFor(scope: TimeScope, dateStr: string): { from: Date; to: Date } {
	const date = parseDate(dateStr);
	if (scope === "day") return { from: date, to: addDays(date, 1) };
	if (scope === "week") {
		const start = getWeekStart(date);
		return { from: start, to: addDays(start, 7) };
	}
	// month: include the 6×7 grid that the MonthView renders so out-of-month
	// cells aren't blank.
	const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
	const gridStart = getWeekStart(firstOfMonth);
	return { from: gridStart, to: addDays(gridStart, 42) };
}

function applyResourceFilter(
	rows: AppointmentWithRelations[],
	resource: ResourceFilter,
): AppointmentWithRelations[] {
	if (resource.value === null) return rows;
	if (resource.mode === "room") {
		return rows.filter((a) => a.room_id === resource.value);
	}
	return rows.filter((a) => a.employee_id === resource.value);
}

export async function AppointmentsContent({
	searchParams,
}: {
	searchParams: Promise<{
		outlet?: string;
		display?: string;
		scope?: string;
		date?: string;
		resource?: string;
		rid?: string;
		eid?: string;
	}>;
}) {
	const params = await searchParams;
	const ctx = await getServerContext();
	const outlets = await listOutlets(ctx);
	const activeOutlets = outlets.filter((o) => o.is_active);

	if (activeOutlets.length === 0) {
		return (
			<div className="rounded-md border bg-muted/30 p-6 text-center text-muted-foreground text-sm">
				No active outlets. Create an outlet first to manage appointments.
			</div>
		);
	}

	const requestedOutlet = params.outlet;
	const outletId =
		requestedOutlet && activeOutlets.some((o) => o.id === requestedOutlet)
			? requestedOutlet
			: activeOutlets[0].id;

	if (outletId !== requestedOutlet) {
		const next = new URLSearchParams();
		next.set("outlet", outletId);
		for (const k of [
			"display",
			"scope",
			"date",
			"resource",
			"rid",
			"eid",
		] as const) {
			const v = params[k];
			if (v) next.set(k, v);
		}
		redirect(`/appointments?${next.toString()}`);
	}

	const display = parseDisplay(params.display);
	const scope = parseScope(params.scope, display);
	const dateStr = params.date ?? fmtDate(new Date());
	const date = parseDate(dateStr);
	const weekStart = fmtDate(getWeekStart(date));

	const resource: ResourceFilter = {
		mode: params.resource === "employee" ? "employee" : "room",
		value:
			params.resource === "employee"
				? (params.eid ?? null)
				: (params.rid ?? null),
	};

	const range = rangeFor(scope, dateStr);

	const [appointmentsRaw, customers, employees, rooms, services, allEmployees] =
		await Promise.all([
			listAppointmentsForRange(ctx, {
				outletId,
				from: localDateIso(range.from),
				to: localDateIso(range.to),
			}),
			listCustomers(ctx),
			listBookableEmployeesForOutlet(ctx, outletId),
			listRooms(ctx, outletId),
			listServices(ctx),
			listEmployees(ctx),
		]);

	const activeRooms = rooms.filter((r) => r.is_active);
	const appointments = applyResourceFilter(appointmentsRaw, resource);

	return (
		<div className="flex flex-col gap-4">
			<AppointmentsFilterBar
				outlets={activeOutlets}
				outletId={outletId}
				display={display}
				scope={scope}
				dateStr={dateStr}
				resource={resource}
				rooms={activeRooms}
				employees={employees}
			/>
			<AppointmentsCalendar
				display={display}
				scope={scope}
				resource={resource}
				dateStr={dateStr}
				weekStart={weekStart}
				outletId={outletId}
				appointments={appointments}
				customers={customers}
				employees={employees}
				rooms={activeRooms}
				services={services.filter((s) => s.is_active)}
				allOutlets={activeOutlets}
				allEmployees={allEmployees.filter((e) => e.is_active)}
			/>
		</div>
	);
}
