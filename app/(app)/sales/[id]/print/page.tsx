import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintableInvoice } from "@/components/sales/PrintableInvoice";
import { PrintNowButton } from "@/components/sales/PrintNowButton";
import { Button } from "@/components/ui/button";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import { getCustomer } from "@/lib/services/customers";
import { getOutlet } from "@/lib/services/outlets";
import {
	getSalesOrder,
	listPaymentsForOrder,
	listSaleItems,
} from "@/lib/services/sales";

export default async function SalesOrderPrintPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const ctx = await getServerContext();
	try {
		const [order, items, payments] = await Promise.all([
			getSalesOrder(ctx, id),
			listSaleItems(ctx, id),
			listPaymentsForOrder(ctx, id),
		]);

		const [outlet, customer] = await Promise.all([
			order.outlet ? getOutlet(ctx, order.outlet.id) : Promise.resolve(null),
			order.customer
				? getCustomer(ctx, order.customer.id).catch(() => null)
				: Promise.resolve(null),
		]);

		return (
			<>
				<div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
					<Button asChild variant="outline" size="sm">
						<Link href={`/sales/${id}`}>Back</Link>
					</Button>
					<PrintNowButton />
				</div>
				<PrintableInvoice
					order={order}
					items={items}
					payments={payments}
					outlet={outlet}
					customer={customer}
				/>
			</>
		);
	} catch (err) {
		if (err instanceof NotFoundError) notFound();
		throw err;
	}
}
