import { BrandConfigSection } from "@/components/brand-config/BrandConfigSection";
import { getServerContext } from "@/lib/context/server";
import { listBrandConfigItems } from "@/lib/services/brand-config";

export async function SalutationTab() {
	const ctx = await getServerContext();
	const items = await listBrandConfigItems(ctx, "salutation", {
		includeArchived: true,
	});
	return (
		<div className="max-w-3xl">
			<BrandConfigSection category="salutation" items={items} />
		</div>
	);
}
