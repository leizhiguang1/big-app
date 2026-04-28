import { WaSettingsClient } from "./wa-settings-client";

export const dynamic = "force-dynamic";

export default function WaSettingsPage() {
	return (
		<div className="flex flex-col gap-4">
			<div>
				<h2 className="font-semibold text-lg">WhatsApp Lines & Settings</h2>
				<p className="text-muted-foreground text-sm">
					Manage WhatsApp lines, push notifications, chat staff, tags and CRM
					stages.
				</p>
			</div>
			<WaSettingsClient />
		</div>
	);
}
