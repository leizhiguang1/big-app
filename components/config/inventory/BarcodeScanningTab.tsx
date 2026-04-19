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

export function BarcodeScanningTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-2xl">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Barcode Scanning Settings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<SettingToggleRow
						label="Enable Barcode Scanning"
						hint="Allow staff to scan barcodes to quickly find and add inventory items."
						defaultChecked
					/>
					<div className="space-y-1.5">
						<Label>Scanner Type</Label>
						<Select defaultValue="usb">
							<SelectTrigger className="w-56">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="usb">USB Scanner</SelectItem>
								<SelectItem value="bluetooth">Bluetooth Scanner</SelectItem>
								<SelectItem value="camera">Camera (Mobile)</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<SettingToggleRow
						label="Auto-add item to cart on scan"
						hint="Automatically adds the scanned item to the current bill without confirmation."
					/>
					<SettingToggleRow
						label="Play beep sound on successful scan"
						hint="Plays an audible beep when a barcode is successfully recognised."
						defaultChecked
					/>
				</CardContent>
			</Card>
		</div>
	);
}
