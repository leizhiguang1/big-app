import { SALES_TABS, type SalesTabKey } from "@/components/sales/tabs";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

type Props = {
	active: SalesTabKey;
};

export function SalesTabs({ active }: Props) {
	return (
		<SegmentedTabs
			aria-label="Sales sections"
			active={active}
			tabs={SALES_TABS.map((t) => ({
				key: t.key,
				label: t.label,
				href: `/sales?tab=${t.key}`,
			}))}
		/>
	);
}
