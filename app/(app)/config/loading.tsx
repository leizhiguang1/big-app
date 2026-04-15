import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="flex flex-col gap-4">
			<div className="mb-2 flex flex-col gap-2 border-border border-b pb-4">
				<Skeleton className="h-3 w-24" />
				<Skeleton className="h-7 w-64" />
			</div>
			<Skeleton className="h-48 rounded-xl" />
		</div>
	);
}
