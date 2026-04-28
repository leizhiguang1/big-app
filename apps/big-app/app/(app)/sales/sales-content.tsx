import { SalesOrdersTableWithDetail } from "@/components/sales/SalesOrdersTableWithDetail";
import { getServerContext } from "@/lib/context/server";
import { listSalesOrders } from "@/lib/services/sales";

export async function SalesOrdersContent() {
	const ctx = await getServerContext();
	const orders = await listSalesOrders(ctx);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between text-muted-foreground text-sm">
				<span>
					{orders.length} sales order{orders.length === 1 ? "" : "s"}
				</span>
			</div>
			<SalesOrdersTableWithDetail orders={orders} />
		</div>
	);
}
