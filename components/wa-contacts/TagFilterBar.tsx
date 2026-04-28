"use client";

import { tagChipStyle } from "./tag-color";

type Props = {
	allTags: string[];
	selectedTag: string | null;
	onSelect: (tag: string | null) => void;
};

export function TagFilterBar({ allTags, selectedTag, onSelect }: Props) {
	if (allTags.length === 0) return null;
	return (
		<div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
			<button
				type="button"
				onClick={() => onSelect(null)}
				className={`rounded-full border px-3 py-1 font-medium text-xs transition-colors ${
					selectedTag === null
						? "border-foreground bg-foreground text-background"
						: "bg-card hover:bg-muted/50"
				}`}
			>
				All
			</button>
			{allTags.map((tag) => {
				const active = selectedTag === tag;
				return (
					<button
						type="button"
						key={tag}
						onClick={() => onSelect(active ? null : tag)}
						className={`rounded-full border px-3 py-1 font-medium text-xs transition-colors ${
							active ? "" : "bg-card hover:bg-muted/50"
						}`}
						style={active ? tagChipStyle(tag) : undefined}
					>
						{tag}
					</button>
				);
			})}
		</div>
	);
}
