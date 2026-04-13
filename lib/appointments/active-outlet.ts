const STORAGE_KEY = "big.activeOutletId";
const EVENT_NAME = "big:active-outlet-change";

export function readActiveOutletId(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

export function writeActiveOutletId(outletId: string | null) {
	if (typeof window === "undefined") return;
	try {
		if (outletId) {
			window.localStorage.setItem(STORAGE_KEY, outletId);
		} else {
			window.localStorage.removeItem(STORAGE_KEY);
		}
		window.dispatchEvent(
			new CustomEvent(EVENT_NAME, { detail: { outletId } }),
		);
	} catch {
		// ignore
	}
}

export function subscribeActiveOutletId(
	listener: (outletId: string | null) => void,
): () => void {
	if (typeof window === "undefined") return () => {};
	const handler = (e: Event) => {
		const detail = (e as CustomEvent<{ outletId: string | null }>).detail;
		listener(detail?.outletId ?? null);
	};
	const storageHandler = (e: StorageEvent) => {
		if (e.key === STORAGE_KEY) listener(e.newValue);
	};
	window.addEventListener(EVENT_NAME, handler);
	window.addEventListener("storage", storageHandler);
	return () => {
		window.removeEventListener(EVENT_NAME, handler);
		window.removeEventListener("storage", storageHandler);
	};
}
