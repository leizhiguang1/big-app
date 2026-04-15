import { AddItemButton } from "@/components/inventory/AddItemChooser";
import { ItemsTable } from "@/components/inventory/ItemsTable";
import { getServerContext } from "@/lib/context/server";
import {
	listBrands,
	listCategories,
	listInventoryItems,
	listSuppliers,
	listUoms,
} from "@/lib/services/inventory";

export async function InventoryContent() {
	const ctx = await getServerContext();
	const [items, uoms, brands, categories, suppliers] = await Promise.all([
		listInventoryItems(ctx),
		listUoms(ctx),
		listBrands(ctx),
		listCategories(ctx),
		listSuppliers(ctx),
	]);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{items.length} item{items.length === 1 ? "" : "s"}
				</p>
				<AddItemButton
					uoms={uoms}
					brands={brands}
					categories={categories}
					suppliers={suppliers}
				/>
			</div>
			<ItemsTable
				items={items}
				uoms={uoms}
				brands={brands}
				categories={categories}
				suppliers={suppliers}
			/>
		</div>
	);
}
