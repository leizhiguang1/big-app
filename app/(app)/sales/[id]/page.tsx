import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesOrderDetailContent } from "./sales-order-detail-content";

export default async function SalesOrderDetailPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ print?: string }>;
}) {
	const { id } = await params;
	const { print } = await searchParams;
	return (
		<Suspense fallback={<Skeleton className="h-[600px] w-full rounded-md" />}>
			<SalesOrderDetailContent id={id} autoPrint={print === "1"} />
		</Suspense>
	);
}
