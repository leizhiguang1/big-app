// Pure helpers for the weekly roster grid. Monday-anchored ISO week.

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export function fmtDate(date: Date): string {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

export function parseDate(str: string): Date {
	const [y, m, d] = str.split("-").map(Number);
	return new Date(y, m - 1, d);
}

export function getWeekStart(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function addDays(date: Date, n: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + n);
	return d;
}

export function getWeekDays(weekStart: Date): Date[] {
	return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function fmtWeekRange(weekStart: Date): string {
	const end = addDays(weekStart, 6);
	const sameMonth = weekStart.getMonth() === end.getMonth();
	if (sameMonth) {
		return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
	}
	return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

export function fmtDayHeader(d: Date): string {
	return `${DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export function fmtTime(t: string | null | undefined): string {
	if (!t) return "";
	return t.slice(0, 5);
}

export function diffInDays(a: string, b: string): number {
	const da = parseDate(a).getTime();
	const db = parseDate(b).getTime();
	return Math.round((da - db) / 86_400_000);
}

export type ShiftLike = {
	shift_date: string;
	repeat_type: string;
	repeat_end: string | null;
};

// Does this shift have an occurrence on `date`?
export function shiftCoversDate(shift: ShiftLike, date: string): boolean {
	if (shift.repeat_type === "weekly") {
		if (date < shift.shift_date) return false;
		if (shift.repeat_end !== null && date > shift.repeat_end) return false;
		return diffInDays(date, shift.shift_date) % 7 === 0;
	}
	return shift.shift_date === date;
}

// Does this shift have any occurrence in [rangeStart, rangeEnd] (inclusive)?
export function shiftOverlapsRange(
	shift: ShiftLike,
	rangeStart: string,
	rangeEnd: string,
): boolean {
	if (shift.repeat_type === "weekly") {
		if (shift.shift_date > rangeEnd) return false;
		if (shift.repeat_end !== null && shift.repeat_end < rangeStart)
			return false;
		return true;
	}
	return shift.shift_date >= rangeStart && shift.shift_date <= rangeEnd;
}

export type ShiftWithTimes = ShiftLike & {
	start_time: string;
	end_time: string;
	is_overnight: boolean;
};

function timeToMin(t: string): number {
	const [h, m] = t.slice(0, 5).split(":").map(Number);
	return h * 60 + m;
}

// Does at least one shift fully cover the [startAtIso, endAtIso] window?
// Times are compared in wall-clock local time — the same assumption the rest
// of the app uses when round-tripping appointment times.
export function isWindowCoveredByShifts(
	shifts: ShiftWithTimes[],
	startAtIso: string,
	endAtIso: string,
): boolean {
	if (!startAtIso || !endAtIso) return false;
	const start = new Date(startAtIso);
	const end = new Date(endAtIso);
	if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
		return false;
	}
	const apptDate = fmtDate(start);
	const apptStartMin = start.getHours() * 60 + start.getMinutes();
	let apptEndMin = end.getHours() * 60 + end.getMinutes();
	const endDate = fmtDate(end);
	if (endDate !== apptDate) {
		apptEndMin += diffInDays(endDate, apptDate) * 1440;
	}

	for (const shift of shifts) {
		const covers = shiftCoversDate(shift, apptDate);
		if (covers) {
			const shiftStartMin = timeToMin(shift.start_time);
			const shiftEndMin = timeToMin(shift.end_time);
			const effectiveEnd = shift.is_overnight
				? shiftEndMin + 1440
				: shiftEndMin;
			if (apptStartMin >= shiftStartMin && apptEndMin <= effectiveEnd) {
				return true;
			}
		}
		// Overnight shift from the previous calendar day spilling into apptDate.
		if (shift.is_overnight) {
			const prevDate = fmtDate(addDays(parseDate(apptDate), -1));
			if (shiftCoversDate(shift, prevDate)) {
				const shiftEndMin = timeToMin(shift.end_time);
				if (apptStartMin >= 0 && apptEndMin <= shiftEndMin) return true;
			}
		}
	}
	return false;
}

export type MinuteRange = { startMin: number; endMin: number };

// Merge overlapping/adjacent minute-ranges. Returns sorted disjoint ranges.
function mergeMinuteRanges(ranges: MinuteRange[]): MinuteRange[] {
	if (ranges.length === 0) return ranges;
	const sorted = [...ranges].sort((a, b) => a.startMin - b.startMin);
	const merged: MinuteRange[] = [{ ...sorted[0] }];
	for (let i = 1; i < sorted.length; i++) {
		const last = merged[merged.length - 1];
		const cur = sorted[i];
		if (cur.startMin <= last.endMin) {
			last.endMin = Math.max(last.endMin, cur.endMin);
		} else {
			merged.push({ ...cur });
		}
	}
	return merged;
}

// Compute merged rostered minute-ranges (from local midnight) for a given date,
// from the supplied shifts (already filtered to one resource if desired).
// Overnight shifts and overnight spillovers from the previous calendar day are
// both reflected, clipped to the [0, 1440) window.
export function getRosteredRangesOnDate(
	shifts: ShiftWithTimes[],
	dateStr: string,
): MinuteRange[] {
	const ranges: MinuteRange[] = [];
	for (const s of shifts) {
		if (shiftCoversDate(s, dateStr)) {
			const startMin = timeToMin(s.start_time);
			const rawEnd = timeToMin(s.end_time);
			const endMin = s.is_overnight ? rawEnd + 1440 : rawEnd;
			ranges.push({ startMin, endMin: Math.min(endMin, 1440) });
		}
		if (s.is_overnight) {
			const prevDate = fmtDate(addDays(parseDate(dateStr), -1));
			if (shiftCoversDate(s, prevDate)) {
				ranges.push({ startMin: 0, endMin: timeToMin(s.end_time) });
			}
		}
	}
	return mergeMinuteRanges(ranges);
}

// Return the gaps (non-rostered bands) inside [windowStartMin, windowEndMin].
export function getNonRosteredBands(
	rosteredRanges: MinuteRange[],
	windowStartMin: number,
	windowEndMin: number,
): MinuteRange[] {
	if (windowEndMin <= windowStartMin) return [];
	if (rosteredRanges.length === 0) {
		return [{ startMin: windowStartMin, endMin: windowEndMin }];
	}
	const sorted = [...rosteredRanges].sort((a, b) => a.startMin - b.startMin);
	const bands: MinuteRange[] = [];
	let cursor = windowStartMin;
	for (const r of sorted) {
		if (r.startMin > cursor) {
			bands.push({
				startMin: cursor,
				endMin: Math.min(r.startMin, windowEndMin),
			});
		}
		cursor = Math.max(cursor, r.endMin);
		if (cursor >= windowEndMin) break;
	}
	if (cursor < windowEndMin) {
		bands.push({ startMin: cursor, endMin: windowEndMin });
	}
	return bands;
}

// Do two shifts ever land on the same date?
export function shiftsConflict(a: ShiftLike, b: ShiftLike): boolean {
	const aWeekly = a.repeat_type === "weekly";
	const bWeekly = b.repeat_type === "weekly";

	if (!aWeekly && !bWeekly) return a.shift_date === b.shift_date;
	if (!aWeekly) return shiftCoversDate(b, a.shift_date);
	if (!bWeekly) return shiftCoversDate(a, b.shift_date);

	// Both weekly: same DOW + overlapping date ranges.
	if (diffInDays(a.shift_date, b.shift_date) % 7 !== 0) return false;
	const startMax = a.shift_date > b.shift_date ? a.shift_date : b.shift_date;
	if (a.repeat_end === null && b.repeat_end === null) return true;
	if (a.repeat_end === null) return startMax <= (b.repeat_end as string);
	if (b.repeat_end === null) return startMax <= a.repeat_end;
	const endMin = a.repeat_end < b.repeat_end ? a.repeat_end : b.repeat_end;
	return startMax <= endMin;
}
