import { BrandConfigSection } from "@/components/brand-config/BrandConfigSection";
import { getServerContext } from "@/lib/context/server";
import { listBrandConfigItems } from "@/lib/services/brand-config";

export async function VoidReasonsTab() {
	const ctx = await getServerContext();
	const items = await listBrandConfigItems(ctx, "void_reason", {
		includeArchived: true,
	});
	return (
		<div className="max-w-3xl">
			<BrandConfigSection category="void_reason" items={items} />
		</div>
	);
}
