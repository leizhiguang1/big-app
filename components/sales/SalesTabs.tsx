"use client";

import Link from "next/link";
import { SALES_TABS, type SalesTabKey } from "@/components/sales/tabs";
import { cn } from "@/lib/utils";

type Props = {
	active: SalesTabKey;
};

export function SalesTabs({ active }: Props) {
	return (
		<div className="overflow-x-auto">
			<div className="flex min-w-max items-stretch gap-0 rounded-full border bg-card p-1 shadow-sm">
				{SALES_TABS.map((t) => {
					const isActive = t.key === active;
					return (
						<Link
							key={t.key}
							href={`/sales?tab=${t.key}`}
							className={cn(
								"rounded-full px-5 py-2 font-medium text-sm transition",
								isActive
									? "bg-blue-600 text-white shadow-sm"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{t.label}
						</Link>
					);
				})}
			</div>
		</div>
	);
}
