import { PaymentsTableWithDetail } from "@/components/sales/PaymentsTableWithDetail";
import { getServerContext } from "@/lib/context/server";
import { listOutlets } from "@/lib/services/outlets";
import { listPayments } from "@/lib/services/sales";

export async function PaymentsContent() {
	const ctx = await getServerContext();
	const [payments, outlets] = await Promise.all([
		listPayments(ctx),
		listOutlets(ctx),
	]);

	return (
		<div className="flex flex-col gap-3">
			<PaymentsTableWithDetail payments={payments} outlets={outlets} />
		</div>
	);
}
