import { AutomationsClient } from "./automations-client";

export const dynamic = "force-dynamic";

export default function AutomationsPage() {
	return (
		<div className="flex flex-col gap-4">
			<div>
				<h2 className="font-semibold text-lg">Automations</h2>
				<p className="text-muted-foreground text-sm">
					Auto-reply and scheduled WhatsApp messages. Runs in the WhatsApp
					service, not in BIG.
				</p>
			</div>
			<AutomationsClient />
		</div>
	);
}
