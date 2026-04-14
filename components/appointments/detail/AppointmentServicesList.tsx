"use client";

import { Stethoscope } from "lucide-react";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";

type Props = {
	entries: AppointmentLineItem[];
	emptyLabel?: string;
	compact?: boolean;
};

export function AppointmentServicesList({
	entries,
	emptyLabel = "No services added",
	compact = false,
}: Props) {
	const services = entries.filter((e) => e.item_type === "service");

	if (services.length === 0) {
		return (
			<div className="text-[11px] text-muted-foreground italic">
				{emptyLabel}
			</div>
		);
	}

	return (
		<ul className={compact ? "space-y-1" : "space-y-1.5"}>
			{services.map((s) => {
				const qty = s.quantity ?? 1;
				return (
					<li
						key={s.id}
						className="flex items-start gap-1.5 text-[11px] leading-tight"
					>
						<Stethoscope className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
						<div className="min-w-0 flex-1 truncate">{s.description}</div>
						{qty > 1 && (
							<span className="shrink-0 text-muted-foreground tabular-nums">
								×{qty}
							</span>
						)}
					</li>
				);
			})}
		</ul>
	);
}
