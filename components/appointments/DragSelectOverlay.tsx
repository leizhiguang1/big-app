"use client";

import { minutesToY, QUARTER_HEIGHT_PX } from "@/lib/calendar/layout";
import type { DragSelection } from "@/lib/calendar/use-drag-create";

type Props = {
	selection: DragSelection;
};

export function DragSelectOverlay({ selection }: Props) {
	const a = Math.min(selection.startMin, selection.endMin);
	const b = Math.max(selection.startMin, selection.endMin) + 15;
	const top = minutesToY(a);
	const height = Math.max(QUARTER_HEIGHT_PX, minutesToY(b) - top);
	const duration = b - a;
	const startHour = Math.floor(a / 60);
	const startMin = a % 60;
	const endHour = Math.floor(b / 60);
	const endMin = b % 60;
	const fmt = (h: number, m: number) =>
		`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

	return (
		<div
			className="pointer-events-none absolute right-0.5 left-0.5 z-[2] rounded-sm bg-primary/25 ring-2 ring-primary/70"
			style={{ top, height }}
			aria-hidden
		>
			<div className="flex h-full flex-col justify-start px-1.5 pt-0.5 text-[10px] font-medium leading-tight text-primary-foreground/95">
				<span className="rounded-sm bg-primary/90 px-1 py-px text-[10px] tabular-nums shadow-sm">
					{fmt(startHour, startMin)}–{fmt(endHour, endMin)} · {duration} min
				</span>
			</div>
		</div>
	);
}
