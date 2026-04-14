import { redirect } from "next/navigation";
import type { ResourceFilter } from "@/components/appointments/AppointmentsFilterBar";
import { AppointmentsView } from "@/components/appointments/AppointmentsView";
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

function localDateIso(date: Date): string {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	).toISOString();
}

// Always fetch the 6×7 month grid around `date`. This covers day, week, and
// month views, so client-side scope/display switches are instant and only
// moving `date` or `outlet` triggers a refetch.
function monthGridRange(dateStr: string): { from: Date; to: Date } {
	const date = parseDate(dateStr);
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
		for (const k of ["date", "resource", "rid", "eid"] as const) {
			const v = params[k];
			if (v) next.set(k, v);
		}
		redirect(`/appointments?${next.toString()}`);
	}

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

	const range = monthGridRange(dateStr);

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
		<AppointmentsView
			outlets={activeOutlets}
			outletId={outletId}
			dateStr={dateStr}
			weekStart={weekStart}
			resource={resource}
			appointments={appointments}
			customers={customers}
			employees={employees}
			rooms={activeRooms}
			services={services.filter((s) => s.is_active)}
			allEmployees={allEmployees.filter((e) => e.is_active)}
		/>
	);
}
