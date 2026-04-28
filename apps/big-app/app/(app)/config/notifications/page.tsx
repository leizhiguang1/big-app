import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import { EmailSettingsTab } from "@/components/config/notifications/EmailSettingsTab";
import { LineSettingsTab } from "@/components/config/notifications/LineSettingsTab";
import { MessageSettingsTab } from "@/components/config/notifications/MessageSettingsTab";
import { WhatsAppSettingsTab } from "@/components/config/notifications/WhatsAppSettingsTab";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";

type PageProps = {
	searchParams: Promise<{ section?: string }>;
};

export default async function NotificationsConfigPage({ searchParams }: PageProps) {
	const { section } = await searchParams;
	const category = findCategory("notifications");
	if (!category) return null;

	const active = resolveSection(category, section);

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel={active.label}
			/>
			{active.key === "email" && <EmailSettingsTab />}
			{active.key === "message" && <MessageSettingsTab />}
			{active.key === "whatsapp" && <WhatsAppSettingsTab />}
			{active.key === "line" && <LineSettingsTab />}
			{!["email", "message", "whatsapp", "line"].includes(active.key) && (
				<ComingSoonCard sectionLabel={active.label} />
			)}
		</>
	);
}
