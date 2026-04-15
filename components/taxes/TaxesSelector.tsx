"use client";

import type { Tax } from "@/lib/services/taxes";

type Props = {
	taxes: Tax[];
	value: string[];
	onChange: (next: string[]) => void;
};

const numberFormatter = new Intl.NumberFormat("en-MY", {
	maximumFractionDigits: 2,
});

export function TaxesSelector({ taxes, value, onChange }: Props) {
	const active = taxes.filter((t) => t.is_active);
	const selected = new Set(value);

	function toggle(id: string) {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		onChange([...next]);
	}

	if (active.length === 0) {
		return (
			<p className="text-muted-foreground text-xs">
				No taxes configured. Add taxes under Config → Taxes.
			</p>
		);
	}

	return (
		<div className="overflow-hidden rounded-md border">
			<table className="w-full text-sm">
				<thead className="bg-muted/50">
					<tr>
						<th className="w-10 px-2 py-1.5" />
						<th className="px-2 py-1.5 text-left font-medium">Name</th>
						<th className="px-2 py-1.5 text-right font-medium">Rate</th>
					</tr>
				</thead>
				<tbody>
					{active.map((t) => {
						const checked = selected.has(t.id);
						return (
							<tr
								key={t.id}
								className="cursor-pointer border-t hover:bg-muted/30"
								onClick={() => toggle(t.id)}
							>
								<td className="px-2 py-1.5">
									<input
										type="checkbox"
										className="size-4"
										checked={checked}
										onChange={() => toggle(t.id)}
										onClick={(e) => e.stopPropagation()}
									/>
								</td>
								<td className="px-2 py-1.5">{t.name}</td>
								<td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
									{numberFormatter.format(Number(t.rate_pct))}%
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
