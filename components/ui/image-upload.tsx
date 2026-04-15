"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useId, useMemo, useRef, useState } from "react";
import {
	deleteMediaObjectAction,
	requestMediaUploadUrlAction,
} from "@/lib/actions/storage";
import type { MediaEntity } from "@/lib/services/storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
	value: string | null;
	onChange: (path: string | null) => void;
	entity: MediaEntity;
	entityId: string | null;
	shape?: "circle" | "square";
	sizeClass?: string;
	layout?: "row" | "stacked";
	disabled?: boolean;
	/**
	 * When true, the placeholder is the only clickable surface — no Upload/
	 * Replace/Remove buttons, no hint text. Use inside forms where the image
	 * is a secondary concern and the layout is tight.
	 */
	minimal?: boolean;
};

function publicUrlFor(path: string): string {
	const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!base) return "";
	return `${base}/storage/v1/object/public/media/${path}`;
}

export function ImageUpload({
	value,
	onChange,
	entity,
	entityId,
	shape = "circle",
	sizeClass = "size-24",
	layout = "row",
	disabled,
	minimal,
}: Props) {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const previewUrl = useMemo(
		() => (value ? publicUrlFor(value) : null),
		[value],
	);

	const canUpload = !disabled && !!entityId && !uploading;

	const handlePick = () => {
		if (!canUpload) return;
		inputRef.current?.click();
	};

	const handleFile = async (file: File) => {
		setError(null);
		if (!ACCEPTED_MIME.includes(file.type)) {
			setError("Use JPG, PNG, or WebP");
			return;
		}
		if (file.size > MAX_BYTES) {
			setError("Max file size is 5 MB");
			return;
		}
		if (!entityId) {
			setError("Save first, then add a photo");
			return;
		}

		setUploading(true);
		try {
			const { token, path } = await requestMediaUploadUrlAction({
				entity,
				entityId,
				filename: file.name,
				mime: file.type,
			});
			const supabase = createClient();
			const { error: upErr } = await supabase.storage
				.from("media")
				.uploadToSignedUrl(path, token, file, {
					contentType: file.type,
					upsert: false,
				});
			if (upErr) throw upErr;

			const previous = value;
			onChange(path);
			if (previous) {
				deleteMediaObjectAction(previous).catch(() => {
					// orphan — not fatal
				});
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	};

	const handleRemove = () => {
		if (!value || disabled) return;
		const previous = value;
		onChange(null);
		deleteMediaObjectAction(previous).catch(() => {
			// orphan — not fatal
		});
	};

	const rounded = shape === "circle" ? "rounded-full" : "rounded-lg";
	const containerClass =
		layout === "stacked"
			? "flex flex-col items-center gap-2"
			: "flex items-start gap-4";

	if (minimal) {
		return (
			<>
				<button
					type="button"
					onClick={handlePick}
					disabled={!canUpload}
					className={cn(
						"group relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed bg-muted/30 transition-colors",
						rounded,
						sizeClass,
						canUpload && "cursor-pointer hover:border-solid hover:bg-muted/60",
						!canUpload && "cursor-not-allowed opacity-60",
					)}
					aria-label={previewUrl ? "Replace photo" : "Upload photo"}
				>
					{previewUrl ? (
						<>
							<Image
								src={previewUrl}
								alt=""
								fill
								sizes="96px"
								className="object-cover"
								unoptimized
							/>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleRemove();
								}}
								className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm hover:text-destructive"
								aria-label="Remove photo"
							>
								<Trash2 className="size-3" />
							</button>
						</>
					) : (
						<Camera className="size-6 text-muted-foreground" />
					)}
					{uploading && (
						<div className="absolute inset-0 flex items-center justify-center bg-background/70">
							<Loader2 className="size-5 animate-spin" />
						</div>
					)}
				</button>
				{error && (
					<p className="mt-1 text-center text-destructive text-xs">{error}</p>
				)}
				<input
					ref={inputRef}
					id={inputId}
					type="file"
					accept={ACCEPTED_MIME.join(",")}
					className="hidden"
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) void handleFile(file);
					}}
				/>
			</>
		);
	}

	return (
		<div className={containerClass}>
			<button
				type="button"
				onClick={handlePick}
				disabled={!canUpload}
				className={cn(
					"group relative flex shrink-0 items-center justify-center overflow-hidden border bg-muted",
					rounded,
					sizeClass,
					canUpload && "cursor-pointer hover:opacity-90",
					!canUpload && "cursor-not-allowed opacity-60",
				)}
				aria-label={previewUrl ? "Replace photo" : "Upload photo"}
			>
				{previewUrl ? (
					<Image
						src={previewUrl}
						alt=""
						fill
						sizes="96px"
						className="object-cover"
						unoptimized
					/>
				) : (
					<Camera className="size-6 text-muted-foreground" />
				)}
				{uploading && (
					<div className="absolute inset-0 flex items-center justify-center bg-background/70">
						<Loader2 className="size-5 animate-spin" />
					</div>
				)}
			</button>

			<div
				className={cn(
					"flex flex-col gap-1.5",
					layout === "stacked" && "items-center text-center",
				)}
			>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={handlePick}
						disabled={!canUpload}
						className="rounded-md border px-2.5 py-1 font-medium text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
					>
						{previewUrl ? "Replace" : "Upload"}
					</button>
					{previewUrl && (
						<button
							type="button"
							onClick={handleRemove}
							disabled={disabled}
							className="flex items-center gap-1 rounded-md border px-2.5 py-1 font-medium text-destructive text-xs hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
						>
							<Trash2 className="size-3.5" />
							Remove
						</button>
					)}
				</div>
				{layout !== "stacked" && (
					<p className="text-muted-foreground text-xs">
						JPG, PNG, or WebP · max 5 MB
					</p>
				)}
				{!entityId && (
					<p className="text-amber-600 text-xs">Save first to enable upload</p>
				)}
				{error && <p className="text-destructive text-xs">{error}</p>}
			</div>

			<input
				ref={inputRef}
				id={inputId}
				type="file"
				accept={ACCEPTED_MIME.join(",")}
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) void handleFile(file);
				}}
			/>
		</div>
	);
}
