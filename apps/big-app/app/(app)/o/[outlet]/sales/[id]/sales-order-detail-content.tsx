import Link from "next/link";
import { SalesOrderDetailView } from "@/components/sales/SalesOrderDetailView";
import { Button } from "@/components/ui/button";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import { getBrand } from "@/lib/services/brands";
import { getCustomer } from "@/lib/services/customers";
import { listEmployees } from "@/lib/services/employees";
import { getOutlet } from "@/lib/services/outlets";
import {
	getSalesOrder,
	listIncentivesForOrder,
	listPaymentAllocationsForOrder,
	listPaymentsForOrder,
	listRefundNotesForOrder,
	listSaleItems,
} from "@/lib/services/sales";
import { outletPath } from "@/lib/outlet-path";

export async function SalesOrderDetailContent({
	id,
	outletCode,
	autoPrint,
}: {
	id: string;
	outletCode: string;
	autoPrint?: boolean;
}) {
	const ctx = await getServerContext();

	try {
		const [
			order,
			items,
			payments,
			refundNotes,
			allocations,
			incentives,
			employees,
		] = await Promise.all([
			getSalesOrder(ctx, id),
			listSaleItems(ctx, id),
			listPaymentsForOrder(ctx, id),
			listRefundNotesForOrder(ctx, id),
			listPaymentAllocationsForOrder(ctx, id),
			listIncentivesForOrder(ctx, id),
			listEmployees(ctx),
		]);

		const [outlet, customer, brand] = await Promise.all([
			order.outlet ? getOutlet(ctx, order.outlet.id) : Promise.resolve(null),
			order.customer
				? getCustomer(ctx, order.customer.id).catch(() => null)
				: Promise.resolve(null),
			getBrand(ctx).catch(() => null),
		]);

		return (
			<SalesOrderDetailView
				order={order}
				items={items}
				payments={payments}
				refundNotes={refundNotes}
				allocations={allocations}
				incentives={incentives}
				employees={employees.filter((e) => e.is_active)}
				outlet={outlet}
				customer={customer}
				brand={brand}
				autoPrint={autoPrint}
			/>
		);
	} catch (err) {
		if (err instanceof NotFoundError) {
			return <NotFoundPanel outletCode={outletCode} />;
		}
		throw err;
	}
}

function NotFoundPanel({ outletCode }: { outletCode: string }) {
	return (
		<div className="flex flex-col items-center gap-4 rounded-md border bg-muted/30 p-12 text-center">
			<div className="font-medium text-base">Sales order not found</div>
			<div className="max-w-md text-muted-foreground text-sm">
				The sales order you're looking for may have been removed, or the link is
				no longer valid.
			</div>
			<Button asChild size="sm">
				<Link href={outletPath(outletCode, "/sales")}>Back to sales</Link>
			</Button>
		</div>
	);
}
