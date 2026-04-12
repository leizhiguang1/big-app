import { NewInventoryItemButton } from "@/components/inventory/InventoryItemForm";
import { InventoryItemsTable } from "@/components/inventory/InventoryItemsTable";
import { getServerContext } from "@/lib/context/server";
import { listInventoryItems } from "@/lib/services/inventory";

export async function InventoryContent() {
	const ctx = await getServerContext();
	const items = await listInventoryItems(ctx);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{items.length} item{items.length === 1 ? "" : "s"}
				</p>
				<NewInventoryItemButton />
			</div>
			<InventoryItemsTable items={items} />
		</div>
	);
}
