import { Suspense } from "react";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { TaxesContent } from "./taxes-content";

type PageProps = {
	searchParams: Promise<{ section?: string }>;
};

export default async function TaxesPage({ searchParams }: PageProps) {
	const { section } = await searchParams;
	const category = findCategory("taxes");
	if (!category) return null;
	const active = resolveSection(category, section);

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel={active.label}
			/>
			<Suspense
				fallback={<TableSkeleton columns={4} rows={4} showHeader={false} />}
			>
				<TaxesContent />
			</Suspense>
		</>
	);
}
