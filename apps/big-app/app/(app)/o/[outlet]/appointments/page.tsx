import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentsContent } from "./appointments-content";

export default function AppointmentsPage({
	params,
	searchParams,
}: {
	params: Promise<{ outlet: string }>;
	searchParams: Promise<{
		view?: string;
		date?: string;
		resource?: string;
	}>;
}) {
	return (
		<Suspense fallback={<Skeleton className="h-[600px] w-full rounded-md" />}>
			<AppointmentsContent params={params} searchParams={searchParams} />
		</Suspense>
	);
}
