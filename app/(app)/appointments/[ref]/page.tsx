import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentDetailContent } from "./appointment-detail-content";

export default async function AppointmentDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		<Suspense fallback={<Skeleton className="h-[600px] w-full rounded-md" />}>
			<AppointmentDetailContent id={id} />
		</Suspense>
	);
}
