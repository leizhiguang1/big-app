import { PaymentsTable } from "@/components/sales/PaymentsTable";
import { getServerContext } from "@/lib/context/server";
import { listPayments } from "@/lib/services/sales";

export async function PaymentsContent() {
	const ctx = await getServerContext();
	const payments = await listPayments(ctx);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between text-muted-foreground text-sm">
				<span>
					{payments.length} payment record{payments.length === 1 ? "" : "s"}
				</span>
			</div>
			<PaymentsTable payments={payments} />
		</div>
	);
}
