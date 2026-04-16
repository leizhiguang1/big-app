"use client";

import {
	ChevronDown,
	ChevronUp,
	Pencil,
	Save,
	StickyNote,
	Trash2,
	X,
} from "lucide-react";
import type { CaseNoteWithAuthor } from "@/lib/services/case-notes";

function formatDayMonthYear(d: Date) {
	return d.toLocaleDateString(undefined, {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatWeekdayTime(d: Date) {
	return `${d.toLocaleDateString(undefined, { weekday: "short" })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}`;
}

export function authorLabel(
	employee: { first_name: string; last_name: string } | null | undefined,
): string {
	if (!employee) return "—";
	return `${employee.first_name} ${employee.last_name}`.trim();
}

type Props = {
	note: CaseNoteWithAuthor;
	collapsed: boolean;
	isEditing: boolean;
	editContent: string;
	pending?: boolean;
	onToggle: () => void;
	onEditStart: () => void;
	onEditCancel: () => void;
	onEditChange: (v: string) => void;
	onEditSave: () => void;
	onDelete: () => void;
};

export function CaseNoteRow({
	note,
	collapsed,
	isEditing,
	editContent,
	pending,
	onToggle,
	onEditStart,
	onEditCancel,
	onEditChange,
	onEditSave,
	onDelete,
}: Props) {
	const date = new Date(note.created_at);

	return (
		<div className="border-b border-border/60 px-3.5 py-2.5 last:border-b-0">
			<div className="flex items-start justify-between gap-2">
				<div>
					<div className="flex items-center gap-1.5">
						<StickyNote className="size-[12px] text-blue-600" />
						<span className="font-bold text-[12px] text-foreground">
							{formatDayMonthYear(date)}
						</span>
					</div>
					<div className="mt-0.5 text-[11px] text-muted-foreground">
						{formatWeekdayTime(date)}
					</div>
				</div>

				<div className="flex items-center gap-1">
					{!isEditing ? (
						<>
							<button
								type="button"
								onClick={onEditStart}
								aria-label="Edit note"
								className="flex size-[22px] items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600"
							>
								<Pencil className="size-[11px]" />
							</button>
							<button
								type="button"
								onClick={onDelete}
								aria-label="Delete note"
								className="flex size-[22px] items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600"
							>
								<Trash2 className="size-[11px]" />
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								onClick={onEditSave}
								disabled={pending || !editContent.trim()}
								aria-label="Save"
								className="flex size-[22px] items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:opacity-50"
							>
								<Save className="size-[11px]" />
							</button>
							<button
								type="button"
								onClick={onEditCancel}
								aria-label="Cancel"
								className="flex size-[22px] items-center justify-center rounded-full bg-slate-400 text-white transition hover:bg-slate-500"
							>
								<X className="size-[11px]" />
							</button>
						</>
					)}
				</div>
			</div>

			{!isEditing && (
				<button
					type="button"
					aria-expanded={!collapsed}
					onClick={onToggle}
					className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
				>
					{collapsed ? (
						<ChevronDown className="size-[11px]" />
					) : (
						<ChevronUp className="size-[11px]" />
					)}
					<span>{collapsed ? "Show" : "Hide"} note</span>
				</button>
			)}

			{isEditing ? (
				<textarea
					value={editContent}
					onChange={(e) => onEditChange(e.target.value)}
					rows={4}
					className="mt-2 w-full resize-y rounded-md border bg-background p-2 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
				/>
			) : (
				!collapsed && (
					<p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-muted-foreground leading-snug">
						{note.content === "" ? (
							<span className="text-muted-foreground/50">(empty note)</span>
						) : (
							note.content
						)}
					</p>
				)
			)}

			<div className="mt-1.5 text-[9px] text-muted-foreground/80">
				Last updated by: {authorLabel(note.employee)}
			</div>
		</div>
	);
}
