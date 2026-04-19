import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PaymentMethod } from "@/lib/services/payment-methods";
import { emptyPayment } from "./helpers";
import type { PaymentEntry } from "./types";

export function usePayments(
	paymentMethods: PaymentMethod[],
	total: number,
	open: boolean,
) {
	const methodByCode = useMemo(() => {
		const map = new Map<string, PaymentMethod>();
		for (const m of paymentMethods) map.set(m.code, m);
		return map;
	}, [paymentMethods]);
	const defaultMethodCode = paymentMethods[0]?.code ?? "cash";

	const [payments, setPayments] = useState<PaymentEntry[]>([
		emptyPayment(defaultMethodCode),
	]);

	const totalPaid = useMemo(
		() =>
			payments.reduce((sum, p) => {
				const v = Number(p.amount);
				return sum + (Number.isFinite(v) && v > 0 ? v : 0);
			}, 0),
		[payments],
	);

	// Prime first payment row with bill total on dialog open.
	const didPrimeAmountRef = useRef(false);
	useEffect(() => {
		if (!open) {
			didPrimeAmountRef.current = false;
			return;
		}
		if (didPrimeAmountRef.current) return;
		if (total <= 0) return;
		setPayments((prev) => {
			if (prev.length !== 1 || prev[0].amount !== "") return prev;
			didPrimeAmountRef.current = true;
			return [{ ...prev[0], amount: total.toFixed(2) }];
		});
	}, [open, total]);

	// Each split-tender row must use a distinct method in the UI — pre-select
	// the first unused active method when adding a row.
	const addPaymentEntry = useCallback(() => {
		setPayments((prev) => {
			if (prev.length >= 5) return prev;
			const used = new Set(prev.map((p) => p.mode));
			const nextMethod =
				paymentMethods.find((m) => !used.has(m.code))?.code ??
				defaultMethodCode;
			const otherPaid = prev.reduce((sum, q) => {
				const v = Number(q.amount);
				return sum + (Number.isFinite(v) && v > 0 ? v : 0);
			}, 0);
			const remaining = Math.max(
				0,
				Math.round((total - otherPaid) * 100) / 100,
			);
			const next = emptyPayment(nextMethod);
			if (remaining > 0) next.amount = remaining.toFixed(2);
			return [...prev, next];
		});
	}, [paymentMethods, defaultMethodCode, total]);

	const removePaymentEntry = useCallback((key: string) => {
		setPayments((prev) =>
			prev.length <= 1 ? prev : prev.filter((p) => p.key !== key),
		);
	}, []);

	const updatePayment = useCallback(
		(key: string, patch: Partial<PaymentEntry>) =>
			setPayments((prev) =>
				prev.map((p) => (p.key === key ? { ...p, ...patch } : p)),
			),
		[],
	);

	// Switching method wipes field values — old inputs never belong to the new
	// method. If the row's amount is still blank, prefill with the remaining
	// balance so the cashier doesn't have to re-type the total after picking.
	const changePaymentMethod = useCallback(
		(key: string, mode: string) =>
			setPayments((prev) =>
				prev.map((p) => {
					if (p.key !== key) return p;
					let amount = p.amount;
					if (amount === "") {
						const otherPaid = prev.reduce((sum, q) => {
							if (q.key === key) return sum;
							const v = Number(q.amount);
							return sum + (Number.isFinite(v) && v > 0 ? v : 0);
						}, 0);
						const remaining = Math.max(
							0,
							Math.round((total - otherPaid) * 100) / 100,
						);
						if (remaining > 0) amount = remaining.toFixed(2);
					}
					return { ...emptyPayment(mode), key: p.key, amount };
				}),
			),
		[total],
	);

	const setPaymentToTotal = useCallback(
		(key: string) =>
			setPayments((prev) => {
				const others = prev.reduce((s, p) => {
					if (p.key === key) return s;
					const v = Number(p.amount);
					return s + (Number.isFinite(v) && v > 0 ? v : 0);
				}, 0);
				const target = Math.max(0, total - others);
				return prev.map((p) =>
					p.key === key ? { ...p, amount: target.toFixed(2) } : p,
				);
			}),
		[total],
	);

	const balanceDiff = total - totalPaid;
	const isOverpaid = balanceDiff < -0.005;
	const isUnderpaid = balanceDiff > 0.005;

	return {
		payments,
		setPayments,
		methodByCode,
		totalPaid,
		balanceDiff,
		isOverpaid,
		isUnderpaid,
		addPaymentEntry,
		removePaymentEntry,
		updatePayment,
		changePaymentMethod,
		setPaymentToTotal,
	};
}
