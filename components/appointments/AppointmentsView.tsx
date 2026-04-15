"use client";

import { useEffect, useState } from "react";
import { AppointmentsCalendar } from "@/components/appointments/AppointmentsCalendar";
import {
	AppointmentsFilterBar,
	type ResourceFilter,
} from "@/components/appointments/AppointmentsFilterBar";
import { readViewPrefs, writeViewPrefs } from "@/lib/appointments/view-prefs";
import {
	type DisplayStyle,
	type TimeScope,
	VALID_SCOPES,
} from "@/lib/calendar/layout";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount, Room } from "@/lib/services/outlets";
import type { ServiceWithCategory } from "@/lib/services/services";

type Props = {
	outlets: OutletWithRoomCount[];
	outletId: string;
	dateStr: string;
	weekStart: string;
	resource: ResourceFilter;
	appointments: AppointmentWithRelations[];
	customers: CustomerWithRelations[];
	employees: RosterEmployee[];
	rooms: Room[];
	services: ServiceWithCategory[];
	allEmployees: EmployeeWithRelations[];
	shifts: EmployeeShift[];
};

const DEFAULT_PREFS = {
	display: "calendar" as DisplayStyle,
	scope: "day" as TimeScope,
};

export function AppointmentsView({
	outlets,
	outletId,
	dateStr,
	weekStart,
	resource,
	appointments,
	customers,
	employees,
	rooms,
	services,
	allEmployees,
	shifts,
}: Props) {
	const [display, setDisplay] = useState<DisplayStyle>(DEFAULT_PREFS.display);
	const [scope, setScope] = useState<TimeScope>(DEFAULT_PREFS.scope);

	// Hydrate from localStorage after mount to avoid SSR/CSR mismatch.
	useEffect(() => {
		const prefs = readViewPrefs(DEFAULT_PREFS);
		setDisplay(prefs.display);
		setScope(prefs.scope);
	}, []);

	const handleDisplayChange = (next: DisplayStyle) => {
		const allowed = VALID_SCOPES[next];
		const nextScope = allowed.includes(scope) ? scope : allowed[0];
		setDisplay(next);
		setScope(nextScope);
		writeViewPrefs({ display: next, scope: nextScope });
	};

	const handleScopeChange = (next: TimeScope) => {
		if (!VALID_SCOPES[display].includes(next)) return;
		setScope(next);
		writeViewPrefs({ display, scope: next });
	};

	const handleDrillInToDay = (_dateStr: string) => {
		setDisplay("calendar");
		setScope("day");
		writeViewPrefs({ display: "calendar", scope: "day" });
	};

	return (
		<div className="flex flex-col gap-4">
			<AppointmentsFilterBar
				outlets={outlets}
				outletId={outletId}
				display={display}
				scope={scope}
				dateStr={dateStr}
				resource={resource}
				rooms={rooms}
				employees={employees}
				onDisplayChange={handleDisplayChange}
				onScopeChange={handleScopeChange}
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
				rooms={rooms}
				services={services}
				allOutlets={outlets}
				allEmployees={allEmployees}
				shifts={shifts}
				onDrillInToDay={handleDrillInToDay}
			/>
		</div>
	);
}
