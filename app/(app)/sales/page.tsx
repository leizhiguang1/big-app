import { Suspense } from "react";
import { SalesTabs } from "@/components/sales/SalesTabs";
import { SALES_TABS, type SalesTabKey } from "@/components/sales/tabs";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { SalesOrdersContent } from "./sales-content";

const VALID_TABS = new Set(SALES_TABS.map((t) => t.key));

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

			{active === "sales" ? (
				<Suspense
					fallback={<TableSkeleton columns={5} rows={8} showHeader={false} />}
				>
					<SalesOrdersContent />
				</Suspense>
			) : (
				<div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed bg-card text-muted-foreground text-sm">
					{SALES_TABS.find((t) => t.key === active)?.label} tab — coming soon.
				</div>
			)}
		</div>
	);
}
