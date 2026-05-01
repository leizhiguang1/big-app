import { SummaryCashBarChart } from "@/components/sales/SummaryCashBarChart";
import {
	type DonutSlice,
	SummaryDonutChart,
} from "@/components/sales/SummaryDonutChart";
import { SummaryOutletPicker } from "@/components/sales/SummaryOutletPicker";
import { getServerContext } from "@/lib/context/server";
import { listOutlets } from "@/lib/services/outlets";
import {
	getCashSummary,
	getSaleItemBreakdownByType,
} from "@/lib/services/sales";

const ITEM_TYPE_LABEL: Record<string, string> = {
	service: "Services",
	product: "Products",
	inventory: "Products",
};

function labelForItemType(t: string): string {
	if (ITEM_TYPE_LABEL[t]) return ITEM_TYPE_LABEL[t];
	return t.charAt(0).toUpperCase() + t.slice(1);
}

function todayLabel(): string {
	return new Date().toLocaleDateString("en-MY", {
		weekday: "short",
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

export async function SalesSummaryContent({
	outletCode,
	scope,
}: {
	outletCode: string;
	scope?: string;
}) {
	const ctx = await getServerContext();
	const outlets = await listOutlets(ctx);
	const activeOutlets = outlets
		.filter((o) => o.is_active)
		.map((o) => ({ code: o.code, name: o.name, id: o.id }));

	const requested = scope ?? outletCode;
	const value: "all" | string =
		requested === "all"
			? "all"
			: (activeOutlets.find((o) => o.code === requested)?.code ?? outletCode);

	const outletId =
		value === "all"
			? null
			: (activeOutlets.find((o) => o.code === value)?.id ?? null);

	const [breakdown, cash] = await Promise.all([
		getSaleItemBreakdownByType(ctx, { outletId }),
		getCashSummary(ctx, { outletId }),
	]);

	const slices: DonutSlice[] = breakdown.map((b) => ({
		key: b.item_type,
		label: labelForItemType(b.item_type),
		value: b.total,
	}));

	const scopeLabel =
		value === "all"
			? "All Outlets"
			: (activeOutlets.find((o) => o.code === value)?.name ?? value);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="text-muted-foreground text-sm">
					{todayLabel()} · <span className="font-medium">{scopeLabel}</span>
				</div>
				<SummaryOutletPicker
					outlets={activeOutlets.map(({ code, name }) => ({ code, name }))}
					value={value}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<div className="rounded-xl border bg-card p-4 shadow-sm">
					<div className="mb-1 flex items-center justify-between">
						<h3 className="font-semibold text-sm">Daily Transaction Summary</h3>
					</div>
					<p className="text-muted-foreground text-xs">
						Sales split by item type
					</p>
					<div className="mt-4">
						<SummaryDonutChart slices={slices} />
					</div>
				</div>

				<div className="rounded-xl border bg-card p-4 shadow-sm">
					<div className="mb-1 flex items-center justify-between">
						<h3 className="font-semibold text-sm">Cash Summary</h3>
					</div>
					<p className="text-muted-foreground text-xs">
						Cash movement, payments collected, and outstanding balances
					</p>
					<div className="mt-4">
						<SummaryCashBarChart data={cash} />
					</div>
				</div>
			</div>
		</div>
	);
}
