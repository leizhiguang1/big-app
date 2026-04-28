import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import { ProfileTab } from "@/components/config/employees/ProfileTab";
import { SecurityTab } from "@/components/config/employees/SecurityTab";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";

type PageProps = {
	searchParams: Promise<{ section?: string }>;
};

export default async function EmployeesConfigPage({ searchParams }: PageProps) {
	const { section } = await searchParams;
	const category = findCategory("employees");
	if (!category) return null;

	const active = resolveSection(category, section);

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel={active.label}
			/>
			{active.key === "profile" && <ProfileTab />}
			{active.key === "security" && <SecurityTab />}
			{!["profile", "security"].includes(active.key) && (
				<ComingSoonCard sectionLabel={active.label} />
			)}
		</>
	);
}
