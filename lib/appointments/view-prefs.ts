import type { DisplayStyle, TimeScope } from "@/lib/calendar/layout";
import { VALID_SCOPES } from "@/lib/calendar/layout";

const DISPLAY_KEY = "big.appointments.display";
const SCOPE_KEY = "big.appointments.scope";

export type ViewPrefs = {
	display: DisplayStyle;
	scope: TimeScope;
};

function isDisplay(v: string | null): v is DisplayStyle {
	return v === "calendar" || v === "list" || v === "grid";
}

function isScope(v: string | null): v is TimeScope {
	return v === "day" || v === "week" || v === "month";
}

export function readViewPrefs(fallback: ViewPrefs): ViewPrefs {
	if (typeof window === "undefined") return fallback;
	try {
		const display = window.localStorage.getItem(DISPLAY_KEY);
		const scope = window.localStorage.getItem(SCOPE_KEY);
		const d: DisplayStyle = isDisplay(display) ? display : fallback.display;
		const s: TimeScope = isScope(scope) ? scope : fallback.scope;
		const allowed = VALID_SCOPES[d];
		return { display: d, scope: allowed.includes(s) ? s : allowed[0] };
	} catch {
		return fallback;
	}
}

export function writeViewPrefs(prefs: ViewPrefs) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(DISPLAY_KEY, prefs.display);
		window.localStorage.setItem(SCOPE_KEY, prefs.scope);
	} catch {
		// ignore
	}
}
