import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { RosterContent } from "./roster-content";

export default function RosterPage({
	params,
	searchParams,
}: {
	params: Promise<{ outlet: string }>;
	searchParams: Promise<{ week?: string }>;
}) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h2 className="font-semibold text-lg">Roster</h2>
				<p className="text-muted-foreground text-sm">
					Weekly staff shifts per outlet.
				</p>
			</div>
			<Suspense
				fallback={<TableSkeleton columns={8} rows={6} showHeader={false} />}
			>
				<RosterContent params={params} searchParams={searchParams} />
			</Suspense>
		</div>
	);
}
