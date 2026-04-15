"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const TABS = [
	{ label: "Products", href: "/inventory" },
	{ label: "Inventory Options", href: "/inventory/options" },
	{ label: "Unit of Measurement", href: "/inventory/uom" },
] as const;

export function InventoryTabs() {
	const pathname = usePathname();
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [pendingHref, setPendingHref] = useState<string | null>(null);

	return (
		<nav className="flex gap-1 border-b">
			{TABS.map((tab) => {
				const routeActive = pathname === tab.href;
				const optimisticActive = isPending
					? pendingHref === tab.href
					: routeActive;
				return (
					<Link
						key={tab.href}
						href={tab.href}
						prefetch
						onClick={(e) => {
							if (routeActive) return;
							e.preventDefault();
							setPendingHref(tab.href);
							startTransition(() => {
								router.push(tab.href);
							});
						}}
						className={cn(
							"relative px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground",
							optimisticActive && "text-foreground",
						)}
					>
						{tab.label}
						{optimisticActive && (
							<span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
						)}
					</Link>
				);
			})}
		</nav>
	);
}
