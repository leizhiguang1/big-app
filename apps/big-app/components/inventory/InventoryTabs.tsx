"use client";

import { usePathname } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useOutletPath } from "@/hooks/use-outlet-path";

const BASE_TABS = [
	{ base: "/inventory", label: "Products" },
	{ base: "/inventory/options", label: "Inventory options" },
	{ base: "/inventory/uom", label: "Unit of measurement" },
] as const;

export function InventoryTabs() {
	const pathname = usePathname();
	const path = useOutletPath();
	const tabs = BASE_TABS.map((t) => {
		const href = path(t.base);
		return { key: href, label: t.label, href };
	});
	return (
		<SegmentedTabs
			aria-label="Inventory sections"
			active={pathname}
			tabs={tabs}
		/>
	);
}
