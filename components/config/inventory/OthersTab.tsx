"use client";

import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OthersTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-2xl">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Miscellaneous Settings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<SettingToggleRow
						label="Allow negative stock"
						hint="Permits inventory quantities to go below zero. Useful when stock count is not tracked in real time."
					/>
					<SettingToggleRow
						label="Show cost price to staff"
						hint="Displays the cost price of products to non-admin staff members."
					/>
					<SettingToggleRow
						label="Enable stock transfer between outlets"
						hint="Allows stock to be moved from one outlet to another via a transfer request."
						defaultChecked
					/>
					<SettingToggleRow
						label="Require approval for stock transfers"
						hint="Transfers must be approved by a manager before the quantity is adjusted."
					/>
					<SettingToggleRow
						label="Auto-generate purchase order when stock hits minimum level"
						hint="Creates a draft purchase order when any item falls below its minimum stock level."
					/>
				</CardContent>
			</Card>
		</div>
	);
}
