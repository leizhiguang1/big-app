"use client";

import { usePathname } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useOutletPath } from "@/hooks/use-outlet-path";

const BASE_TABS = [
	{ base: "/employees", label: "Listing" },
	{ base: "/employees/roles", label: "Roles" },
	{ base: "/employees/positions", label: "Positions" },
	{ base: "/employees/commission", label: "Commission" },
] as const;

export function EmployeesTabs() {
	const pathname = usePathname();
	const path = useOutletPath();
	const tabs = BASE_TABS.map((t) => {
		const href = path(t.base);
		return { key: href, label: t.label, href };
	});
	return (
		<SegmentedTabs
			aria-label="Employees sections"
			active={pathname}
			tabs={tabs}
		/>
	);
}
