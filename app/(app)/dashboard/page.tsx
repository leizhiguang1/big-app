import type { LucideIcon } from "lucide-react";
import { CalendarCheck, DollarSign, TrendingUp, Users } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type Kpi = {
	label: string;
	value: string;
	delta: string;
	icon: LucideIcon;
};

const kpis: Kpi[] = [
	{
		label: "Today's Appointments",
		value: "24",
		delta: "+3 vs yesterday",
		icon: CalendarCheck,
	},
	{
		label: "Revenue (Today)",
		value: "$4,820",
		delta: "+12% vs yesterday",
		icon: DollarSign,
	},
	{
		label: "New Customers",
		value: "6",
		delta: "+2 this week",
		icon: Users,
	},
	{
		label: "Chair Utilization",
		value: "78%",
		delta: "Target 80%",
		icon: TrendingUp,
	},
];

export default function DashboardPage() {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Dashboard</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Static preview — live metrics wire in after Supabase is connected.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{kpis.map((kpi) => (
					<Card key={kpi.label}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardDescription>{kpi.label}</CardDescription>
							<kpi.icon className="size-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-semibold text-2xl">{kpi.value}</div>
							<p className="mt-1 text-muted-foreground text-xs">{kpi.delta}</p>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Today's schedule</CardTitle>
					<CardDescription>
						Appointments calendar renders here once the Appointments module is
						built.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex h-48 items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
					Schedule preview placeholder
				</CardContent>
			</Card>
		</div>
	);
}
