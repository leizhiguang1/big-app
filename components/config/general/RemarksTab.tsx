"use client";

import { Plus, Trash2 } from "lucide-react";
import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type RemarkItem = { id: number; name: string; active: boolean };
type RemarkGroup = { key: string; label: string; items: RemarkItem[] };

const REMARK_GROUPS: RemarkGroup[] = [
	{
		key: "add-stock",
		label: "Add Stock",
		items: [
			{ id: 1, name: "From Store", active: true },
			{ id: 2, name: "From EM", active: true },
			{ id: 3, name: "New Stock From Supplier", active: true },
			{ id: 4, name: "Stock Adjustment", active: true },
		],
	},
	{
		key: "reduce-stock",
		label: "Reduce Stock",
		items: [
			{ id: 1, name: "Damaged Items", active: true },
			{ id: 2, name: "Expired Stock", active: true },
			{ id: 3, name: "Staff Benefit", active: true },
			{ id: 4, name: "Sample", active: true },
			{ id: 5, name: "Wrong Delivery", active: true },
			{ id: 6, name: "Utility Remove", active: true },
		],
	},
	{
		key: "return-stock",
		label: "Return Stock",
		items: [{ id: 1, name: "Damaged Stock", active: true }],
	},
	{
		key: "cancel-sales",
		label: "Cancel Sales",
		items: [
			{ id: 1, name: "Duplicate Sales", active: true },
			{ id: 2, name: "Outlet Change", active: true },
			{ id: 3, name: "Duplicate Invoice", active: true },
			{ id: 4, name: "Return Back to Customer", active: true },
			{ id: 5, name: "Wrong Customer", active: true },
		],
	},
	{
		key: "receipt-return",
		label: "Receipt Return",
		items: [],
	},
	{
		key: "attendance",
		label: "Attendance",
		items: [{ id: 1, name: "Public Holiday", active: true }],
	},
	{
		key: "appt-consumable",
		label: "Appointment Consumable",
		items: [
			{ id: 1, name: "No Line", active: true },
			{ id: 2, name: "Customer Registration For Botox", active: true },
		],
	},
	{
		key: "cancel-appt",
		label: "Cancel Appointment",
		items: [
			{ id: 1, name: "Doctors Cancellation", active: true },
			{ id: 2, name: "Customer Cancelled", active: true },
			{ id: 3, name: "Doctors Not Available", active: true },
			{ id: 4, name: "Patient Not Selected", active: true },
			{ id: 5, name: "Wrong Discount", active: true },
		],
	},
	{
		key: "revert-appt",
		label: "Revert Appointment",
		items: [
			{ id: 1, name: "Not Appointment", active: true },
			{ id: 2, name: "Incorrect Staff Requires", active: true },
			{ id: 3, name: "Zero Sales", active: true },
		],
	},
	{
		key: "edit-employee",
		label: "Edit Employee",
		items: [
			{ id: 1, name: "Internal Use Only", active: true },
			{ id: 2, name: "Close To Due", active: true },
			{ id: 3, name: "Not Verified", active: true },
			{ id: 4, name: "Edit Employee Profile", active: true },
		],
	},
	{
		key: "lead-unsuccessful",
		label: "Lead Unsuccessful",
		items: [
			{ id: 1, name: "Engaged", active: true },
			{ id: 2, name: "Unreachable", active: true },
		],
	},
	{
		key: "customer-lead-list",
		label: "Customer Lead List",
		items: [
			{ id: 1, name: "Patient To Be Called", active: true },
			{ id: 2, name: "Patient To Be Messaged", active: true },
		],
	},
];

function RemarkGroupCard({ group }: { group: RemarkGroup }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
				<CardTitle className="text-sm font-medium">{group.label}</CardTitle>
				<Button variant="ghost" size="icon" className="size-7">
					<Plus className="size-3.5" />
				</Button>
			</CardHeader>
			<CardContent className="pb-3 pt-0">
				{group.items.length === 0 ? (
					<p className="py-2 text-center text-muted-foreground text-xs">
						No remarks yet. Click + to add one.
					</p>
				) : (
					<div className="space-y-1.5">
						{group.items.map((item) => (
							<div
								key={item.id}
								className="flex items-center justify-between rounded py-0.5"
							>
								<span className="text-sm">{item.name}</span>
								<div className="flex items-center gap-2">
									<Switch defaultChecked={item.active} />
									<Button
										variant="ghost"
										size="icon"
										className="size-7 text-destructive hover:text-destructive"
									>
										<Trash2 className="size-3.5" />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export function RemarksTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<div className="flex items-center gap-3">
				<span className="text-sm font-medium">Outlet</span>
				<Select defaultValue="all">
					<SelectTrigger className="w-[220px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Outlets</SelectItem>
						<SelectItem value="1">Main Outlet</SelectItem>
						<SelectItem value="2">Branch A</SelectItem>
						<SelectItem value="3">Branch B</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				{REMARK_GROUPS.map((group) => (
					<RemarkGroupCard key={group.key} group={group} />
				))}
			</div>
		</div>
	);
}
