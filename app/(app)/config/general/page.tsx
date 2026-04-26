import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";
import { GeneralTab } from "@/components/config/general/GeneralTab";
import { RemarksTab } from "@/components/config/general/RemarksTab";
import { SalutationTab } from "@/components/config/general/SalutationTab";
import { SecurityTab } from "@/components/config/general/SecurityTab";
import { TimezoneTab } from "@/components/config/general/TimezoneTab";
import { getServerContext } from "@/lib/context/server";
import { getBrand } from "@/lib/services/brands";

type PageProps = {
	searchParams: Promise<{ section?: string }>;
};

export default async function GeneralPage({ searchParams }: PageProps) {
	const { section } = await searchParams;
	const category = findCategory("general");
	if (!category) return null;

	const active = resolveSection(category, section);

	const brand =
		active.key === "general" ? await getBrand(await getServerContext()) : null;

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel={active.label}
			/>
			{active.key === "general" && brand && <GeneralTab brand={brand} />}
			{active.key === "timezone" && <TimezoneTab />}
			{active.key === "remarks" && <RemarksTab />}
			{active.key === "salutation" && <SalutationTab />}
			{active.key === "security" && <SecurityTab />}
			{!["general", "timezone", "remarks", "salutation", "security"].includes(
				active.key,
			) && <ComingSoonCard sectionLabel={active.label} />}
		</>
	);
}
