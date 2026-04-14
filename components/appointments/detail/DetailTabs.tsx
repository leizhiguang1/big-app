"use client";

import { cn } from "@/lib/utils";

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
	{ key: "casenotes", label: "Case Notes" },
	{ key: "billing", label: "Billing" },
	{ key: "dental-assessment", label: "Dental Assessment" },
	{ key: "periodontal-charting", label: "Periodontal Charting" },
	{ key: "followup", label: "Follow Up" },
	{ key: "camera", label: "Camera" },
	{ key: "documents", label: "Documents" },
];

type Props = {
	activeTab: DetailTabKey;
	onChange: (key: DetailTabKey) => void;
};

export function DetailTabs({ activeTab, onChange }: Props) {
	return (
		<div className="-mx-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
			<div className="flex min-w-max items-stretch gap-0 rounded-lg border bg-card p-1 shadow-sm">
				{TABS.map((t) => {
					const isActive = t.key === activeTab;
					return (
						<button
							key={t.key}
							type="button"
							onClick={() => onChange(t.key)}
							className={cn(
								"whitespace-nowrap rounded-md px-3 py-2 font-semibold text-[11px] uppercase tracking-wide transition sm:px-4 sm:text-xs",
								isActive
									? "bg-primary text-primary-foreground shadow-sm"
									: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
							)}
						>
							{t.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
