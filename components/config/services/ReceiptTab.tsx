"use client";

import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ReceiptTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-xl">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Service Redemption Receipt</CardTitle>
				</CardHeader>
				<CardContent>
					<SettingToggleRow
						label="Include balance services in printed and e-mailed Service Redemption Receipt"
						hint="Shows remaining service session balances on printed and emailed receipts."
						defaultChecked
					/>
				</CardContent>
			</Card>
		</div>
	);
}
