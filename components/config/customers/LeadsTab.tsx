"use client";

import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LeadsTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-xl">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Lead Settings</CardTitle>
				</CardHeader>
				<CardContent>
					<SettingToggleRow
						label="Allow selection of outlet during lead conversion"
						hint="When converting a lead to a customer, staff can choose which outlet to assign the customer to."
						defaultChecked
					/>
				</CardContent>
			</Card>
		</div>
	);
}
