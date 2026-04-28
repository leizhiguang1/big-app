import { Suspense } from "react";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { PaymentContent } from "./payment-content";

export default function PaymentConfigPage() {
	return (
		<>
			<ConfigSectionHeader categoryTitle="Sales" sectionLabel="Payment" />
			<Suspense
				fallback={<TableSkeleton columns={6} rows={7} showHeader={false} />}
			>
				<PaymentContent />
			</Suspense>
		</>
	);
}
