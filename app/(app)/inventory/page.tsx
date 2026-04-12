import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { InventoryContent } from "./inventory-content";

export default function InventoryPage() {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Inventory</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Products, medications, and consumables. Stock levels and low-stock
					alerts.
				</p>
			</div>
			<Suspense
				fallback={<TableSkeleton columns={9} rows={8} showHeader={false} />}
			>
				<InventoryContent />
			</Suspense>
		</div>
	);
}
