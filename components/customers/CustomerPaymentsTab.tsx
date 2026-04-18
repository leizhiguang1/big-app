import Link from "next/link";
import type { PaymentWithRelations } from "@/lib/services/sales";

type Props = {
	payments: PaymentWithRelations[];
};

function formatMoney(n: number | string | null | undefined): string {
	return Number(n ?? 0).toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function formatDateTime(iso: string): string {
	const d = new Date(iso);
	return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

export function CustomerPaymentsTab({ payments }: Props) {
	if (payments.length === 0) {
		return (
			<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
				No payments yet.
			</div>
		);
	}

	const total = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm">
				<span className="text-muted-foreground text-xs uppercase">
					Total collected
				</span>
				<span className="font-semibold text-emerald-600 tabular-nums">
					MYR {formatMoney(total)}
				</span>
			</div>

			<div className="rounded-xl border bg-card shadow-sm">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
							<th className="px-3 py-2 text-left font-medium">Paid At</th>
							<th className="px-3 py-2 text-left font-medium">Invoice</th>
							<th className="px-3 py-2 text-left font-medium">SO</th>
							<th className="px-3 py-2 text-left font-medium">Method</th>
							<th className="px-3 py-2 text-left font-medium">Reference</th>
							<th className="px-3 py-2 text-right font-medium">Amount</th>
							<th className="px-3 py-2 text-left font-medium">Processed By</th>
						</tr>
					</thead>
					<tbody>
						{payments.map((p) => (
							<tr
								key={p.id}
								className="border-b last:border-b-0 hover:bg-muted/30"
							>
								<td className="px-3 py-2 text-[12px]">
									{formatDateTime(p.paid_at)}
								</td>
								<td className="px-3 py-2 font-mono text-[12px]">
									{p.invoice_no}
								</td>
								<td className="px-3 py-2 font-mono text-[12px]">
									{p.sales_order ? (
										<Link
											href={`/sales/${p.sales_order.id}`}
											className="text-sky-700 hover:underline"
										>
											{p.sales_order.so_number}
										</Link>
									) : (
										"—"
									)}
								</td>
								<td className="px-3 py-2">
									{p.method?.name ?? p.payment_mode}
									{p.card_type && (
										<span className="ml-1 text-muted-foreground text-[11px]">
											({p.card_type})
										</span>
									)}
								</td>
								<td className="px-3 py-2 text-muted-foreground text-[12px]">
									{p.reference_no ||
										p.approval_code ||
										p.trace_no ||
										p.bank ||
										"—"}
								</td>
								<td className="px-3 py-2 text-right font-semibold tabular-nums">
									{formatMoney(p.amount)}
								</td>
								<td className="px-3 py-2 text-muted-foreground">
									{p.processed_by_employee
										? `${p.processed_by_employee.first_name} ${p.processed_by_employee.last_name}`
										: "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
