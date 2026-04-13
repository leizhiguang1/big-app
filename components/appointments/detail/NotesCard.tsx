"use client";

import { StickyNote } from "lucide-react";
import type { AppointmentWithRelations } from "@/lib/services/appointments";

type Props = {
	appointment: AppointmentWithRelations;
};

export function NotesCard({ appointment }: Props) {
	const notes = appointment.notes?.trim();
	return (
		<div className="rounded-md border bg-card p-4">
			<div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
				<StickyNote className="size-3.5" />
				Notes
			</div>
			<div className="mt-2 whitespace-pre-wrap text-sm">
				{notes || (
					<span className="text-muted-foreground italic">
						No notes. Use the Edit button to add a chief complaint or remarks.
					</span>
				)}
			</div>
		</div>
	);
}
