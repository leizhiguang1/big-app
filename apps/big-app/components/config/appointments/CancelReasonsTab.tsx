import { BrandConfigSection } from "@/components/brand-config/BrandConfigSection";
import { getServerContext } from "@/lib/context/server";
import { listBrandConfigItems } from "@/lib/services/brand-config";

export async function CancelReasonsTab() {
	const ctx = await getServerContext();
	const items = await listBrandConfigItems(ctx, "reason.appointment_cancel", {
		includeArchived: true,
	});
	return (
		<div className="max-w-3xl">
			<BrandConfigSection
				category="reason.appointment_cancel"
				items={items}
			/>
		</div>
	);
}
