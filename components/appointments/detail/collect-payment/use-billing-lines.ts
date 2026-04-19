import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";
import {
	capMyrForLine,
	computeLineDiscount,
	lineGross,
	lineTaxAmount,
	toLine,
} from "./helpers";
import type { Line } from "./types";

export function useBillingLines(
	entries: AppointmentLineItem[],
	services: ServiceWithCategory[],
	taxes: Tax[],
) {
	const [lines, setLines] = useState<Line[]>(() =>
		entries.map((e) => toLine(e, services)),
	);
	useEffect(() => {
		setLines(entries.map((e) => toLine(e, services)));
	}, [entries, services]);

	const serviceById = useMemo(() => {
		const map = new Map<string, ServiceWithCategory>();
		for (const s of services) map.set(s.id, s);
		return map;
	}, [services]);

	const capByServiceId = useMemo(() => {
		const map = new Map<string, number>();
		for (const s of services) {
			if (s.discount_cap != null) map.set(s.id, Number(s.discount_cap));
		}
		return map;
	}, [services]);

	const capFor = useCallback(
		(serviceId: string | null): number | null =>
			serviceId ? (capByServiceId.get(serviceId) ?? null) : null,
		[capByServiceId],
	);

	const updateLine = useCallback(
		(id: string, patch: Partial<Line>) =>
			setLines((rows) =>
				rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
			),
		[],
	);

	const clampLineDiscountInput = useCallback(
		(id: string) => {
			setLines((rows) =>
				rows.map((r) => {
					if (r.id !== id) return r;
					const raw = Number(r.discount_input);
					if (!Number.isFinite(raw) || raw <= 0) {
						return { ...r, discount_input: "" };
					}
					const gross = lineGross(r);
					const capPct = capFor(r.service_id);
					if (r.discount_type === "percent") {
						const ceilingPct = capPct != null ? Math.min(100, capPct) : 100;
						const next = Math.min(raw, ceilingPct);
						return {
							...r,
							discount_input: next === raw ? r.discount_input : String(next),
						};
					}
					const capMyr =
						capPct == null
							? gross
							: Math.min(gross, capMyrForLine(r, capPct) ?? gross);
					const next = Math.min(raw, capMyr);
					return {
						...r,
						discount_input: next === raw ? r.discount_input : next.toFixed(2),
					};
				}),
			);
		},
		[capFor],
	);

	const clampUnitPrice = useCallback(
		(id: string) => {
			setLines((rows) =>
				rows.map((r) => {
					if (r.id !== id || !r.service_id) return r;
					const svc = serviceById.get(r.service_id);
					if (!svc) return r;
					const min = svc.price_min != null ? Number(svc.price_min) : null;
					const max = svc.price_max != null ? Number(svc.price_max) : null;
					let price = r.unit_price;
					if (min != null && price < min) price = min;
					if (max != null && price > max) price = max;
					return price === r.unit_price ? r : { ...r, unit_price: price };
				}),
			);
		},
		[serviceById],
	);

	const lineDiscounts = useMemo(
		() => lines.map((l) => computeLineDiscount(l, capFor(l.service_id))),
		[lines, capFor],
	);
	const subtotal = useMemo(
		() => lines.reduce((sum, l) => sum + lineGross(l), 0),
		[lines],
	);
	const totalDiscount = useMemo(
		() => lineDiscounts.reduce((sum, d) => sum + d, 0),
		[lineDiscounts],
	);
	const totalTax = useMemo(
		() =>
			lines.reduce(
				(sum, l, i) => sum + lineTaxAmount(l, taxes, lineDiscounts[i] ?? 0),
				0,
			),
		[lines, taxes, lineDiscounts],
	);
	const lineNets = useMemo(
		() =>
			lines.map((l, i) => {
				const disc = lineDiscounts[i] ?? 0;
				const tax = lineTaxAmount(l, taxes, disc);
				return Math.max(0, lineGross(l) - disc) + tax;
			}),
		[lines, lineDiscounts, taxes],
	);

	// A line "requires full payment" unless the underlying service was
	// explicitly flagged as "Allow Redemption Without Payment".
	const requiresFullFor = useCallback(
		(line: Line): boolean => {
			if (line.item_type !== "service") return true;
			if (!line.service_id) return true;
			const svc = serviceById.get(line.service_id);
			return !(svc?.allow_redemption_without_payment ?? false);
		},
		[serviceById],
	);

	const rawTotal = Math.max(0, subtotal - totalDiscount + totalTax);

	return {
		lines,
		setLines,
		updateLine,
		clampLineDiscountInput,
		clampUnitPrice,
		serviceById,
		capFor,
		lineDiscounts,
		subtotal,
		totalDiscount,
		totalTax,
		lineNets,
		rawTotal,
		requiresFullFor,
	};
}
