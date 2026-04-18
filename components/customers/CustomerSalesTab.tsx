import Link from "next/link";
import type { SalesOrderWithRelations } from "@/lib/services/sales";
import { cn } from "@/lib/utils";

type Props = {
	salesOrders: SalesOrderWithRelations[];
};

function formatMoney(n: number | string | null | undefined): string {
	return Number(n ?? 0).toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

export function CustomerSalesTab({ salesOrders }: Props) {
	if (salesOrders.length === 0) {
		return (
			<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
				No sales orders yet.
			</div>
		);
	}

	return (
		<div className="rounded-xl border bg-card shadow-sm">
			<table className="w-full text-[13px]">
				<thead>
					<tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
						<th className="px-3 py-2 text-left font-medium">SO Number</th>
						<th className="px-3 py-2 text-left font-medium">Sold At</th>
						<th className="px-3 py-2 text-left font-medium">Outlet</th>
						<th className="px-3 py-2 text-right font-medium">Subtotal</th>
						<th className="px-3 py-2 text-right font-medium">Discount</th>
						<th className="px-3 py-2 text-right font-medium">Total</th>
						<th className="px-3 py-2 text-right font-medium">Outstanding</th>
						<th className="px-3 py-2 text-left font-medium">Status</th>
					</tr>
				</thead>
				<tbody>
					{salesOrders.map((so) => (
						<tr
							key={so.id}
							className="border-b last:border-b-0 hover:bg-muted/30"
						>
							<td className="px-3 py-2 font-mono text-[12px]">
								<Link
									href={`/sales/${so.id}`}
									className="text-sky-700 hover:underline"
								>
									{so.so_number}
								</Link>
							</td>
							<td className="px-3 py-2">{formatDate(so.sold_at)}</td>
							<td className="px-3 py-2 text-muted-foreground">
								{so.outlet?.name ?? "—"}
							</td>
							<td className="px-3 py-2 text-right tabular-nums">
								{formatMoney(so.subtotal)}
							</td>
							<td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
								{formatMoney(so.discount)}
							</td>
							<td className="px-3 py-2 text-right font-semibold tabular-nums">
								{formatMoney(so.total)}
							</td>
							<td
								className={cn(
									"px-3 py-2 text-right tabular-nums",
									Number(so.outstanding ?? 0) > 0
										? "font-semibold text-rose-600"
										: "text-muted-foreground",
								)}
							>
								{formatMoney(so.outstanding)}
							</td>
							<td className="px-3 py-2">
								<span
									className={cn(
										"inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
										so.status === "paid" &&
											"border-emerald-300 bg-emerald-50 text-emerald-700",
										so.status === "partial" &&
											"border-amber-300 bg-amber-50 text-amber-700",
										so.status === "unpaid" &&
											"border-rose-300 bg-rose-50 text-rose-700",
										so.status === "cancelled" &&
											"border-slate-300 bg-slate-50 text-slate-600",
										!["paid", "partial", "unpaid", "cancelled"].includes(
											so.status,
										) && "border-slate-300 bg-slate-50 text-slate-700",
									)}
								>
									{so.status}
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
