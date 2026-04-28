"use client";

import { X } from "lucide-react";
import { tagChipStyle } from "./tag-color";

type Props = {
	tag: string;
	onRemove?: () => void;
	className?: string;
};

export function TagChip({ tag, onRemove, className }: Props) {
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-[11px] ${className ?? ""}`}
			style={tagChipStyle(tag)}
		>
			{tag}
			{onRemove && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="rounded-full hover:bg-black/10"
					aria-label={`Remove ${tag}`}
				>
					<X className="size-3" />
				</button>
			)}
		</span>
	);
}
