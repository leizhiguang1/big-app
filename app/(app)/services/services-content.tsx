import {
	type InventoryItemChoice,
	NewServiceButton,
} from "@/components/services/ServiceForm";
import { ServicesTable } from "@/components/services/ServicesTable";
import { getServerContext } from "@/lib/context/server";
import { listInventoryItems } from "@/lib/services/inventory";
import { listCategories, listServices } from "@/lib/services/services";
import { listTaxes } from "@/lib/services/taxes";

export async function ServicesContent() {
	const ctx = await getServerContext();
	const [services, categories, taxes, inventory] = await Promise.all([
		listServices(ctx),
		listCategories(ctx),
		listTaxes(ctx),
		listInventoryItems(ctx),
	]);

	const inventoryItems: InventoryItemChoice[] = inventory
		.filter((i) => i.is_active)
		.map((i) => ({
			id: i.id,
			sku: i.sku,
			name: i.name,
			kind: i.kind as InventoryItemChoice["kind"],
		}));

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<div className="flex shrink-0 items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{services.length} service{services.length === 1 ? "" : "s"}
				</p>
				<NewServiceButton
					categories={categories}
					taxes={taxes}
					inventoryItems={inventoryItems}
				/>
			</div>
			<ServicesTable
				services={services}
				categories={categories}
				taxes={taxes}
				inventoryItems={inventoryItems}
			/>
		</div>
	);
}
