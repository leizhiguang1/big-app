import { Suspense } from "react";
import { SalesTabs } from "@/components/sales/SalesTabs";
import { SALES_TABS, type SalesTabKey } from "@/components/sales/tabs";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { CancellationsContent } from "./cancellations-content";
import { PaymentsContent } from "./payments-content";
import { SalesOrdersContent } from "./sales-content";
import { SalesSummaryContent } from "./summary-content";

const VALID_TABS = new Set(SALES_TABS.map((t) => t.key));

const DEFERRED_TABS = new Set<SalesTabKey>(["payor", "petty-cash", "self-bill"]);

type PageProps = {
	searchParams: Promise<{ tab?: string }>;
};

export default async function SalesPage({ searchParams }: PageProps) {
	const { tab } = await searchParams;
	const active: SalesTabKey =
		tab && VALID_TABS.has(tab as SalesTabKey) ? (tab as SalesTabKey) : "sales";

	return (
		<div className="flex flex-col gap-4">
			<h2 className="font-semibold text-lg">Sales</h2>
			<SalesTabs active={active} />

			{active === "summary" && (
				<Suspense fallback={<SummarySkeleton />}>
					<SalesSummaryContent />
				</Suspense>
			)}

			{active === "sales" && (
				<Suspense
					fallback={<TableSkeleton columns={6} rows={8} showHeader={false} />}
				>
					<SalesOrdersContent />
				</Suspense>
			)}

			{active === "payment" && (
				<Suspense
					fallback={<TableSkeleton columns={7} rows={8} showHeader={false} />}
				>
					<PaymentsContent />
				</Suspense>
			)}

			{active === "cancelled" && (
				<Suspense
					fallback={<TableSkeleton columns={7} rows={8} showHeader={false} />}
				>
					<CancellationsContent />
				</Suspense>
			)}

			{DEFERRED_TABS.has(active) && (
				<div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed bg-card text-muted-foreground text-sm">
					{SALES_TABS.find((t) => t.key === active)?.label} — Phase 2.
				</div>
			)}
		</div>
	);
}

function SummarySkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{Array.from({ length: 4 }).map((_, i) => (
				<div
					key={`skel-${
						// biome-ignore lint: static list
						i
					}`}
					className="h-24 animate-pulse rounded-lg border bg-muted/30"
				/>
			))}
		</div>
	);
}
