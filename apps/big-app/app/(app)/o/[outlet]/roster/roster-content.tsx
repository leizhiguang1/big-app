import { notFound } from "next/navigation";
import { RosterFilters } from "@/components/roster/RosterFilters";
import { RosterGrid } from "@/components/roster/RosterGrid";
import { getServerContext } from "@/lib/context/server";
import { addDays, fmtDate, getWeekStart, parseDate } from "@/lib/roster/week";
import {
	listEmployeesForOutlet,
	listShiftsForWeek,
} from "@/lib/services/employee-shifts";
import { listOutlets } from "@/lib/services/outlets";

export async function RosterContent({
	params: paramsPromise,
	searchParams,
}: {
	params: Promise<{ outlet: string }>;
	searchParams: Promise<{ week?: string }>;
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
				No active outlets. Create an outlet first to manage rosters.
			</div>
		);
	}

	const resolved = activeOutlets.find((o) => o.code === outletCode);
	if (!resolved) notFound();
	const outletId = resolved.id;

	const weekStartDate = params.week
		? getWeekStart(parseDate(params.week))
		: getWeekStart(new Date());
	const weekStart = fmtDate(weekStartDate);
	const weekEnd = fmtDate(addDays(weekStartDate, 6));

	const [employees, shifts] = await Promise.all([
		listEmployeesForOutlet(ctx, outletId),
		listShiftsForWeek(ctx, { outletId, weekStart, weekEnd }),
	]);

	return (
		<div className="flex flex-col gap-4">
			<RosterFilters weekStart={weekStart} />
			<RosterGrid
				outletId={outletId}
				weekStart={weekStart}
				employees={employees}
				shifts={shifts}
			/>
		</div>
	);
}
