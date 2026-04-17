import { NewPaymentMethodButton } from "@/components/payment-methods/PaymentMethodForm";
import { PaymentMethodsTable } from "@/components/payment-methods/PaymentMethodsTable";
import { getServerContext } from "@/lib/context/server";
import { listPaymentMethods } from "@/lib/services/payment-methods";

export async function PaymentContent() {
	const ctx = await getServerContext();
	const methods = await listPaymentMethods(ctx);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{methods.length} method{methods.length === 1 ? "" : "s"} configured.
					Built-in methods cannot be deleted, only toggled off. Custom methods
					collect a remarks field only.
				</p>
				<NewPaymentMethodButton />
			</div>
			<PaymentMethodsTable methods={methods} />
		</div>
	);
}
