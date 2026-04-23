"use client";

import { useEffect, useState } from "react";

export function useLiveElapsed(
	startIso: string | null | undefined,
	active: boolean,
): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!active || !startIso) return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [active, startIso]);
	if (!startIso) return 0;
	const t = new Date(startIso).getTime();
	if (Number.isNaN(t)) return 0;
	return now - t;
}
