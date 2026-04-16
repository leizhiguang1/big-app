import Link from "next/link";
import { SalesOrderDetailView } from "@/components/sales/SalesOrderDetailView";
import { Button } from "@/components/ui/button";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import {
	getSalesOrder,
	listPaymentsForOrder,
	listSaleItems,
} from "@/lib/services/sales";

export async function SalesOrderDetailContent({ id }: { id: string }) {
	const ctx = await getServerContext();

	try {
		const [order, items, payments] = await Promise.all([
			getSalesOrder(ctx, id),
			listSaleItems(ctx, id),
			listPaymentsForOrder(ctx, id),
		]);

		return (
			<SalesOrderDetailView order={order} items={items} payments={payments} />
		);
	} catch (err) {
		if (err instanceof NotFoundError) {
			return <NotFoundPanel />;
		}
		throw err;
	}
}

function NotFoundPanel() {
	return (
		<div className="flex flex-col items-center gap-4 rounded-md border bg-muted/30 p-12 text-center">
			<div className="font-medium text-base">Sales order not found</div>
			<div className="max-w-md text-muted-foreground text-sm">
				The sales order you're looking for may have been removed, or the link is
				no longer valid.
			</div>
			<Button asChild size="sm">
				<Link href="/sales">Back to sales</Link>
			</Button>
		</div>
	);
}
