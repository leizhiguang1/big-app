import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="flex flex-col gap-6">
			<Skeleton className="h-6 w-40" />
			<Skeleton className="h-64 w-full rounded-lg" />
		</div>
	);
}
