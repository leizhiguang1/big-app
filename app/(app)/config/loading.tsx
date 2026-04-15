import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="flex flex-col gap-6">
			<Skeleton className="h-6 w-40" />
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-28 rounded-lg" />
				))}
			</div>
		</div>
	);
}
