"use client";

import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const INTERVALS = [
	{ value: "5", label: "5 minutes" },
	{ value: "10", label: "10 minutes" },
	{ value: "15", label: "15 minutes" },
	{ value: "20", label: "20 minutes" },
	{ value: "30", label: "30 minutes" },
	{ value: "60", label: "1 hour" },
];

export function SettingsTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Appointment Settings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-1.5">
						<Label>Appointment Interval</Label>
						<Select defaultValue="15">
							<SelectTrigger className="w-48">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{INTERVALS.map((i) => (
									<SelectItem key={i.value} value={i.value}>
										{i.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2 pt-1">
						<SettingToggleRow
							label="Allow Overlapping"
							hint="Permits multiple appointments to be booked in the same time slot for an employee."
							defaultChecked
						/>
						<SettingToggleRow
							label="Allow the selection of employees for Hands-On Incentive calculations"
							hint="Lets staff assign multiple employees to an appointment for incentive tracking."
							defaultChecked
						/>
						<SettingToggleRow
							label="Disable sound effects when changing appointment status"
							hint="Turns off the audio cue that plays when an appointment status changes."
						/>
						<SettingToggleRow
							label="Enable PIN for Appointments"
							hint="Requires a PIN code for certain appointment actions."
							defaultChecked
						/>
						<SettingToggleRow
							label="PIN is required when editing, cancelling, reverting or rescheduling appointments, blocked timing"
							hint="Protects sensitive appointment changes with a PIN prompt."
							indent
						/>
						<SettingToggleRow
							label="PIN is required when creating appointments, blocked timing"
							hint="Requires a PIN when a new appointment or block is created."
							indent
						/>
						<SettingToggleRow
							label="Enable selection of branch in Appointments"
							hint="Shows a branch/outlet selector when creating or editing appointments."
							defaultChecked
						/>
						<SettingToggleRow
							label="Fit appointment columns to single screen"
							hint="Compresses the calendar view so all employee columns fit without horizontal scrolling."
							defaultChecked
						/>
						<SettingToggleRow
							label="Hide Appointment Value during mouse-over on existing appointments"
							hint="Prevents the billing amount from showing when hovering over an appointment card."
						/>
						<SettingToggleRow
							label="Hide appointments from all outlets"
							hint="Restricts each user to see only appointments from their own outlet."
						/>
						<SettingToggleRow
							label="Hide customer's Address in Appointments"
							hint="Removes the address field from the appointment detail view."
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
