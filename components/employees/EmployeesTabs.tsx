"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
	{ label: "Listing", href: "/employees" },
	{ label: "Roles", href: "/employees/roles" },
	{ label: "Positions", href: "/employees/positions" },
	{ label: "Commission", href: "/employees/commission" },
] as const;

export function EmployeesTabs() {
	const pathname = usePathname();
	return (
		<nav className="flex gap-1 border-b">
			{TABS.map((tab) => {
				const active = pathname === tab.href;
				return (
					<Link
						key={tab.href}
						href={tab.href}
						className={cn(
							"relative px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
							active && "text-foreground",
						)}
					>
						{tab.label}
						{active && (
							<span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
						)}
					</Link>
				);
			})}
		</nav>
	);
}
