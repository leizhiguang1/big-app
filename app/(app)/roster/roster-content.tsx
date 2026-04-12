import { redirect } from "next/navigation";
import { RosterFilters } from "@/components/roster/RosterFilters";
import { RosterGrid } from "@/components/roster/RosterGrid";
import { getServerContext } from "@/lib/context/server";
import { addDays, fmtDate, getWeekStart, parseDate } from "@/lib/roster/week";
import {
	listBookableEmployeesForOutlet,
	listShiftsForWeek,
} from "@/lib/services/employee-shifts";
import { listOutlets } from "@/lib/services/outlets";

export async function RosterContent({
	searchParams,
}: {
	searchParams: Promise<{ outlet?: string; week?: string }>;
}) {
	const params = await searchParams;
	const ctx = await getServerContext();
	const outlets = await listOutlets(ctx);
	const activeOutlets = outlets.filter((o) => o.is_active);

	if (activeOutlets.length === 0) {
		return (
			<div className="rounded-md border bg-muted/30 p-6 text-center text-muted-foreground text-sm">
				No active outlets. Create an outlet first to manage rosters.
			</div>
		);
	}

	const requestedOutlet = params.outlet;
	const outletId =
		requestedOutlet && activeOutlets.some((o) => o.id === requestedOutlet)
			? requestedOutlet
			: activeOutlets[0].id;

	if (outletId !== requestedOutlet) {
		const week = params.week ? `&week=${params.week}` : "";
		redirect(`/roster?outlet=${outletId}${week}`);
	}

	const weekStartDate = params.week
		? getWeekStart(parseDate(params.week))
		: getWeekStart(new Date());
	const weekStart = fmtDate(weekStartDate);
	const weekEnd = fmtDate(addDays(weekStartDate, 6));

	const [employees, shifts] = await Promise.all([
		listBookableEmployeesForOutlet(ctx, outletId),
		listShiftsForWeek(ctx, { outletId, weekStart, weekEnd }),
	]);

	return (
		<div className="flex flex-col gap-4">
			<RosterFilters
				outlets={activeOutlets}
				outletId={outletId}
				weekStart={weekStart}
			/>
			<RosterGrid
				outletId={outletId}
				weekStart={weekStart}
				employees={employees}
				shifts={shifts}
			/>
		</div>
	);
}
