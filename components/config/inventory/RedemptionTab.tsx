"use client";

import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RedemptionTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-2xl">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Product Redemption</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<SettingToggleRow
						label="Automatically redeem inventory items after payment"
						hint="Marks inventory items as redeemed immediately when a sale is collected."
						defaultChecked
					/>
					<SettingToggleRow
						label="Include balance products in printed and e-mailed Product Redemption Receipt"
						hint="Shows remaining product session balances on printed and emailed receipts."
						defaultChecked
					/>
					<SettingToggleRow
						label="Include expired products in printed and e-mailed Product Redemption Receipt"
						hint="Shows expired product sessions on the redemption receipt."
						defaultChecked
					/>
					<SettingToggleRow
						label={'Reserve inventory stock when billing items for "Boarding" type appointments'}
						hint="Holds stock from available inventory when a boarding appointment is billed."
					/>
				</CardContent>
			</Card>
		</div>
	);
}
