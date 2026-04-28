"use client";

import { Package, Pill, ShoppingBag } from "lucide-react";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type {
	ServiceInventoryLink,
	ServiceWithCategory,
} from "@/lib/services/services";

type Props = {
	lineItems: AppointmentLineItem[];
	services: ServiceWithCategory[];
};

const qtyFormatter = new Intl.NumberFormat("en-MY", {
	maximumFractionDigits: 3,
});

const KIND_ICON: Record<
	"product" | "consumable" | "medication",
	typeof Package
> = {
	product: ShoppingBag,
	consumable: Package,
	medication: Pill,
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
						const links = svc?.inventory_links ?? [];
						const lineQty = Number(line.quantity ?? 1);
						return (
							<div key={line.id} className="flex flex-col gap-1 py-1.5">
								<div className="truncate font-medium text-[11px]">
									{line.description}
								</div>
								{links.length === 0 ? (
									<div className="text-[10px] text-muted-foreground/60 italic">
										No consumables linked to this service
									</div>
								) : (
									<ul className="flex flex-col gap-0.5 pl-1.5">
										{links.map((l) => (
											<LinkRow
												key={l.inventory_item_id}
												link={l}
												lineQty={lineQty}
											/>
										))}
									</ul>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

function LinkRow({
	link,
	lineQty,
}: {
	link: ServiceInventoryLink;
	lineQty: number;
}) {
	const name = link.item?.name ?? "Unknown item";
	const sku = link.item?.sku ?? link.inventory_item_id.slice(0, 8);
	const kind = link.item?.kind ?? "consumable";
	const Icon = KIND_ICON[kind];
	const totalQty = link.default_quantity * lineQty;
	return (
		<li className="flex items-center gap-1.5 text-[10px]">
			<Icon className="size-3 shrink-0 text-muted-foreground" />
			<span className="min-w-0 flex-1 truncate">
				<span className="font-medium">{name}</span>{" "}
				<span className="font-mono text-muted-foreground/80">· {sku}</span>
			</span>
			<span className="shrink-0 tabular-nums text-muted-foreground">
				× {qtyFormatter.format(totalQty)}
			</span>
		</li>
	);
}
