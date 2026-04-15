import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<Skeleton className="h-6 w-32" />
				<Skeleton className="h-9 w-36" />
			</div>
			<Skeleton className="h-[calc(100vh-14rem)] min-h-[450px] w-full rounded-md" />
		</div>
	);
}
