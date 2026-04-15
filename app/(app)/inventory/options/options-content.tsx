import { InventoryOptionsPanel } from "@/components/inventory/InventoryOptionsPanel";
import { getServerContext } from "@/lib/context/server";
import {
	listBrands,
	listCategories,
	listInventoryItems,
	listSuppliers,
} from "@/lib/services/inventory";

export async function OptionsContent() {
	const ctx = await getServerContext();
	const [brands, categories, suppliers, items] = await Promise.all([
		listBrands(ctx),
		listCategories(ctx),
		listSuppliers(ctx),
		listInventoryItems(ctx),
	]);

	const brandCounts = new Map<string, number>();
	const categoryCounts = new Map<string, number>();
	const supplierCounts = new Map<string, number>();
	for (const item of items) {
		if (item.brand_id)
			brandCounts.set(item.brand_id, (brandCounts.get(item.brand_id) ?? 0) + 1);
		if (item.category_id)
			categoryCounts.set(
				item.category_id,
				(categoryCounts.get(item.category_id) ?? 0) + 1,
			);
		if (item.supplier_id)
			supplierCounts.set(
				item.supplier_id,
				(supplierCounts.get(item.supplier_id) ?? 0) + 1,
			);
	}

	return (
		<InventoryOptionsPanel
			brands={brands}
			categories={categories}
			suppliers={suppliers}
			brandCounts={Object.fromEntries(brandCounts)}
			categoryCounts={Object.fromEntries(categoryCounts)}
			supplierCounts={Object.fromEntries(supplierCounts)}
		/>
	);
}
