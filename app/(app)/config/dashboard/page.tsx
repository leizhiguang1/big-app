import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import { DisplayTab } from "@/components/config/dashboard/DisplayTab";
import { findCategory } from "@/components/config/categories-data";

export default async function DashboardPage() {
	const category = findCategory("dashboard");
	if (!category) return null;

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel="Display"
			/>
			<DisplayTab />
		</>
	);
}
