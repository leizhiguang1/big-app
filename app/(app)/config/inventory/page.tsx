import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import { BarcodeScanningTab } from "@/components/config/inventory/BarcodeScanningTab";
import { LocationsTab } from "@/components/config/inventory/LocationsTab";
import { OthersTab } from "@/components/config/inventory/OthersTab";
import { RedemptionTab } from "@/components/config/inventory/RedemptionTab";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";

type PageProps = {
	searchParams: Promise<{ section?: string }>;
};

export default async function InventoryConfigPage({ searchParams }: PageProps) {
	const { section } = await searchParams;
	const category = findCategory("inventory");
	if (!category) return null;

	const active = resolveSection(category, section);

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel={active.label}
			/>
			{active.key === "redemption" && <RedemptionTab />}
			{active.key === "barcode-scanning" && <BarcodeScanningTab />}
			{active.key === "locations" && <LocationsTab />}
			{active.key === "others" && <OthersTab />}
			{!["redemption", "barcode-scanning", "locations", "others"].includes(active.key) && (
				<ComingSoonCard sectionLabel={active.label} />
			)}
		</>
	);
}
