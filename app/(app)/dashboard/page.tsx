import { DashboardRemindersCard } from "@/components/dashboard/DashboardRemindersCard";
import { getServerContext } from "@/lib/context/server";
import { listRemindersForEmployee } from "@/lib/services/follow-ups";

export default async function DashboardPage() {
	const ctx = await getServerContext();
	const reminders = ctx.currentUser?.employeeId
		? await listRemindersForEmployee(ctx, ctx.currentUser.employeeId)
		: [];

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Dashboard</h1>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<DashboardRemindersCard reminders={reminders} />
			</div>
		</div>
	);
}
