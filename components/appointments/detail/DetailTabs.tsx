"use client";

import { cn } from "@/lib/utils";

export type DetailTabKey =
	| "overview"
	| "billing"
	| "casenotes"
	| "followup"
	| "documents";

const TABS: { key: DetailTabKey; label: string }[] = [
	{ key: "overview", label: "Overview" },
	{ key: "billing", label: "Billing" },
	{ key: "casenotes", label: "Case Notes" },
	{ key: "followup", label: "Follow Up" },
	{ key: "documents", label: "Documents" },
];

type Props = {
	activeTab: DetailTabKey;
	onChange: (key: DetailTabKey) => void;
};

export function DetailTabs({ activeTab, onChange }: Props) {
	return (
		<div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
			{TABS.map((t) => {
				const isActive = t.key === activeTab;
				return (
					<button
						key={t.key}
						type="button"
						onClick={() => onChange(t.key)}
						className={cn(
							"flex-1 rounded px-3 py-1.5 font-medium text-sm transition",
							isActive
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{t.label}
					</button>
				);
			})}
		</div>
	);
}
