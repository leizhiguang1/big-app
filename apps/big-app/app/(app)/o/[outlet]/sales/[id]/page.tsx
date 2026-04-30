import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesOrderDetailContent } from "./sales-order-detail-content";

export default async function SalesOrderDetailPage({
	params,
	searchParams,
}: {
	params: Promise<{ outlet: string; id: string }>;
	searchParams: Promise<{ print?: string }>;
}) {
	const { outlet, id } = await params;
	const { print } = await searchParams;
	return (
		<Suspense fallback={<Skeleton className="h-[600px] w-full rounded-md" />}>
			<SalesOrderDetailContent
				id={id}
				outletCode={outlet}
				autoPrint={print === "1"}
			/>
		</Suspense>
	);
}
