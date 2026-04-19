import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import { CategoryTab } from "@/components/config/services/CategoryTab";
import { ReceiptTab } from "@/components/config/services/ReceiptTab";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";

type PageProps = {
	searchParams: Promise<{ section?: string }>;
};

export default async function ServicesConfigPage({ searchParams }: PageProps) {
	const { section } = await searchParams;
	const category = findCategory("services");
	if (!category) return null;

	const active = resolveSection(category, section);

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel={active.label}
			/>
			{active.key === "receipt" && <ReceiptTab />}
			{active.key === "category" && <CategoryTab />}
			{!["receipt", "category"].includes(active.key) && (
				<ComingSoonCard sectionLabel={active.label} />
			)}
		</>
	);
}
