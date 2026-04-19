import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";
import type { Allocation, Line, PaymentEntry } from "./types";

export function emptyPayment(mode: string): PaymentEntry {
	return {
		key: crypto.randomUUID(),
		mode,
		amount: "",
		remarks: "",
		bank: "",
		card_type: "",
		trace_no: "",
		approval_code: "",
		reference_no: "",
		months: "",
	};
}

export function toLine(
	e: AppointmentLineItem,
	services: ServiceWithCategory[],
): Line {
	const svc = e.service_id ? services.find((s) => s.id === e.service_id) : null;
	return {
		id: e.id,
		service_id: e.service_id,
		inventory_item_id: e.product_id ?? null,
		item_type: (e.item_type as Line["item_type"]) ?? "service",
		item_name: e.description,
		sku: svc?.sku ?? "",
		quantity: Number(e.quantity),
		unit_price: Number(e.unit_price),
		tax_id: e.tax_id ?? null,
		discount_type: "amount",
		discount_input: "",
		tooth_number: ((e as Record<string, unknown>).tooth_number as string) ?? "",
		surface: ((e as Record<string, unknown>).surface as string) ?? "",
		remarks: e.notes ?? "",
	};
}

export function lineGross(line: Line): number {
	return Math.max(0, line.quantity * line.unit_price);
}

export function capMyrForLine(
	line: Line,
	capPct: number | null,
): number | null {
	if (capPct == null) return null;
	return Math.round(lineGross(line) * capPct) / 100;
}

export function computeLineDiscount(line: Line, capPct: number | null): number {
	const raw = Number(line.discount_input);
	if (!Number.isFinite(raw) || raw <= 0) return 0;
	const gross = lineGross(line);
	const asMyr =
		line.discount_type === "percent"
			? Math.round(((raw * gross) / 100) * 100) / 100
			: raw;
	const capMyr = capMyrForLine(line, capPct);
	const ceiling = capMyr == null ? gross : Math.min(gross, capMyr);
	return Math.max(0, Math.min(asMyr, ceiling));
}

export function lineTaxAmount(
	line: Line,
	taxes: Tax[],
	discountMyr: number,
): number {
	if (!line.tax_id) return 0;
	const tax = taxes.find((t) => t.id === line.tax_id);
	if (!tax) return 0;
	const base = Math.max(0, lineGross(line) - discountMyr);
	return Math.round(base * Number(tax.rate_pct)) / 100;
}

export function money(n: number) {
	const safe = Number.isFinite(n) ? n : 0;
	return safe.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export function customerDisplay(a: AppointmentWithRelations) {
	if (a.customer) {
		const name = [a.customer.first_name, a.customer.last_name]
			.filter(Boolean)
			.join(" ");
		return { name: name || "Customer", code: a.customer.code };
	}
	if (a.is_time_block) {
		return { name: a.block_title || "Time block", code: "" };
	}
	return { name: a.lead_name || "Walk-in lead", code: "LEAD" };
}

export function redistribute(allocs: Allocation[]): Allocation[] {
	const filledCount = allocs.filter((a) => a.employeeId).length;
	if (filledCount === 0) return allocs.map((a) => ({ ...a, percent: 0 }));
	const even = Math.floor(100 / filledCount);
	const remainder = 100 - even * filledCount;
	let firstAssigned = false;
	return allocs.map((a) => {
		if (!a.employeeId) return { ...a, percent: 0 };
		if (!firstAssigned) {
			firstAssigned = true;
			return { ...a, percent: even + remainder };
		}
		return { ...a, percent: even };
	});
}
