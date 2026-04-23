import { AppointmentTagTab } from "@/components/config/appointments/AppointmentTagTab";
import { CancelReasonsTab } from "@/components/config/appointments/CancelReasonsTab";
import { OnlineBookingTab } from "@/components/config/appointments/OnlineBookingTab";
import { QueueDisplayTab } from "@/components/config/appointments/QueueDisplayTab";
import { SettingsTab } from "@/components/config/appointments/SettingsTab";
import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { ConfigSectionHeader } from "@/components/config/ConfigSectionHeader";
import {
	findCategory,
	resolveSection,
} from "@/components/config/categories-data";

type PageProps = {
	searchParams: Promise<{ section?: string }>;
};

export default async function AppointmentsPage({ searchParams }: PageProps) {
	const { section } = await searchParams;
	const category = findCategory("appointments");
	if (!category) return null;

	const active = resolveSection(category, section);

	return (
		<>
			<ConfigSectionHeader
				categoryTitle={category.title}
				sectionLabel={active.label}
			/>
			{active.key === "settings" && <SettingsTab />}
			{active.key === "online-booking" && <OnlineBookingTab />}
			{active.key === "appointment-tag" && <AppointmentTagTab />}
			{active.key === "cancel-reasons" && <CancelReasonsTab />}
			{active.key === "queue-display" && <QueueDisplayTab />}
			{![
				"settings",
				"online-booking",
				"appointment-tag",
				"cancel-reasons",
				"queue-display",
			].includes(active.key) && <ComingSoonCard sectionLabel={active.label} />}
		</>
	);
}
