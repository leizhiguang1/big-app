"use client";

import { Calendar, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingSuggestion } from "@/components/chats/types";

type Props = {
	suggestion: BookingSuggestion;
	onAccept: () => void;
	onDismiss: () => void;
};

function formatDate(date?: string): string {
	if (!date) return "";
	try {
		return new Date(date).toLocaleDateString(undefined, {
			weekday: "short",
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	} catch {
		return date;
	}
}

export function BookingSuggestionBanner({
	suggestion,
	onAccept,
	onDismiss,
}: Props) {
	const dateStr = formatDate(suggestion.date);
	const timeStr = suggestion.time ?? "";
	const service = suggestion.service ?? "";
	const dentist = suggestion.dentist ?? "";

	return (
		<div className="flex flex-wrap items-center gap-3 border-b border-sky-200 bg-sky-50 px-4 py-2.5 text-sky-900">
			<Sparkles className="size-4 text-sky-600" />
			<div className="flex flex-1 flex-wrap items-baseline gap-2 text-sm">
				<span className="font-semibold">AI suggested a booking</span>
				{dateStr && (
					<span className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-0.5 text-xs">
						<Calendar className="size-3.5" />
						{dateStr}
						{timeStr ? ` · ${timeStr}` : ""}
					</span>
				)}
				{service && (
					<span className="rounded-md bg-white/70 px-2 py-0.5 text-xs">
						{service}
					</span>
				)}
				{dentist && (
					<span className="rounded-md bg-white/70 px-2 py-0.5 text-xs">
						{dentist}
					</span>
				)}
			</div>
			<div className="flex items-center gap-1.5">
				<Button
					size="sm"
					variant="ghost"
					onClick={onDismiss}
					className="text-sky-900 hover:bg-sky-100"
				>
					<X className="size-3.5" /> Dismiss
				</Button>
				<Button size="sm" onClick={onAccept}>
					<Check className="size-3.5" /> Mark handled
				</Button>
			</div>
		</div>
	);
}
