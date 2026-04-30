import { KBClient } from "@/components/kb/KBClient";
import { listServices } from "@/lib/services/services";
import { getServerContext } from "@/lib/context/server";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
	const ctx = await getServerContext();
	let dbServices: Array<{
		id: string;
		name: string;
		sku?: string | null;
		price?: number | null;
		duration?: number | null;
	}> = [];
	try {
		const list = await listServices(ctx);
		dbServices = list.map((s) => ({
			id: s.id,
			name: s.name,
			sku: s.sku ?? null,
			price: s.price ?? null,
			duration: s.duration_min ?? null,
		}));
	} catch {
		// non-fatal — KB editor falls back to its own list
	}

	return (
		<div className="flex flex-col gap-4">
			<KBClient dbServices={dbServices} />
		</div>
	);
}
