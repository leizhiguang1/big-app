import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { TaxesContent } from "./taxes-content";

export default function TaxesPage() {
	return (
		<Suspense
			fallback={<TableSkeleton columns={4} rows={4} showHeader={false} />}
		>
			<TaxesContent />
		</Suspense>
	);
}
