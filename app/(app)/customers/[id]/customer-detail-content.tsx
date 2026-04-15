import Link from "next/link";
import { CustomerDetailView } from "@/components/customers/CustomerDetailView";
import { Button } from "@/components/ui/button";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import { listLineItemsForCustomer } from "@/lib/services/appointment-line-items";
import { listCustomerTimeline } from "@/lib/services/appointments";
import { getCustomer } from "@/lib/services/customers";

export async function CustomerDetailContent({ id }: { id: string }) {
	const ctx = await getServerContext();

	try {
		const customer = await getCustomer(ctx, id);
		const [timeline, lineItems] = await Promise.all([
			listCustomerTimeline(ctx, id),
			listLineItemsForCustomer(ctx, id),
		]);
		return (
			<CustomerDetailView
				customer={customer}
				timeline={timeline}
				lineItems={lineItems}
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
			<div className="font-medium text-base">Customer not found</div>
			<div className="max-w-md text-muted-foreground text-sm">
				The customer you're looking for has been deleted, or the link is no
				longer valid.
			</div>
			<Button asChild size="sm">
				<Link href="/customers">Back to customers</Link>
			</Button>
		</div>
	);
}
