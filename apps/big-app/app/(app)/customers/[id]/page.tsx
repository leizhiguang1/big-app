import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerDetailContent } from "./customer-detail-content";

export default async function CustomerDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		<Suspense fallback={<Skeleton className="h-[600px] w-full rounded-md" />}>
			<CustomerDetailContent id={id} />
		</Suspense>
	);
}
