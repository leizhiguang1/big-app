import { useCallback, useMemo, useState } from "react";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import { redistribute } from "./helpers";
import type { Allocation, Line } from "./types";

type Args = {
	assignedEmpId: string | null;
	lines: Line[];
	entries: AppointmentLineItem[];
};

export function useEmployeeAllocations({
	assignedEmpId,
	lines,
	entries,
}: Args) {
	const makeEmptySlots = useCallback(
		(): Allocation[] => [
			{ employeeId: assignedEmpId ?? "", percent: assignedEmpId ? 100 : 0 },
			{ employeeId: "", percent: 0 },
			{ employeeId: "", percent: 0 },
		],
		[assignedEmpId],
	);

	const [itemized, setItemized] = useState(false);
	const [globalAlloc, setGlobalAlloc] = useState<Allocation[]>(makeEmptySlots);
	const [lineAlloc, setLineAlloc] = useState<Map<string, Allocation[]>>(
		() => new Map(),
	);

	const setGlobalEmployee = useCallback(
		(idx: number, empId: string | null) =>
			setGlobalAlloc((prev) =>
				redistribute(
					prev.map((a, i) =>
						i === idx ? { ...a, employeeId: empId ?? "" } : a,
					),
				),
			),
		[],
	);
	const setGlobalPercent = useCallback(
		(idx: number, pct: number) =>
			setGlobalAlloc((prev) =>
				prev.map((a, i) => (i === idx ? { ...a, percent: pct } : a)),
			),
		[],
	);

	const getLineAlloc = useCallback(
		(lineId: string): Allocation[] => lineAlloc.get(lineId) ?? makeEmptySlots(),
		[lineAlloc, makeEmptySlots],
	);
	const setLineEmployee = useCallback(
		(lineId: string, idx: number, empId: string | null) => {
			setLineAlloc((prev) => {
				const cur = prev.get(lineId) ?? makeEmptySlots();
				const next = redistribute(
					cur.map((a, i) =>
						i === idx ? { ...a, employeeId: empId ?? "" } : a,
					),
				);
				return new Map(prev).set(lineId, next);
			});
		},
		[makeEmptySlots],
	);
	const setLinePercent = useCallback(
		(lineId: string, idx: number, pct: number) => {
			setLineAlloc((prev) => {
				const cur = prev.get(lineId) ?? makeEmptySlots();
				const next = cur.map((a, i) =>
					i === idx ? { ...a, percent: pct } : a,
				);
				return new Map(prev).set(lineId, next);
			});
		},
		[makeEmptySlots],
	);

	// Distribute the missing % into the first filled slot, or clamp the first
	// slot down if we're over. Button, not onChange — one deliberate click.
	const balanceGlobalEmployee = useCallback(() => {
		setGlobalAlloc((prev) => {
			const filledIdx = prev.findIndex((a) => a.employeeId);
			if (filledIdx === -1) return prev;
			const sum = prev
				.filter((a) => a.employeeId)
				.reduce((s, a) => s + (a.percent || 0), 0);
			const delta = 100 - sum;
			return prev.map((a, i) =>
				i === filledIdx
					? {
							...a,
							percent: Math.max(0, Math.min(100, (a.percent || 0) + delta)),
						}
					: a,
			);
		});
	}, []);
	const balanceLineEmployee = useCallback((lineId: string) => {
		setLineAlloc((prev) => {
			const cur = prev.get(lineId);
			if (!cur) return prev;
			const filledIdx = cur.findIndex((a) => a.employeeId);
			if (filledIdx === -1) return prev;
			const sum = cur
				.filter((a) => a.employeeId)
				.reduce((s, a) => s + (a.percent || 0), 0);
			const delta = 100 - sum;
			const next = cur.map((a, i) =>
				i === filledIdx
					? {
							...a,
							percent: Math.max(0, Math.min(100, (a.percent || 0) + delta)),
						}
					: a,
			);
			return new Map(prev).set(lineId, next);
		});
	}, []);

	const globalEmpSum = useMemo(
		() =>
			globalAlloc
				.filter((a) => a.employeeId)
				.reduce((s, a) => s + (a.percent || 0), 0),
		[globalAlloc],
	);
	const globalHasAssigned = globalAlloc.some((a) => a.employeeId);
	const globalAllocInvalid =
		!itemized && globalHasAssigned && Math.abs(globalEmpSum - 100) > 0.01;

	const itemizedInvalidLineIds = useMemo(() => {
		if (!itemized) return new Set<string>();
		const bad = new Set<string>();
		const entryIds = new Set(entries.map((e) => e.id));
		for (const line of lines) {
			if (!entryIds.has(line.id)) continue;
			const slots = lineAlloc.get(line.id);
			if (!slots) continue;
			const filled = slots.filter((a) => a.employeeId);
			if (filled.length === 0) continue;
			const sum = filled.reduce((s, a) => s + (a.percent || 0), 0);
			if (Math.abs(sum - 100) > 0.01) bad.add(line.id);
		}
		return bad;
	}, [itemized, lines, lineAlloc, entries]);

	const buildAllocationsPayload = useCallback(() => {
		const entryIds = new Set(entries.map((e) => e.id));
		const payload: {
			lineItemId: string;
			employees: { employee_id: string; percent: number }[];
		}[] = [];
		for (const line of lines) {
			if (!entryIds.has(line.id)) continue;
			const allocs = itemized ? getLineAlloc(line.id) : globalAlloc;
			const valid = allocs.filter((a) => a.employeeId);
			if (valid.length > 0) {
				payload.push({
					lineItemId: line.id,
					employees: valid.map((a) => ({
						employee_id: a.employeeId,
						percent: a.percent,
					})),
				});
			}
		}
		return payload;
	}, [entries, lines, itemized, getLineAlloc, globalAlloc]);

	const buildSaleItemIncentivesPayload = useCallback(() => {
		const payload: {
			item_index: number;
			employees: { employee_id: string; percent: number }[];
		}[] = [];
		lines.forEach((line, idx) => {
			const allocs = itemized ? getLineAlloc(line.id) : globalAlloc;
			const valid = allocs.filter((a) => a.employeeId);
			if (valid.length > 0) {
				payload.push({
					item_index: idx,
					employees: valid.map((a) => ({
						employee_id: a.employeeId,
						percent: a.percent,
					})),
				});
			}
		});
		return payload;
	}, [lines, itemized, getLineAlloc, globalAlloc]);

	return {
		itemized,
		setItemized,
		globalAlloc,
		globalEmpSum,
		setGlobalEmployee,
		setGlobalPercent,
		balanceGlobalEmployee,
		getLineAlloc,
		setLineEmployee,
		setLinePercent,
		balanceLineEmployee,
		globalAllocInvalid,
		itemizedInvalidLineIds,
		buildAllocationsPayload,
		buildSaleItemIncentivesPayload,
	};
}
