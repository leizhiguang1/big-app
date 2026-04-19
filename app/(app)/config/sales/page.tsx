import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";
import { BillingTab } from "@/components/config/sales/BillingTab";
import { DiscountsTab } from "@/components/config/sales/DiscountsTab";
import { getServerContext } from "@/lib/context/server";
import { getBillingSettings } from "@/lib/services/billing-settings";
import { listTaxes } from "@/lib/services/taxes";

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

	let billingData: {
		billingSettings: Awaited<ReturnType<typeof getBillingSettings>>;
		taxes: Awaited<ReturnType<typeof listTaxes>>;
	} | null = null;
	if (active.key === "billing") {
		const ctx = await getServerContext();
		const [billingSettings, taxes] = await Promise.all([
			getBillingSettings(ctx),
			listTaxes(ctx),
		]);
		billingData = { billingSettings, taxes };
	}

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel={active.label}
			/>
			{active.key === "discounts" && <DiscountsTab />}
			{active.key === "billing" && billingData && (
				<BillingTab
					billingSettings={billingData.billingSettings}
					taxes={billingData.taxes}
				/>
			)}
			{!["discounts", "billing"].includes(active.key) && (
				<ComingSoonCard sectionLabel={active.label} />
			)}
		</>
	);
}
