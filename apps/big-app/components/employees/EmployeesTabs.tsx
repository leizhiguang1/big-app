"use client";

import { usePathname } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

const TABS = [
	{ key: "/employees", label: "Listing", href: "/employees" },
	{ key: "/employees/roles", label: "Roles", href: "/employees/roles" },
	{
		key: "/employees/positions",
		label: "Positions",
		href: "/employees/positions",
	},
	{
		key: "/employees/commission",
		label: "Commission",
		href: "/employees/commission",
	},
] as const;

export function EmployeesTabs() {
	const pathname = usePathname();
	return (
		<SegmentedTabs
			aria-label="Employees sections"
			active={pathname}
			tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: t.href }))}
		/>
	);
}
