import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesOrderDetailContent } from "./sales-order-detail-content";

export default async function SalesOrderDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		<Suspense fallback={<Skeleton className="h-[600px] w-full rounded-md" />}>
			<SalesOrderDetailContent id={id} />
		</Suspense>
	);
}
