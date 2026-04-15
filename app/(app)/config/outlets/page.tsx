import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { OutletsContent } from "./outlets-content";

export default function OutletsPage() {
	return (
		<Suspense
			fallback={<TableSkeleton columns={5} rows={6} showHeader={false} />}
		>
			<OutletsContent />
		</Suspense>
	);
}
