import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentDetailContent } from "./appointment-detail-content";

export default async function AppointmentDetailPage({
	params,
}: {
	params: Promise<{ outlet: string; ref: string }>;
}) {
	const { outlet, ref } = await params;
	return (
		<Suspense fallback={<Skeleton className="h-[600px] w-full rounded-md" />}>
			<AppointmentDetailContent bookingRef={ref} outletCode={outlet} />
		</Suspense>
	);
}
