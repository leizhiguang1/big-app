"use client";

import { useEffect, useState } from "react";
import { AppointmentsCalendar } from "@/components/appointments/AppointmentsCalendar";
import {
	AppointmentsFilterBar,
	type ResourceFilter,
} from "@/components/appointments/AppointmentsFilterBar";
import {
	type ColumnKey,
	DEFAULT_COLUMN_ORDER,
	DEFAULT_VISIBLE,
} from "@/lib/appointments/columns";
import type {
	AppointmentPaymentStatus,
	AppointmentTypeFilter,
} from "@/lib/appointments/filters";
import {
	DEFAULT_VIEW_PREFS,
	readViewPrefs,
	type ViewPrefs,
	writeViewPrefs,
} from "@/lib/appointments/view-prefs";
import {
	type DisplayStyle,
	type TimeScope,
	VALID_SCOPES,
} from "@/lib/calendar/layout";
import type { AppointmentStatus } from "@/lib/constants/appointment-status";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount, Room } from "@/lib/services/outlets";
import type { ServiceWithCategory } from "@/lib/services/services";

export type AppointmentViewSettings = {
	defaultSlotMinutes: number;
	allowOverbook: boolean;
	hideValueOnHover: boolean;
};

type Props = {
	outlets: OutletWithRoomCount[];
	outletId: string;
	dateStr: string;
	weekStart: string;
	resource: ResourceFilter;
	statusFilter: AppointmentStatus[];
	typeFilter: AppointmentTypeFilter[];
	paymentStatusFilter: AppointmentPaymentStatus[];
	appointments: AppointmentWithRelations[];
	customers: CustomerWithRelations[];
	employees: RosterEmployee[];
	rooms: Room[];
	services: ServiceWithCategory[];
	allEmployees: EmployeeWithRelations[];
	shifts: EmployeeShift[];
	settings?: AppointmentViewSettings;
};

export function AppointmentsView({
	outlets,
	outletId,
	dateStr,
	weekStart,
	resource,
	statusFilter,
	typeFilter,
	paymentStatusFilter,
	appointments,
	customers,
	employees,
	rooms,
	services,
	allEmployees,
	shifts,
}: Props) {
	const [display, setDisplay] = useState<DisplayStyle>(
		DEFAULT_VIEW_PREFS.display,
	);
	const [scope, setScope] = useState<TimeScope>(DEFAULT_VIEW_PREFS.scope);
	const [columnOrder, setColumnOrder] =
		useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
	const [visibleColumns, setVisibleColumns] =
		useState<ColumnKey[]>(DEFAULT_VISIBLE);

	// Hydrate from localStorage after mount to avoid SSR/CSR mismatch.
	useEffect(() => {
		const prefs = readViewPrefs();
		setDisplay(prefs.display);
		setScope(prefs.scope);
		setColumnOrder(prefs.columnOrder);
		setVisibleColumns(prefs.visibleColumns);
	}, []);

	const persist = (patch: Partial<ViewPrefs>) => {
		const next: ViewPrefs = {
			display,
			scope,
			columnOrder,
			visibleColumns,
			...patch,
		};
		writeViewPrefs(next);
	};

	const handleDisplayChange = (next: DisplayStyle) => {
		const allowed = VALID_SCOPES[next];
		const nextScope = allowed.includes(scope) ? scope : allowed[0];
		setDisplay(next);
		setScope(nextScope);
		persist({ display: next, scope: nextScope });
	};

	const handleScopeChange = (next: TimeScope) => {
		if (!VALID_SCOPES[display].includes(next)) return;
		setScope(next);
		persist({ scope: next });
	};

	const handleDrillInToDay = (_dateStr: string) => {
		setDisplay("calendar");
		setScope("day");
		persist({ display: "calendar", scope: "day" });
	};

	const handleColumnChange = (order: ColumnKey[], visible: ColumnKey[]) => {
		setColumnOrder(order);
		setVisibleColumns(visible);
		persist({ columnOrder: order, visibleColumns: visible });
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
				shifts={shifts}
				statusFilter={statusFilter}
				typeFilter={typeFilter}
				paymentStatusFilter={paymentStatusFilter}
				columnOrder={columnOrder}
				visibleColumns={visibleColumns}
				onDisplayChange={handleDisplayChange}
				onScopeChange={handleScopeChange}
				onColumnChange={handleColumnChange}
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
				columnOrder={columnOrder}
				visibleColumns={visibleColumns}
				onDrillInToDay={handleDrillInToDay}
			/>
		</div>
	);
}
