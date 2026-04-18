"use client";

import { ImageOff } from "lucide-react";
import { useMemo, useState } from "react";
import type { CustomerDocumentWithRefs } from "@/lib/services/customer-documents";
import { mediaPublicUrl } from "@/lib/storage/urls";
import { cn } from "@/lib/utils";

type Props = {
	documents: CustomerDocumentWithRefs[];
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

export function CustomerVisualsTab({ documents }: Props) {
	const [selected, setSelected] = useState<string | null>(null);

	const images = useMemo(
		() => documents.filter((d) => d.mime_type?.startsWith("image/")),
		[documents],
	);

	if (images.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
				<ImageOff className="size-8 text-muted-foreground/60" />
				<span>No visuals uploaded yet.</span>
			</div>
		);
	}

	return (
		<>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
				{images.map((img) => {
					const url = mediaPublicUrl(img.storage_path);
					return (
						<button
							key={img.id}
							type="button"
							onClick={() => url && setSelected(url)}
							className="group relative aspect-square overflow-hidden rounded-lg border bg-muted text-left"
						>
							{url ? (
								// biome-ignore lint/performance/noImgElement: gallery thumbnail
								<img
									src={url}
									alt={img.file_name}
									className="size-full object-cover transition group-hover:scale-105"
								/>
							) : (
								<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
									Unavailable
								</div>
							)}
							<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
								<div className="truncate font-medium text-[11px] text-white">
									{img.file_name}
								</div>
								<div className="text-[10px] text-white/80">
									{formatDate(img.created_at)}
								</div>
							</div>
						</button>
					);
				})}
			</div>

			{selected && (
				<button
					type="button"
					onClick={() => setSelected(null)}
					className={cn(
						"fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4",
					)}
					aria-label="Close preview"
				>
					{/* biome-ignore lint/performance/noImgElement: full-size preview */}
					<img
						src={selected}
						alt="Preview"
						className="max-h-full max-w-full object-contain"
					/>
				</button>
			)}
		</>
	);
}
