"use client";

import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProfileTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-2xl">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Profile Display</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<SettingToggleRow
						label="Allow profile photo upload"
						hint="Lets employees upload a profile picture shown in the staff directory."
						defaultChecked
					/>
					<SettingToggleRow
						label="Show employee ID on profile"
						hint="Displays the employee's code (e.g. EMP-0001) on their profile page."
						defaultChecked
					/>
					<SettingToggleRow
						label="Show designation on profile"
						hint="Displays the employee's job title or designation."
						defaultChecked
					/>
					<SettingToggleRow
						label="Show commission rate to employee"
						hint="Allows employees to see their own commission rate on their profile."
					/>
				</CardContent>
			</Card>

			<Card className="max-w-2xl">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Required Fields</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<SettingToggleRow
						label="IC / Passport Number"
						hint="Makes IC or passport number a mandatory field when creating an employee."
					/>
					<SettingToggleRow
						label="Emergency Contact"
						hint="Requires an emergency contact person and number to be provided."
					/>
					<SettingToggleRow
						label="Bank Account"
						hint="Requires bank account details for payroll processing."
					/>
				</CardContent>
			</Card>
		</div>
	);
}
