"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	FIRST_HOUR,
	LAST_HOUR,
	QUARTER_HEIGHT_PX,
} from "@/lib/calendar/layout";

const GRID_CELL_ATTR = "data-grid-cell";

export type DragSelection = {
	colKey: string;
	startMin: number;
	endMin: number;
};

export type DragCommit = {
	colKey: string;
	startHour: number;
	startMinute: number;
	durationMinutes: number;
};

type InternalState = DragSelection & {
	columnEl: HTMLElement;
	pointerId: number;
	active: boolean;
};

const MIN_MIN = FIRST_HOUR * 60;
const MAX_MIN = (LAST_HOUR + 1) * 60;

function minuteFromOffsetY(yWithinColumn: number): number {
	const quarters = Math.floor(yWithinColumn / QUARTER_HEIGHT_PX);
	return MIN_MIN + quarters * 15;
}

function clampMin(min: number): number {
	return Math.max(MIN_MIN, Math.min(MAX_MIN - 15, min));
}

export function useDragCreate() {
	const [selection, setSelection] = useState<DragSelection | null>(null);
	const stateRef = useRef<InternalState | null>(null);

	const cancel = useCallback(() => {
		const s = stateRef.current;
		if (s?.active) {
			try {
				s.columnEl.releasePointerCapture(s.pointerId);
			} catch {}
		}
		stateRef.current = null;
		setSelection(null);
	}, []);

	const onPointerDown = useCallback(
		(e: React.PointerEvent<HTMLElement>, colKey: string) => {
			if (e.button !== 0) return;
			if (e.pointerType === "touch") return;
			const target = e.target as HTMLElement | null;
			if (!target?.closest(`[${GRID_CELL_ATTR}="true"]`)) return;
			const columnEl = e.currentTarget;
			const rect = columnEl.getBoundingClientRect();
			const startMin = clampMin(minuteFromOffsetY(e.clientY - rect.top));
			// Record start but don't capture or show overlay yet — that way a
			// plain click still fires `click` on the inner cell button.
			stateRef.current = {
				colKey,
				startMin,
				endMin: startMin,
				columnEl,
				pointerId: e.pointerId,
				active: false,
			};
		},
		[],
	);

	const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
		const s = stateRef.current;
		if (!s) return;
		const rect = s.columnEl.getBoundingClientRect();
		const pointerMin = clampMin(minuteFromOffsetY(e.clientY - rect.top));
		if (pointerMin === s.endMin && s.active) return;
		s.endMin = pointerMin;
		if (!s.active && pointerMin !== s.startMin) {
			s.active = true;
			try {
				s.columnEl.setPointerCapture(s.pointerId);
			} catch {}
		}
		if (s.active) {
			setSelection({
				colKey: s.colKey,
				startMin: s.startMin,
				endMin: s.endMin,
			});
		}
	}, []);

	const onPointerUp = useCallback(
		(
			e: React.PointerEvent<HTMLElement>,
			onCommit: (args: DragCommit) => void,
		) => {
			const s = stateRef.current;
			if (!s) return;
			stateRef.current = null;
			setSelection(null);
			if (!s.active) return;
			try {
				s.columnEl.releasePointerCapture(e.pointerId);
			} catch {}
			if (s.startMin === s.endMin) return;
			const a = Math.min(s.startMin, s.endMin);
			const b = Math.max(s.startMin, s.endMin) + 15;
			const startHour = Math.floor(a / 60);
			const startMinute = a % 60;
			onCommit({
				colKey: s.colKey,
				startHour,
				startMinute,
				durationMinutes: b - a,
			});
		},
		[],
	);

	const onPointerCancel = useCallback(() => {
		cancel();
	}, [cancel]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && stateRef.current) cancel();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [cancel]);

	return {
		selection,
		onPointerDown,
		onPointerMove,
		onPointerUp,
		onPointerCancel,
		cancel,
	};
}

export { GRID_CELL_ATTR };
