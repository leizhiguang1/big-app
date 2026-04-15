import { Suspense } from "react";
import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { OutletsContent } from "./outlets-content";

type PageProps = {
	searchParams: Promise<{ section?: string }>;
};

export default async function OutletsPage({ searchParams }: PageProps) {
	const { section } = await searchParams;
	const category = findCategory("outlets");
	if (!category) return null;

	const active = resolveSection(category, section);

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel={active.label}
			/>
			{active.key === "listing" ? (
				<Suspense
					fallback={<TableSkeleton columns={5} rows={6} showHeader={false} />}
				>
					<OutletsContent />
				</Suspense>
			) : (
				<ComingSoonCard sectionLabel={active.label} />
			)}
		</>
	);
}
