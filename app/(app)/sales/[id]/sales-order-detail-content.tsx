import Link from "next/link";
import { SalesOrderDetailView } from "@/components/sales/SalesOrderDetailView";
import { Button } from "@/components/ui/button";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import { getCustomer } from "@/lib/services/customers";
import { getOutlet } from "@/lib/services/outlets";
import {
	getSalesOrder,
	listPaymentsForOrder,
	listRefundNotesForOrder,
	listSaleItems,
} from "@/lib/services/sales";

export async function SalesOrderDetailContent({
	id,
	autoPrint,
}: {
	id: string;
	autoPrint?: boolean;
}) {
	const ctx = await getServerContext();

	try {
		const [order, items, payments, refundNotes] = await Promise.all([
			getSalesOrder(ctx, id),
			listSaleItems(ctx, id),
			listPaymentsForOrder(ctx, id),
			listRefundNotesForOrder(ctx, id),
		]);

		const [outlet, customer] = await Promise.all([
			order.outlet ? getOutlet(ctx, order.outlet.id) : Promise.resolve(null),
			order.customer
				? getCustomer(ctx, order.customer.id).catch(() => null)
				: Promise.resolve(null),
		]);

		return (
			<SalesOrderDetailView
				order={order}
				items={items}
				payments={payments}
				refundNotes={refundNotes}
				outlet={outlet}
				customer={customer}
				autoPrint={autoPrint}
			/>
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
