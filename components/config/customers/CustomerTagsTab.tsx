import { BrandConfigSection } from "@/components/brand-config/BrandConfigSection";
import { getServerContext } from "@/lib/context/server";
import { listBrandConfigItems } from "@/lib/services/brand-config";

export async function CustomerTagsTab() {
	const ctx = await getServerContext();
	const items = await listBrandConfigItems(ctx, "customer_tag", {
		includeArchived: true,
	});
	return (
		<div className="max-w-3xl">
			<BrandConfigSection category="customer_tag" items={items} />
		</div>
	);
}
