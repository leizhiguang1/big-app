import {
	type ColumnKey,
	DEFAULT_COLUMN_ORDER,
	DEFAULT_VISIBLE,
	sanitizeColumnOrder,
	sanitizeVisibleColumns,
} from "@/lib/appointments/columns";
import type { DisplayStyle, TimeScope } from "@/lib/calendar/layout";
import { VALID_SCOPES } from "@/lib/calendar/layout";

const DISPLAY_KEY = "big.appointments.display";
const SCOPE_KEY = "big.appointments.scope";
const COLUMN_ORDER_KEY = "big.appointments.columnOrder";
const VISIBLE_COLUMNS_KEY = "big.appointments.visibleColumns";

export type ViewPrefs = {
	display: DisplayStyle;
	scope: TimeScope;
	columnOrder: ColumnKey[];
	visibleColumns: ColumnKey[];
};

export const DEFAULT_VIEW_PREFS: ViewPrefs = {
	display: "calendar",
	scope: "day",
	columnOrder: DEFAULT_COLUMN_ORDER,
	visibleColumns: DEFAULT_VISIBLE,
};

function isDisplay(v: string | null): v is DisplayStyle {
	return v === "calendar" || v === "list" || v === "grid";
}

function isScope(v: string | null): v is TimeScope {
	return v === "day" || v === "week" || v === "month";
}

function readJSON(key: string): unknown {
	const raw = window.localStorage.getItem(key);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export function readViewPrefs(
	fallback: ViewPrefs = DEFAULT_VIEW_PREFS,
): ViewPrefs {
	if (typeof window === "undefined") return fallback;
	try {
		const display = window.localStorage.getItem(DISPLAY_KEY);
		const scope = window.localStorage.getItem(SCOPE_KEY);
		const d: DisplayStyle = isDisplay(display) ? display : fallback.display;
		const s: TimeScope = isScope(scope) ? scope : fallback.scope;
		const allowed = VALID_SCOPES[d];

		const order =
			sanitizeColumnOrder(readJSON(COLUMN_ORDER_KEY)) ?? fallback.columnOrder;
		const visible =
			sanitizeVisibleColumns(readJSON(VISIBLE_COLUMNS_KEY)) ??
			fallback.visibleColumns;

		return {
			display: d,
			scope: allowed.includes(s) ? s : allowed[0],
			columnOrder: order,
			visibleColumns: visible,
		};
	} catch {
		return fallback;
	}
}

export function writeViewPrefs(prefs: ViewPrefs) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(DISPLAY_KEY, prefs.display);
		window.localStorage.setItem(SCOPE_KEY, prefs.scope);
		window.localStorage.setItem(
			COLUMN_ORDER_KEY,
			JSON.stringify(prefs.columnOrder),
		);
		window.localStorage.setItem(
			VISIBLE_COLUMNS_KEY,
			JSON.stringify(prefs.visibleColumns),
		);
	} catch {
		// ignore
	}
}
