import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { CustomersContent } from "./customers-content";

export default function CustomersPage() {
	return (
		<div className="flex flex-col gap-4">
			<h2 className="font-semibold text-lg">Customers</h2>
			<Suspense
				fallback={<TableSkeleton columns={7} rows={8} showHeader={false} />}
			>
				<CustomersContent />
			</Suspense>
		</div>
	);
}
