import { Suspense } from "react";
import { SalesTabs } from "@/components/sales/SalesTabs";
import { SALES_TABS, type SalesTabKey } from "@/components/sales/tabs";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { CancellationsContent } from "./cancellations-content";
import { PaymentsContent } from "./payments-content";
import { SalesOrdersContent } from "./sales-content";
import { SalesSummaryContent } from "./summary-content";

const VALID_TABS = new Set(SALES_TABS.map((t) => t.key));

const DEFERRED_TABS = new Set<SalesTabKey>([
	"payor",
	"petty-cash",
	"self-bill",
]);

type PageProps = {
	params: Promise<{ outlet: string }>;
	searchParams: Promise<{ tab?: string; o?: string }>;
};

export default async function SalesPage({ params, searchParams }: PageProps) {
	const { outlet: outletCode } = await params;
	const { tab, o } = await searchParams;
	const active: SalesTabKey =
		tab && VALID_TABS.has(tab as SalesTabKey) ? (tab as SalesTabKey) : "sales";

	return (
		<div className="flex flex-col gap-4">
			<h2 className="font-semibold text-lg">Sales</h2>
			<SalesTabs active={active} />

			{active === "summary" && (
				<Suspense fallback={<SummarySkeleton />}>
					<SalesSummaryContent outletCode={outletCode} scope={o} />
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
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div className="h-4 w-48 animate-pulse rounded bg-muted/30" />
				<div className="h-8 w-40 animate-pulse rounded-md bg-muted/30" />
			</div>
			<div className="grid gap-4 lg:grid-cols-2">
				<div className="h-[400px] animate-pulse rounded-xl border bg-muted/20" />
				<div className="h-[400px] animate-pulse rounded-xl border bg-muted/20" />
			</div>
		</div>
	);
}
