import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
	type NewPaymentMethodInput,
	newPaymentMethodInputSchema,
	type PaymentMethodInput,
	paymentMethodInputSchema,
} from "@/lib/schemas/payment-methods";
import type { PaymentEntry } from "@/lib/schemas/sales";
import { assertBrandId } from "@/lib/supabase/query";
import type { Tables } from "@/lib/supabase/types";

export type PaymentMethod = Tables<"payment_methods">;

export async function listPaymentMethods(
	ctx: Context,
): Promise<PaymentMethod[]> {
	const { data, error } = await ctx.db
		.from("payment_methods")
		.select("*")
		.eq("brand_id", assertBrandId(ctx))
		.order("sort_order", { ascending: true })
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function listActivePaymentMethods(
	ctx: Context,
): Promise<PaymentMethod[]> {
	const { data, error } = await ctx.db
		.from("payment_methods")
		.select("*")
		.eq("brand_id", assertBrandId(ctx))
		.eq("is_active", true)
		.order("sort_order", { ascending: true })
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

// Derive a unique snake_case code from the display name. Appends -2, -3… if
// the base code collides with an existing row.
async function deriveUniqueCode(ctx: Context, name: string): Promise<string> {
	const base =
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/^_+|_+$/g, "")
			.slice(0, 40) || "method";
	const { data, error } = await ctx.db
		.from("payment_methods")
		.select("code")
		.eq("brand_id", assertBrandId(ctx))
		.like("code", `${base}%`);
	if (error) throw new ValidationError(error.message);
	const taken = new Set((data ?? []).map((r) => r.code));
	if (!taken.has(base)) return base;
	let i = 2;
	while (taken.has(`${base}_${i}`)) i++;
	return `${base}_${i}`;
}

export async function createPaymentMethod(
	ctx: Context,
	input: unknown,
): Promise<PaymentMethod> {
	const parsed: NewPaymentMethodInput =
		newPaymentMethodInputSchema.parse(input);
	const brandId = assertBrandId(ctx);
	const code = await deriveUniqueCode(ctx, parsed.name);
	const { data: maxRow } = await ctx.db
		.from("payment_methods")
		.select("sort_order")
		.eq("brand_id", brandId)
		.order("sort_order", { ascending: false })
		.limit(1)
		.maybeSingle();
	const nextSort = (maxRow?.sort_order ?? 0) + 10;

	const { data, error } = await ctx.db
		.from("payment_methods")
		.insert({
			brand_id: brandId,
			code,
			name: parsed.name,
			is_builtin: false,
			is_active: true,
			sort_order: nextSort,
			requires_remarks: true,
			requires_bank: false,
			requires_card_type: false,
			requires_trace_no: false,
			requires_approval_code: false,
			requires_reference_no: false,
			requires_months: false,
		})
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A payment method with that code already exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updatePaymentMethod(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<PaymentMethod> {
	const parsed: PaymentMethodInput = paymentMethodInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("payment_methods")
		.update({
			name: parsed.name,
			is_active: parsed.is_active,
			sort_order: parsed.sort_order,
		})
		.eq("id", id)
		.eq("brand_id", assertBrandId(ctx))
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Payment method ${id} not found`);
	return data;
}

export async function deletePaymentMethod(
	ctx: Context,
	id: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data: row, error: fetchErr } = await ctx.db
		.from("payment_methods")
		.select("is_builtin")
		.eq("id", id)
		.eq("brand_id", brandId)
		.maybeSingle();
	if (fetchErr) throw new ValidationError(fetchErr.message);
	if (!row) throw new NotFoundError(`Payment method ${id} not found`);
	if (row.is_builtin)
		throw new ConflictError("Built-in payment methods cannot be deleted");

	const { error } = await ctx.db
		.from("payment_methods")
		.delete()
		.eq("id", id)
		.eq("brand_id", brandId);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This method has been used on a payment and cannot be deleted. Toggle it inactive instead.",
			);
		throw new ValidationError(error.message);
	}
}

// Validates each payment entry against its method's required-field flags.
// Strips values on fields the method doesn't use (defense in depth — the RPC
// is idempotent on null inputs but the DB row should stay clean).
export async function assertPaymentFields(
	ctx: Context,
	payments: PaymentEntry[],
): Promise<PaymentEntry[]> {
	const codes = Array.from(new Set(payments.map((p) => p.mode)));
	if (codes.length === 0) return payments;
	const { data, error } = await ctx.db
		.from("payment_methods")
		.select(
			"code, name, is_active, requires_remarks, requires_bank, requires_card_type, requires_trace_no, requires_approval_code, requires_reference_no, requires_months",
		)
		.eq("brand_id", assertBrandId(ctx))
		.in("code", codes);
	if (error) throw new ValidationError(error.message);
	const byCode = new Map<string, (typeof data)[number]>();
	for (const row of data ?? []) byCode.set(row.code, row);

	return payments.map((p, idx) => {
		const m = byCode.get(p.mode);
		if (!m)
			throw new ValidationError(
				`Payment ${idx + 1}: unknown method "${p.mode}"`,
			);
		if (!m.is_active)
			throw new ValidationError(
				`Payment ${idx + 1}: method "${m.name}" is inactive`,
			);

		const label = `Payment ${idx + 1} (${m.name})`;
		const must = (flag: boolean, field: keyof PaymentEntry, msg: string) => {
			if (!flag) return null;
			const v = p[field];
			if (v == null || (typeof v === "string" && v.trim() === ""))
				throw new ValidationError(`${label}: ${msg} is required`);
			return v;
		};
		must(m.requires_bank, "bank", "bank");
		must(m.requires_card_type, "card_type", "card type");
		must(m.requires_trace_no, "trace_no", "trace no");
		must(m.requires_approval_code, "approval_code", "approval code");
		must(m.requires_reference_no, "reference_no", "reference no");
		must(m.requires_months, "months", "months");

		return {
			mode: p.mode,
			amount: p.amount,
			remarks: m.requires_remarks ? p.remarks : null,
			bank: m.requires_bank ? p.bank : null,
			card_type: m.requires_card_type ? p.card_type : null,
			trace_no: m.requires_trace_no ? p.trace_no : null,
			approval_code: m.requires_approval_code ? p.approval_code : null,
			reference_no: m.requires_reference_no ? p.reference_no : null,
			months: m.requires_months ? p.months : null,
		};
	});
}
