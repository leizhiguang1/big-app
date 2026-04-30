import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentsContent } from "./appointments-content";

export default function AppointmentsPage({
	searchParams,
}: {
	searchParams: Promise<{
		outlet?: string;
		view?: string;
		date?: string;
		resource?: string;
	}>;
}) {
	return (
		<Suspense fallback={<Skeleton className="h-[600px] w-full rounded-md" />}>
			<AppointmentsContent searchParams={searchParams} />
		</Suspense>
	);
}
