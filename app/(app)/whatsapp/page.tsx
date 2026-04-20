import { getServerContext } from "@/lib/context/server";
import { listOutletWaStatus } from "@/lib/services/whatsapp";
import { WhatsAppConnectionsView } from "./whatsapp-connections-view";

export default async function WhatsAppPage() {
	const ctx = await getServerContext();
	const outlets = await listOutletWaStatus(ctx);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h2 className="font-semibold text-lg">WhatsApp</h2>
				<p className="text-muted-foreground text-sm">
					Pair a WhatsApp number to each outlet. Scan the QR from the WhatsApp
					app → Linked devices.
				</p>
			</div>
			<WhatsAppConnectionsView outlets={outlets} />
		</div>
	);
}
