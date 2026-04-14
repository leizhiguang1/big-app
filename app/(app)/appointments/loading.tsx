import { Skeleton } from "@/components/ui/skeleton";

export default function AppointmentsLoading() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-12 w-full rounded-md" />
			<div className="flex justify-end">
				<Skeleton className="h-9 w-36 rounded-md" />
			</div>
			<Skeleton className="h-[calc(100vh-14rem)] min-h-[450px] w-full rounded-md" />
		</div>
	);
}
