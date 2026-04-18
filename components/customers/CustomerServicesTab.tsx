import { useMemo } from "react";
import type { CustomerLineItem } from "@/lib/services/appointment-line-items";

type Props = {
	lineItems: CustomerLineItem[];
};

function formatMoney(n: number): string {
	return n.toLocaleString("en-MY", {
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

type ServiceAggregate = {
	key: string;
	name: string;
	sku: string | null;
	quantity: number;
	totalSpent: number;
	visits: number;
	lastUsedAt: string | null;
};

export function CustomerServicesTab({ lineItems }: Props) {
	const aggregates = useMemo<ServiceAggregate[]>(() => {
		const serviceItems = lineItems.filter((li) => li.item_type === "service");
		const map = new Map<string, ServiceAggregate>();
		const visitsByKey = new Map<string, Set<string>>();

		for (const li of serviceItems) {
			const key =
				li.service_id ?? li.service?.sku ?? li.description ?? "unknown";
			const name = li.service?.name ?? li.description ?? "—";
			const sku = li.service?.sku ?? null;
			const qty = Number(li.quantity);
			const line = Number(li.unit_price) * qty;
			const appointmentKey = li.appointment_id;
			const startAt = li.appointment?.start_at ?? null;

			let agg = map.get(key);
			if (!agg) {
				agg = {
					key,
					name,
					sku,
					quantity: 0,
					totalSpent: 0,
					visits: 0,
					lastUsedAt: null,
				};
				map.set(key, agg);
				visitsByKey.set(key, new Set());
			}
			agg.quantity += qty;
			agg.totalSpent += line;
			visitsByKey.get(key)?.add(appointmentKey);
			if (
				startAt &&
				(!agg.lastUsedAt || new Date(startAt) > new Date(agg.lastUsedAt))
			) {
				agg.lastUsedAt = startAt;
			}
		}

		for (const [key, set] of visitsByKey) {
			const agg = map.get(key);
			if (agg) agg.visits = set.size;
		}

		return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
	}, [lineItems]);

	if (aggregates.length === 0) {
		return (
			<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
				No services performed yet.
			</div>
		);
	}

	return (
		<div className="rounded-xl border bg-card shadow-sm">
			<table className="w-full text-[13px]">
				<thead>
					<tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
						<th className="px-3 py-2 text-left font-medium">Service</th>
						<th className="px-3 py-2 text-left font-medium">SKU</th>
						<th className="px-3 py-2 text-right font-medium">Quantity</th>
						<th className="px-3 py-2 text-right font-medium">Visits</th>
						<th className="px-3 py-2 text-right font-medium">Total Spent</th>
						<th className="px-3 py-2 text-left font-medium">Last Used</th>
					</tr>
				</thead>
				<tbody>
					{aggregates.map((a) => (
						<tr
							key={a.key}
							className="border-b last:border-b-0 hover:bg-muted/30"
						>
							<td className="px-3 py-2 font-medium">{a.name}</td>
							<td className="px-3 py-2 font-mono text-[12px] text-muted-foreground">
								{a.sku ?? "—"}
							</td>
							<td className="px-3 py-2 text-right tabular-nums">
								{a.quantity}
							</td>
							<td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
								{a.visits}
							</td>
							<td className="px-3 py-2 text-right font-semibold tabular-nums">
								MYR {formatMoney(a.totalSpent)}
							</td>
							<td className="px-3 py-2 text-muted-foreground">
								{a.lastUsedAt ? formatDate(a.lastUsedAt) : "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
