import { UomPanel } from "@/components/inventory/UomPanel";
import { getServerContext } from "@/lib/context/server";
import { listInventoryItems, listUoms } from "@/lib/services/inventory";

export async function UomContent() {
	const ctx = await getServerContext();
	const [uoms, items] = await Promise.all([
		listUoms(ctx),
		listInventoryItems(ctx),
	]);
	return <UomPanel uoms={uoms} items={items} />;
}
