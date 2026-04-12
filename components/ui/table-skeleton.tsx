import { Skeleton } from "@/components/ui/skeleton";

type Props = {
	rows?: number;
	columns?: number;
	showHeader?: boolean;
	showToolbar?: boolean;
};

export function TableSkeleton({
	rows = 8,
	columns = 5,
	showHeader = true,
	showToolbar = true,
}: Props) {
	return (
		<div className="flex flex-col gap-4">
			{showHeader && (
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-2">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-4 w-24" />
					</div>
					<Skeleton className="h-9 w-32" />
				</div>
			)}
			{showToolbar && (
				<div className="flex items-center gap-2">
					<Skeleton className="h-9 max-w-sm flex-1" />
				</div>
			)}
			<div className="overflow-hidden rounded-lg border">
				<div className="border-b bg-muted/40 px-3 py-2">
					<div
						className="grid gap-3"
						style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
					>
						{Array.from({ length: columns }).map((_, i) => (
							<Skeleton key={i} className="h-4 w-20" />
						))}
					</div>
				</div>
				<div className="divide-y">
					{Array.from({ length: rows }).map((_, r) => (
						<div key={r} className="px-3 py-3">
							<div
								className="grid gap-3"
								style={{
									gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
								}}
							>
								{Array.from({ length: columns }).map((_, c) => (
									<Skeleton key={c} className="h-4 w-full max-w-[140px]" />
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
