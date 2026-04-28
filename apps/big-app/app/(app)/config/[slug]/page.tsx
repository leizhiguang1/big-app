import { notFound } from "next/navigation";
import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";

type PageProps = {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ section?: string }>;
};

export default async function ConfigCategoryPage({
	params,
	searchParams,
}: PageProps) {
	const { slug } = await params;
	const { section } = await searchParams;

	const category = findCategory(slug);
	if (!category || category.external) {
		notFound();
	}

	const active = resolveSection(category, section);
	// When a section carves out its own static route, this dynamic stub must
	// defer — otherwise the `?section=` URL keeps rendering ComingSoon instead
	// of bouncing to the real page.
	if (active.href) {
		notFound();
	}

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
