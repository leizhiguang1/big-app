import { useCallback, useEffect, useMemo, useState } from "react";
import type { Line } from "./types";

type Args = {
	lines: Line[];
	lineNets: number[];
	isUnderpaid: boolean;
	total: number;
	totalPaid: number;
	requiresFullFor: (line: Line) => boolean;
};

export function usePaymentAllocations({
	lines,
	lineNets,
	isUnderpaid,
	total,
	totalPaid,
	requiresFullFor,
}: Args) {
	const [linePayAlloc, setLinePayAlloc] = useState<Map<string, string>>(
		() => new Map(),
	);

	const getLinePayAlloc = useCallback(
		(id: string) => linePayAlloc.get(id) ?? "",
		[linePayAlloc],
	);
	const setLinePayAllocVal = useCallback(
		(id: string, val: string) =>
			setLinePayAlloc((prev) => new Map(prev).set(id, val)),
		[],
	);

	// On exact/overpay, every line is paid to its net — lock allocations to
	// the deterministic value so the user can't create a mismatch.
	useEffect(() => {
		if (!isUnderpaid && total > 0) {
			const next = new Map<string, string>();
			for (let i = 0; i < lines.length; i++) {
				next.set(lines[i].id, (lineNets[i] ?? 0).toFixed(2));
			}
			setLinePayAlloc(next);
		}
	}, [isUnderpaid, total, lines, lineNets]);

	// Drop stale keys when lines change.
	useEffect(() => {
		setLinePayAlloc((prev) => {
			const ids = new Set(lines.map((l) => l.id));
			let changed = false;
			const next = new Map<string, string>();
			for (const [k, v] of prev) {
				if (ids.has(k)) next.set(k, v);
				else changed = true;
			}
			return changed ? next : prev;
		});
	}, [lines]);

	const allocNums = useMemo(
		() =>
			lines.map((l) => {
				const raw = Number(linePayAlloc.get(l.id) ?? "0");
				return Number.isFinite(raw) && raw > 0 ? raw : 0;
			}),
		[lines, linePayAlloc],
	);
	const allocSum = useMemo(
		() => allocNums.reduce((s, n) => s + n, 0),
		[allocNums],
	);
	const lineOverAllocated = useMemo(
		() => lines.map((_l, i) => allocNums[i] > (lineNets[i] ?? 0) + 0.005),
		[lines, allocNums, lineNets],
	);
	const lineUnderRequired = useMemo(
		() =>
			lines.map(
				(l, i) =>
					requiresFullFor(l) && allocNums[i] < (lineNets[i] ?? 0) - 0.005,
			),
		[lines, allocNums, lineNets, requiresFullFor],
	);

	// Allocation checks only apply once the user has actually started paying
	// partially — at totalPaid = 0 everything is trivially "under".
	const allocChecksActive = isUnderpaid && totalPaid > 0;
	const anyLineOverAllocated = lineOverAllocated.some(Boolean);
	const anyRequiredUnder = allocChecksActive && lineUnderRequired.some(Boolean);
	const allocSumMismatch =
		allocChecksActive && Math.abs(allocSum - totalPaid) > 0.01;

	// Auto-allocate: required-full lines paid to their net first, then leftover
	// spread across optional lines pro-rata. Button-only — never runs while the
	// user is typing.
	const autoAllocatePartial = useCallback(() => {
		if (total <= 0 || totalPaid <= 0) return;
		const cap = Math.min(totalPaid, total);
		const required = lines.map((l) => requiresFullFor(l));
		const next = new Map<string, string>();
		let remaining = cap;
		for (let i = 0; i < lines.length; i++) {
			if (!required[i]) {
				next.set(lines[i].id, "0.00");
				continue;
			}
			const want = lineNets[i] ?? 0;
			const take = Math.min(want, remaining);
			remaining = Math.max(0, remaining - take);
			next.set(lines[i].id, take.toFixed(2));
		}
		const optionalTotal = lines.reduce(
			(s, _l, i) => (required[i] ? s : s + (lineNets[i] ?? 0)),
			0,
		);
		if (remaining > 0 && optionalTotal > 0) {
			let distributed = 0;
			let lastOptional = -1;
			for (let i = 0; i < lines.length; i++) {
				if (required[i]) continue;
				lastOptional = i;
				const share = Math.min(
					lineNets[i] ?? 0,
					Math.round((remaining * (lineNets[i] ?? 0) * 100) / optionalTotal) /
						100,
				);
				next.set(lines[i].id, share.toFixed(2));
				distributed += share;
			}
			if (lastOptional >= 0) {
				const residue = Math.round((remaining - distributed) * 100) / 100;
				if (Math.abs(residue) > 0.005) {
					const cur = Number(next.get(lines[lastOptional].id) ?? "0");
					const capped = Math.min(
						lineNets[lastOptional] ?? 0,
						Math.max(0, cur + residue),
					);
					next.set(lines[lastOptional].id, capped.toFixed(2));
				}
			}
		}
		setLinePayAlloc(next);
	}, [total, totalPaid, lines, lineNets, requiresFullFor]);

	return {
		getLinePayAlloc,
		setLinePayAllocVal,
		allocNums,
		allocSum,
		lineOverAllocated,
		lineUnderRequired,
		allocChecksActive,
		anyLineOverAllocated,
		anyRequiredUnder,
		allocSumMismatch,
		autoAllocatePartial,
	};
}
