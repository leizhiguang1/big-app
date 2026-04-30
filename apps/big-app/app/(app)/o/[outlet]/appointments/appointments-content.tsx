import { notFound } from "next/navigation";
import type { ResourceFilter } from "@/components/appointments/AppointmentsFilterBar";
import { AppointmentsView } from "@/components/appointments/AppointmentsView";
import { AppointmentConfigProvider } from "@/components/brand-config/AppointmentConfigProvider";
import {
	appointmentMatchesTypeFilter,
	parsePaymentStatusParam,
	parseStatusParam,
	parseTypeParam,
} from "@/lib/appointments/filters";
import { getServerContext } from "@/lib/context/server";
import { addDays, fmtDate, getWeekStart, parseDate } from "@/lib/roster/week";
import {
	type AppointmentWithRelations,
	listAppointmentsForRange,
} from "@/lib/services/appointments";
import { listAppointmentTags } from "@/lib/services/brand-config";
import { listBrandSettings } from "@/lib/services/brand-settings";
import { listCustomers } from "@/lib/services/customers";
import {
	listBookableEmployeesForOutlet,
	listShiftsForRange,
} from "@/lib/services/employee-shifts";
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
	params: paramsPromise,
	searchParams,
}: {
	params: Promise<{ outlet: string }>;
	searchParams: Promise<{
		date?: string;
		resource?: string;
		rid?: string;
		eid?: string;
		status?: string;
		atype?: string;
		pstatus?: string;
	}>;
}) {
	const [{ outlet: outletCode }, params] = await Promise.all([
		paramsPromise,
		searchParams,
	]);
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

	const resolvedOutlet = activeOutlets.find((o) => o.code === outletCode);
	if (!resolvedOutlet) notFound();
	const outletId = resolvedOutlet.id;

	const dateStr = params.date ?? fmtDate(new Date());
	const date = parseDate(dateStr);
	const weekStart = fmtDate(getWeekStart(date));

	const resource: ResourceFilter = {
		mode: params.resource === "room" ? "room" : "employee",
		value:
			params.resource === "room" ? (params.rid ?? null) : (params.eid ?? null),
	};

	const statusFilter = parseStatusParam(params.status);
	const typeFilter = parseTypeParam(params.atype);
	const paymentStatusFilter = parsePaymentStatusParam(params.pstatus);

	const range = monthGridRange(dateStr);

	const rangeFromMinus1 = addDays(range.from, -1);
	const [
		appointmentsRaw,
		customers,
		employees,
		rooms,
		services,
		allEmployees,
		shifts,
		brandTags,
		appointmentSettings,
	] = await Promise.all([
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
		listShiftsForRange(ctx, {
			outletId,
			from: fmtDate(rangeFromMinus1),
			to: fmtDate(range.to),
		}),
		listAppointmentTags(ctx),
		listBrandSettings(ctx, { group: "appointment" }),
	]);

	const activeRooms = rooms.filter((r) => r.is_active);
	const resourceFiltered = applyResourceFilter(appointmentsRaw, resource);
	const appointments = resourceFiltered.filter((a) => {
		if (statusFilter.length > 0) {
			if (!statusFilter.some((s) => s === a.status)) return false;
		} else if (a.status === "cancelled") {
			// Hide cancelled by default; opt back in via the Advanced Filter.
			return false;
		}
		if (!appointmentMatchesTypeFilter(a, typeFilter)) return false;
		if (
			paymentStatusFilter.length > 0 &&
			!paymentStatusFilter.some((p) => p === a.payment_status)
		)
			return false;
		return true;
	});

	const pilotSettings = {
		defaultSlotMinutes: Number(
			appointmentSettings["appointment.default_slot_minutes"] ?? 30,
		),
		allowOverbook: Boolean(
			appointmentSettings["appointment.allow_overbook"] ?? false,
		),
		hideValueOnHover: Boolean(
			appointmentSettings["appointment.hide_value_on_hover"] ?? false,
		),
	};

	return (
		<AppointmentConfigProvider tags={brandTags} settings={pilotSettings}>
			<AppointmentsView
				outlets={activeOutlets}
				outletId={outletId}
				dateStr={dateStr}
				weekStart={weekStart}
				resource={resource}
				statusFilter={statusFilter}
				typeFilter={typeFilter}
				paymentStatusFilter={paymentStatusFilter}
				appointments={appointments}
				customers={customers}
				employees={employees}
				rooms={activeRooms}
				services={services.filter((s) => s.is_active)}
				allEmployees={allEmployees.filter((e) => e.is_active)}
				shifts={shifts}
				settings={pilotSettings}
			/>
		</AppointmentConfigProvider>
	);
}
