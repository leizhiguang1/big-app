import {
	Banknote,
	CreditCard,
	FileText,
	Receipt,
} from "lucide-react";
import { getServerContext } from "@/lib/context/server";
import { getSalesSummary } from "@/lib/services/sales";

function money(n: number) {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export async function SalesSummaryContent() {
	const ctx = await getServerContext();
	const summary = await getSalesSummary(ctx);

	const cards = [
		{
			label: "Total Sales",
			value: `MYR ${money(summary.totalSales)}`,
			sub: `${summary.orderCount} order${summary.orderCount === 1 ? "" : "s"}`,
			icon: <Banknote className="size-5" />,
		},
		{
			label: "Total Payments",
			value: `MYR ${money(summary.totalPayments)}`,
			sub: `${summary.paymentCount} payment${summary.paymentCount === 1 ? "" : "s"}`,
			icon: <CreditCard className="size-5" />,
		},
		{
			label: "Orders Today",
			value: String(summary.orderCount),
			sub: "Sales orders created",
			icon: <FileText className="size-5" />,
		},
		{
			label: "Payments Today",
			value: String(summary.paymentCount),
			sub: "Payment records",
			icon: <Receipt className="size-5" />,
		},
	];

	return (
		<div className="flex flex-col gap-6">
			<div className="text-muted-foreground text-sm">
				Today&apos;s summary
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{cards.map((c) => (
					<div
						key={c.label}
						className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm"
					>
						<div className="mt-0.5 text-muted-foreground">{c.icon}</div>
						<div className="min-w-0">
							<p className="text-muted-foreground text-xs">{c.label}</p>
							<p className="font-semibold text-lg tabular-nums">{c.value}</p>
							<p className="text-muted-foreground text-xs">{c.sub}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
