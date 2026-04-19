// Pure helpers for the appointments calendar grid.
// Mirrors the prototype's quarter-hour layout + Google Calendar–style overlap
// stacking. No DOM, no React imports — usable in tests + view components.

export type DisplayStyle = "calendar" | "list" | "grid";
export type TimeScope = "day" | "week" | "month";
export type ResourceMode = "room" | "employee";

export const VALID_SCOPES: Record<DisplayStyle, TimeScope[]> = {
	calendar: ["day", "week", "month"],
	list: ["day", "week"],
	grid: ["day", "week"],
};

export const FIRST_HOUR = 8;
export const LAST_HOUR = 22;
export const HOURS = Array.from(
	{ length: LAST_HOUR - FIRST_HOUR + 1 },
	(_, i) => FIRST_HOUR + i,
);
export const QUARTER_HEIGHT_PX = 20;
export const HOUR_HEIGHT_PX = QUARTER_HEIGHT_PX * 4;
export const TOTAL_GRID_HEIGHT_PX = HOURS.length * HOUR_HEIGHT_PX;

export type LayoutSlot = { col: number; totalCols: number };

export type LayoutLike = {
	id: string;
	start_at: string;
	end_at: string;
};

// Convert an ISO datetime to a vertical pixel offset within the day grid.
export function timeToY(iso: string, dayStartIso: string): number {
	const t = new Date(iso).getTime() - new Date(dayStartIso).getTime();
	return minutesToY(t / 60000);
}

// Convert minutes-from-local-midnight to a vertical pixel offset within the day grid.
export function minutesToY(minutesFromMidnight: number): number {
	return (minutesFromMidnight - FIRST_HOUR * 60) * (QUARTER_HEIGHT_PX / 15);
}

// Pixel height for an appointment based on duration. Min one quarter.
export function durationToHeight(start: string, end: string): number {
	const mins = Math.max(
		15,
		(new Date(end).getTime() - new Date(start).getTime()) / 60000,
	);
	return mins * (QUARTER_HEIGHT_PX / 15);
}

// Group transitively-overlapping items, assign each a column index + total
// column count so they share horizontal space without fully blocking siblings.
export function layoutOverlaps<T extends LayoutLike>(
	items: T[],
): Map<string, LayoutSlot> {
	const result = new Map<string, LayoutSlot>();
	if (items.length === 0) return result;

	const sorted = [...items].sort((a, b) => {
		const d = new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
		if (d !== 0) return d;
		return (
			new Date(b.end_at).getTime() -
			new Date(b.start_at).getTime() -
			(new Date(a.end_at).getTime() - new Date(a.start_at).getTime())
		);
	});

	let group: T[] = [sorted[0]];
	let groupEnd = new Date(sorted[0].end_at).getTime();
	const groups: T[][] = [];

	for (let i = 1; i < sorted.length; i++) {
		const item = sorted[i];
		const start = new Date(item.start_at).getTime();
		if (start < groupEnd) {
			group.push(item);
			const end = new Date(item.end_at).getTime();
			if (end > groupEnd) groupEnd = end;
		} else {
			groups.push(group);
			group = [item];
			groupEnd = new Date(item.end_at).getTime();
		}
	}
	groups.push(group);

	for (const g of groups) {
		const columns: T[][] = [];
		for (const item of g) {
			let placed = false;
			for (let c = 0; c < columns.length; c++) {
				const last = columns[c][columns[c].length - 1];
				if (
					new Date(item.start_at).getTime() >= new Date(last.end_at).getTime()
				) {
					columns[c].push(item);
					result.set(item.id, { col: c, totalCols: 0 });
					placed = true;
					break;
				}
			}
			if (!placed) {
				columns.push([item]);
				result.set(item.id, { col: columns.length - 1, totalCols: 0 });
			}
		}
		for (const item of g) {
			const slot = result.get(item.id);
			if (slot) slot.totalCols = columns.length;
		}
	}
	return result;
}

// CSS percent-based positioning for cards. Cascading style: first card spans
// the full column, subsequent ones overlay starting at col/totalCols.
export function cardStyle(
	slot: LayoutSlot | undefined,
	top: number,
	height: number,
): React.CSSProperties {
	const { col, totalCols } = slot ?? { col: 0, totalCols: 1 };
	if (col === 0) {
		return {
			position: "absolute",
			top,
			left: 2,
			right: 2,
			height,
			minHeight: QUARTER_HEIGHT_PX,
			zIndex: 1,
		};
	}
	const leftPct = (col / totalCols) * 100;
	return {
		position: "absolute",
		top,
		left: `calc(${leftPct}% + 2px)`,
		right: 2,
		height,
		minHeight: QUARTER_HEIGHT_PX,
		zIndex: col + 1,
		boxShadow: "-2px 0 6px rgba(0,0,0,0.10)",
	};
}

// Snap a click within an hour cell to a 15-minute offset (0/15/30/45).
export function quarterFromClickOffset(
	yWithinHourCell: number,
	cellHeight: number,
): number {
	const frac = Math.max(0, Math.min(0.999, yWithinHourCell / cellHeight));
	return Math.min(3, Math.floor(frac * 4)) * 15;
}

// Build an ISO datetime for a given local date + hour + minute.
export function buildLocalIso(
	dateStr: string,
	hour: number,
	minute: number,
): string {
	const [y, m, d] = dateStr.split("-").map(Number);
	const dt = new Date(y, m - 1, d, hour, minute, 0, 0);
	return dt.toISOString();
}

// Local-day start ISO for a YYYY-MM-DD date string (00:00 local).
export function dayStartIso(dateStr: string): string {
	return buildLocalIso(dateStr, 0, 0);
}

export function formatHourLabel(hour: number): string {
	const h = hour % 12 || 12;
	const ampm = hour < 12 ? "AM" : "PM";
	return `${h} ${ampm}`;
}

export function formatTimeRange(startIso: string, endIso: string): string {
	const s = new Date(startIso);
	const e = new Date(endIso);
	const fmt = (d: Date) =>
		`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
	return `${fmt(s)}–${fmt(e)}`;
}
