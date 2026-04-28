"use client";

import { SegmentedTabs } from "@/components/ui/segmented-tabs";

export type DetailTabKey =
	| "overview"
	| "casenotes"
	| "dental-assessment"
	| "periodontal-charting"
	| "followup"
	| "camera"
	| "documents"
	| "billing";

const TABS: { key: DetailTabKey; label: string }[] = [
	{ key: "overview", label: "Overview" },
	{ key: "casenotes", label: "Case notes" },
	{ key: "billing", label: "Billing" },
	{ key: "dental-assessment", label: "Dental assessment" },
	{ key: "periodontal-charting", label: "Periodontal charting" },
	{ key: "followup", label: "Follow up" },
	{ key: "camera", label: "Camera" },
	{ key: "documents", label: "Documents" },
];

type Props = {
	activeTab: DetailTabKey;
	onChange: (key: DetailTabKey) => void;
};

export function DetailTabs({ activeTab, onChange }: Props) {
	return (
		<SegmentedTabs
			aria-label="Appointment detail sections"
			active={activeTab}
			onChange={(key) => onChange(key as DetailTabKey)}
			tabs={TABS}
			size="sm"
		/>
	);
}
