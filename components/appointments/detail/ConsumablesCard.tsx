"use client";

import { Package } from "lucide-react";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { ServiceWithCategory } from "@/lib/services/services";

type Props = {
	lineItems: AppointmentLineItem[];
	services: ServiceWithCategory[];
};

export function ConsumablesCard({ lineItems, services }: Props) {
	const serviceLines = lineItems.filter((i) => i.item_type === "service");
	const serviceById = new Map(services.map((s) => [s.id, s]));

	return (
		<div className="flex flex-col gap-2 rounded-xl border bg-card p-2.5 text-[11px] shadow-sm">
			<div className="flex items-center gap-1.5 font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
				<Package className="size-3" />
				Consumables
			</div>

			{serviceLines.length === 0 ? (
				<div className="py-3 text-center text-[10px] text-muted-foreground italic">
					Add services in the Billing tab first
				</div>
			) : (
				<div className="flex flex-col divide-y divide-border/60">
					{serviceLines.map((line) => {
						const svc = line.service_id
							? serviceById.get(line.service_id)
							: null;
						const text = svc?.consumables?.trim() ?? "";
						return (
							<div key={line.id} className="flex flex-col gap-0.5 py-1.5">
								<div className="truncate font-medium text-[11px]">
									{line.description}
								</div>
								{text ? (
									<div className="whitespace-pre-wrap text-[10px] text-muted-foreground leading-snug">
										{text}
									</div>
								) : (
									<div className="text-[10px] text-muted-foreground/60 italic">
										No consumables defined on this service
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
