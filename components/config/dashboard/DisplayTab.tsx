"use client";

import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DisplayTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-xl">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Display</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<SettingToggleRow
						label="Hide all monetary related graphs and charts"
						hint="Hides revenue, payment, and commission charts from the dashboard view."
					/>
					<SettingToggleRow
						label="Hide customer birthday"
						hint="Removes the birthday reminder widget from the dashboard."
					/>
				</CardContent>
			</Card>
		</div>
	);
}
