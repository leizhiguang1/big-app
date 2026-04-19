import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import { BillingTab } from "@/components/config/sales/BillingTab";
import { DiscountsTab } from "@/components/config/sales/DiscountsTab";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";

type PageProps = {
	searchParams: Promise<{ section?: string }>;
};

export default async function SalesConfigPage({ searchParams }: PageProps) {
	const { section } = await searchParams;
	const category = findCategory("sales");
	if (!category) return null;

	const active = resolveSection(category, section);

	// Payment section has its own static route at /config/sales/payment
	if (active.key === "payment" || active.href) {
		return (
			<>
				<ConfigSectionHeader
					categoryTitle={category.title}
					sectionLabel={active.label}
				/>
				<ComingSoonCard sectionLabel={active.label} />
			</>
		);
	}

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel={active.label}
			/>
			{active.key === "discounts" && <DiscountsTab />}
			{active.key === "billing" && <BillingTab />}
			{!["discounts", "billing"].includes(active.key) && (
				<ComingSoonCard sectionLabel={active.label} />
			)}
		</>
	);
}
