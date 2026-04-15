"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SALES_TABS, type SalesTabKey } from "@/components/sales/tabs";
import { cn } from "@/lib/utils";

type Props = {
	active: SalesTabKey;
};

export function SalesTabs({ active }: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [pendingKey, setPendingKey] = useState<SalesTabKey | null>(null);
	const displayed = isPending && pendingKey ? pendingKey : active;

	return (
		<div className="overflow-x-auto">
			<div className="flex min-w-max items-stretch gap-0 rounded-full border bg-card p-1 shadow-sm">
				{SALES_TABS.map((t) => {
					const isActive = t.key === displayed;
					return (
						<Link
							key={t.key}
							href={`/sales?tab=${t.key}`}
							prefetch
							onClick={(e) => {
								if (t.key === active) return;
								e.preventDefault();
								setPendingKey(t.key);
								startTransition(() => {
									router.push(`/sales?tab=${t.key}`);
								});
							}}
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
