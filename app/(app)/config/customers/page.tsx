import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import { GeneralTab } from "@/components/config/customers/GeneralTab";
import { LeadsTab } from "@/components/config/customers/LeadsTab";
import { SecurityTab } from "@/components/config/customers/SecurityTab";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";

type PageProps = {
	searchParams: Promise<{ section?: string }>;
};

export default async function CustomersConfigPage({ searchParams }: PageProps) {
	const { section } = await searchParams;
	const category = findCategory("customers");
	if (!category) return null;

	const active = resolveSection(category, section);

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel={active.label}
			/>
			{active.key === "general" && <GeneralTab />}
			{active.key === "leads" && <LeadsTab />}
			{active.key === "security" && <SecurityTab />}
			{!["general", "leads", "security"].includes(active.key) && (
				<ComingSoonCard sectionLabel={active.label} />
			)}
		</>
	);
}
