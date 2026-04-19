"use client";

import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const MOCK_OUTLETS = [
	{ id: 1, name: "Main Outlet", bookable: true },
	{ id: 2, name: "Branch A", bookable: true },
	{ id: 3, name: "Branch B", bookable: false },
];

const MOCK_EMPLOYEES = [
	{ id: 1, name: "Alice Tan", role: "Doctor", position: "Senior Doctor", outlet: "Main Outlet", bookable: true },
	{ id: 2, name: "Bob Lim", role: "Assistant", position: "Dental Assistant", outlet: "Main Outlet", bookable: true },
	{ id: 3, name: "Carol Wong", role: "Doctor", position: "Doctor", outlet: "Branch A", bookable: false },
];

export function OnlineBookingTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Online Booking Settings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<SettingToggleRow
						label="Enable Online Booking"
						hint="Activates the public-facing online booking portal."
						defaultChecked
					/>
					<div className="flex items-center gap-3 py-0.5">
						<Switch />
						<span className="flex-1 text-sm">Allow Online Booking without login</span>
						<Badge variant="secondary" className="text-xs">Premium</Badge>
					</div>
					<div className="flex items-center gap-3 py-0.5">
						<Switch />
						<span className="flex-1 text-sm">Allow rescheduling in online booking</span>
						<Badge variant="secondary" className="text-xs">Premium</Badge>
					</div>
					<SettingToggleRow
						label="Send employee first login link"
						hint="Emails a one-time login link to employees who have never logged in."
						defaultChecked
					/>

					<div className="grid gap-4 pt-2 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label>Bookable Outlet Page</Label>
							<Select defaultValue="outlet-first">
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="outlet-first">Outlet first</SelectItem>
									<SelectItem value="employee-first">Employee first</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label>Employee/First Page</Label>
							<Select defaultValue="all">
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="filter">Filter by outlet</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Bookable Outlets</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="pl-6">Outlet Name</TableHead>
									<TableHead className="w-28 pr-6 text-right">Bookable</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{MOCK_OUTLETS.map((outlet) => (
									<TableRow key={outlet.id}>
										<TableCell className="pl-6 font-medium">{outlet.name}</TableCell>
										<TableCell className="pr-6 text-right">
											<Switch defaultChecked={outlet.bookable} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
						<div className="px-6 py-3 text-muted-foreground text-xs">
							Showing 1 to {MOCK_OUTLETS.length} of {MOCK_OUTLETS.length} entries
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Bookable Employees</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="pl-6">Name</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Outlet</TableHead>
									<TableHead className="w-24 pr-6 text-right">Bookable</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{MOCK_EMPLOYEES.map((emp) => (
									<TableRow key={emp.id}>
										<TableCell className="pl-6 font-medium">{emp.name}</TableCell>
										<TableCell className="text-muted-foreground text-sm">{emp.role}</TableCell>
										<TableCell className="text-muted-foreground text-sm">{emp.outlet}</TableCell>
										<TableCell className="pr-6 text-right">
											<Switch defaultChecked={emp.bookable} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
						<div className="px-6 py-3 text-muted-foreground text-xs">
							Showing 1 to {MOCK_EMPLOYEES.length} of {MOCK_EMPLOYEES.length} entries
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
