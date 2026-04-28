"use client";

import { usePathname } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

const TABS = [
	{ key: "/inventory", label: "Products", href: "/inventory" },
	{
		key: "/inventory/options",
		label: "Inventory options",
		href: "/inventory/options",
	},
	{
		key: "/inventory/uom",
		label: "Unit of measurement",
		href: "/inventory/uom",
	},
] as const;

export function InventoryTabs() {
	const pathname = usePathname();
	return (
		<SegmentedTabs
			aria-label="Inventory sections"
			active={pathname}
			tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: t.href }))}
		/>
	);
}
