"use client";

import { usePathname } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

const TABS = [
	{ key: "/config/outlets", label: "Outlets", href: "/config/outlets" },
	{ key: "/config/taxes", label: "Taxes", href: "/config/taxes" },
] as const;

export function ConfigTabs() {
	const pathname = usePathname();
	const active =
		TABS.find((t) => pathname.startsWith(t.key))?.key ?? TABS[0].key;
	return (
		<SegmentedTabs
			aria-label="Config sections"
			active={active}
			tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: t.href }))}
		/>
	);
}
