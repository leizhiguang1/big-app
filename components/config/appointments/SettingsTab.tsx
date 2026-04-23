import { BrandSettingField } from "@/components/brand-config/BrandSettingField";
import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerContext } from "@/lib/context/server";
import { listBrandSettings } from "@/lib/services/brand-settings";

export async function SettingsTab() {
	const ctx = await getServerContext();
	const settings = await listBrandSettings(ctx, { group: "appointment" });

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Appointment Settings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<BrandSettingField
						settingKey="appointment.default_slot_minutes"
						value={settings["appointment.default_slot_minutes"]}
					/>
					<BrandSettingField
						settingKey="appointment.allow_overbook"
						value={settings["appointment.allow_overbook"]}
					/>
					<BrandSettingField
						settingKey="appointment.hide_value_on_hover"
						value={settings["appointment.hide_value_on_hover"]}
					/>
				</CardContent>
			</Card>

			<PlaceholderBanner />
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Additional settings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<SettingToggleRow
						label="Allow the selection of employees for Hands-On Incentive calculations"
						hint="Lets staff assign multiple employees to an appointment for incentive tracking."
						defaultChecked
						disabled
					/>
					<SettingToggleRow
						label="Disable sound effects when changing appointment status"
						hint="Turns off the audio cue that plays when an appointment status changes."
						disabled
					/>
					<SettingToggleRow
						label="Enable PIN for Appointments"
						hint="Requires a PIN code for certain appointment actions."
						disabled
					/>
					<SettingToggleRow
						label="Enable selection of branch in Appointments"
						hint="Shows a branch/outlet selector when creating or editing appointments."
						defaultChecked
						disabled
					/>
					<SettingToggleRow
						label="Fit appointment columns to single screen"
						hint="Compresses the calendar view so all employee columns fit without horizontal scrolling."
						defaultChecked
						disabled
					/>
					<SettingToggleRow
						label="Hide appointments from all outlets"
						hint="Restricts each user to see only appointments from their own outlet."
						disabled
					/>
					<SettingToggleRow
						label="Hide customer's Address in Appointments"
						hint="Removes the address field from the appointment detail view."
						disabled
					/>
				</CardContent>
			</Card>
		</div>
	);
}
