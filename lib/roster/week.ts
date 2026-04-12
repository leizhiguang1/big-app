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
