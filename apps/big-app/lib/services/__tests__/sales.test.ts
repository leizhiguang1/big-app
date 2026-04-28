import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { ValidationError } from "@/lib/errors";
import { collectPaymentInputSchema } from "@/lib/schemas/sales";
import {
	collectAppointmentPayment,
	issueRefund,
	voidSalesOrder,
} from "@/lib/services/sales";

function validInput(overrides: Record<string, unknown> = {}) {
	return {
		items: [
			{
				service_id: "00000000-0000-0000-0000-000000000001",
				inventory_item_id: null,
				sku: null,
				item_name: "Dental Cleaning",
				item_type: "service",
				quantity: 1,
				unit_price: 150,
				discount: 0,
				tax_id: null,
			},
		],
		discount: 0,
		tax: 0,
		rounding: 0,
		payments: [{ mode: "cash", amount: 150, reference_no: null }],
		remarks: null,
		sold_at: null,
		frontdesk_message: null,
		...overrides,
	};
}

describe("collectPaymentInputSchema", () => {
	it("accepts a valid input", () => {
		const result = collectPaymentInputSchema.parse(validInput());
		expect(result.items).toHaveLength(1);
		expect(result.payments).toHaveLength(1);
		expect(result.payments[0].amount).toBe(150);
		expect(result.payments[0].mode).toBe("cash");
	});

	it("rejects empty items array", () => {
		expect(() =>
			collectPaymentInputSchema.parse(validInput({ items: [] })),
		).toThrow(ZodError);
	});

	it("rejects empty payments array", () => {
		expect(() =>
			collectPaymentInputSchema.parse(validInput({ payments: [] })),
		).toThrow(ZodError);
	});

	it("rejects zero payment amount", () => {
		expect(() =>
			collectPaymentInputSchema.parse(
				validInput({
					payments: [{ mode: "cash", amount: 0, reference_no: null }],
				}),
			),
		).toThrow(ZodError);
	});

	it("rejects negative payment amount", () => {
		expect(() =>
			collectPaymentInputSchema.parse(
				validInput({
					payments: [{ mode: "cash", amount: -10, reference_no: null }],
				}),
			),
		).toThrow(ZodError);
	});

	it("rejects empty payment mode", () => {
		expect(() =>
			collectPaymentInputSchema.parse(
				validInput({
					payments: [{ mode: "", amount: 150, reference_no: null }],
				}),
			),
		).toThrow(ZodError);
	});

	it("accepts any non-empty payment mode (resolved against payment_methods at runtime)", () => {
		for (const mode of [
			"cash",
			"credit_card",
			"debit_card",
			"eps",
			"online_transaction",
			"qr_pay",
			"touch_n_go",
			"custom_method",
		]) {
			const result = collectPaymentInputSchema.parse(
				validInput({
					payments: [{ mode, amount: 150, reference_no: null }],
				}),
			);
			expect(result.payments[0].mode).toBe(mode);
		}
	});

	it("accepts multiple payment entries (split tender)", () => {
		const result = collectPaymentInputSchema.parse(
			validInput({
				payments: [
					{ mode: "cash", amount: 100, reference_no: null },
					{ mode: "card", amount: 50, reference_no: "REF-001" },
				],
			}),
		);
		expect(result.payments).toHaveLength(2);
		expect(result.payments[0].amount).toBe(100);
		expect(result.payments[1].amount).toBe(50);
		expect(result.payments[1].reference_no).toBe("REF-001");
	});

	it("transforms empty remarks to null", () => {
		const result = collectPaymentInputSchema.parse(
			validInput({ remarks: "  " }),
		);
		expect(result.remarks).toBeNull();
	});

	it("transforms empty frontdesk_message to null", () => {
		const result = collectPaymentInputSchema.parse(
			validInput({ frontdesk_message: "" }),
		);
		expect(result.frontdesk_message).toBeNull();
	});

	it("preserves valid sold_at datetime", () => {
		const dt = "2026-04-15T10:30:00+08:00";
		const result = collectPaymentInputSchema.parse(
			validInput({ sold_at: dt }),
		);
		expect(result.sold_at).toBe(dt);
	});

	it("rejects invalid sold_at format", () => {
		expect(() =>
			collectPaymentInputSchema.parse(
				validInput({ sold_at: "not-a-date" }),
			),
		).toThrow(ZodError);
	});

	it("rejects item with empty name", () => {
		expect(() =>
			collectPaymentInputSchema.parse(
				validInput({
					items: [
						{
							service_id: null,
							inventory_item_id: null,
							sku: null,
							item_name: "",
							item_type: "service",
							quantity: 1,
							unit_price: 100,
							discount: 0,
							tax_id: null,
						},
					],
				}),
			),
		).toThrow(ZodError);
	});

	it("rejects item with zero quantity", () => {
		expect(() =>
			collectPaymentInputSchema.parse(
				validInput({
					items: [
						{
							service_id: null,
							inventory_item_id: null,
							sku: null,
							item_name: "Test",
							item_type: "service",
							quantity: 0,
							unit_price: 100,
							discount: 0,
							tax_id: null,
						},
					],
				}),
			),
		).toThrow(ZodError);
	});

	it("rejects item with negative unit_price", () => {
		expect(() =>
			collectPaymentInputSchema.parse(
				validInput({
					items: [
						{
							service_id: null,
							inventory_item_id: null,
							sku: null,
							item_name: "Test",
							item_type: "service",
							quantity: 1,
							unit_price: -50,
							discount: 0,
							tax_id: null,
						},
					],
				}),
			),
		).toThrow(ZodError);
	});

	it("accepts multiple items", () => {
		const result = collectPaymentInputSchema.parse(
			validInput({
				items: [
					{
						service_id: "00000000-0000-0000-0000-000000000001",
						inventory_item_id: null,
						sku: null,
						item_name: "Service A",
						item_type: "service",
						quantity: 1,
						unit_price: 100,
						discount: 10,
						tax_id: null,
					},
					{
						service_id: null,
						inventory_item_id: "00000000-0000-0000-0000-000000000002",
						sku: "PRD-001",
						item_name: "Product B",
						item_type: "product",
						quantity: 2,
						unit_price: 25,
						discount: 0,
						tax_id: null,
					},
				],
				payments: [{ mode: "cash", amount: 140, reference_no: null }],
			}),
		);
		expect(result.items).toHaveLength(2);
		expect(result.items[0].discount).toBe(10);
		expect(result.items[1].item_type).toBe("product");
	});

	it("coerces string numbers for payment amount", () => {
		const result = collectPaymentInputSchema.parse(
			validInput({
				payments: [{ mode: "cash", amount: "150", reference_no: null }],
			}),
		);
		expect(result.payments[0].amount).toBe(150);
	});

	it("defaults discount to 0 when not provided", () => {
		const input = validInput();
		delete (input as Record<string, unknown>).discount;
		const result = collectPaymentInputSchema.parse(input);
		expect(result.discount).toBe(0);
	});

	it("accepts allocations array", () => {
		const result = collectPaymentInputSchema.parse(
			validInput({
				allocations: [
					{ item_index: 0, amount: 100 },
					{ item_index: 1, amount: 50 },
				],
			}),
		);
		expect(result.allocations).toHaveLength(2);
		expect(result.allocations![0].item_index).toBe(0);
		expect(result.allocations![0].amount).toBe(100);
	});

	it("accepts null allocations", () => {
		const result = collectPaymentInputSchema.parse(
			validInput({ allocations: null }),
		);
		expect(result.allocations).toBeNull();
	});
});

// ─── Service-layer tests: collectAppointmentPayment + void + issueRefund ─────
// These tests mock `ctx.db` to exercise the transport wiring around the RPC:
// how the service maps DB errors to ValidationError, how it handles null
// returns, and (for collectPayment) how assertLineDiscountCaps enforces the
// per-service cap before the RPC is ever called. Covers the ONE mandatory
// test requirement from ARCHITECTURE.md §9: collectPayment happy path + rollback.

type MockCtx = {
	db: {
		rpc: ReturnType<typeof vi.fn>;
		from: ReturnType<typeof vi.fn>;
	};
	currentUser: { id: string; employeeId: string; email: string } | null;
	brandId: string | null;
	outletIds: string[];
	requestId: string;
	dbAdmin: unknown;
};

function makeCtx(opts: {
	rpc?: (fn: string, params: unknown) => { data: unknown; error: unknown };
	servicesForCapCheck?: Array<{
		id: string;
		name: string;
		discount_cap: number | null;
	}>;
	paymentMethodLookup?: Array<Record<string, unknown>>;
}): MockCtx {
	const rpc = vi.fn((fn: string, params: unknown) =>
		Promise.resolve(opts.rpc ? opts.rpc(fn, params) : { data: null, error: null }),
	);
	// Minimal chainable builder. Each .from() call returns a new object that
	// supports .select().in() for the cap-check and .select().eq() for the
	// payment-method lookup in assertPaymentFields.
	const from = vi.fn((table: string) => {
		if (table === "services") {
			return {
				select: () => ({
					in: () =>
						Promise.resolve({
							data: opts.servicesForCapCheck ?? [],
							error: null,
						}),
				}),
			};
		}
		if (table === "payment_methods") {
			const defaultRows = opts.paymentMethodLookup ?? [
				{
					code: "cash",
					name: "Cash",
					is_active: true,
					requires_bank: false,
					requires_card_type: false,
					requires_trace_no: false,
					requires_approval_code: false,
					requires_reference_no: false,
					requires_months: false,
					requires_remarks: false,
				},
			];
			return {
				select: () => ({
					in: () => Promise.resolve({ data: defaultRows, error: null }),
					eq: () => ({
						maybeSingle: () =>
							Promise.resolve({ data: defaultRows[0], error: null }),
					}),
				}),
			};
		}
		return {
			select: () => ({
				in: () => Promise.resolve({ data: [], error: null }),
				eq: () => ({
					maybeSingle: () => Promise.resolve({ data: null, error: null }),
				}),
			}),
		};
	});
	return {
		db: { rpc, from },
		currentUser: {
			id: "00000000-0000-0000-0000-0000000000a0",
			employeeId: "00000000-0000-0000-0000-0000000000e0",
			email: "test@example.com",
		},
		brandId: "00000000-0000-0000-0000-000000000001",
		outletIds: [],
		requestId: "test-request",
		dbAdmin: null,
	};
}

describe("collectAppointmentPayment", () => {
	const appointmentId = "00000000-0000-0000-0000-00000000a000";
	const input = {
		items: [
			{
				service_id: "00000000-0000-0000-0000-000000000001",
				inventory_item_id: null,
				sku: "SVC-CLN",
				item_name: "Dental Cleaning",
				item_type: "service" as const,
				quantity: 1,
				unit_price: 150,
				discount: 0,
				tax_id: null,
			},
		],
		discount: 0,
		tax: 0,
		rounding: 0,
		payments: [{ mode: "cash", amount: 150 }],
	};

	it("happy path — returns RPC result when DB succeeds", async () => {
		const ctx = makeCtx({
			rpc: () => ({
				data: {
					sales_order_id: "00000000-0000-0000-0000-000000000050",
					so_number: "SO-000123",
					invoice_no: "IV-000123",
					subtotal: 150,
					total: 150,
				},
				error: null,
			}),
		});
		const result = await collectAppointmentPayment(
			ctx as never,
			appointmentId,
			input,
		);
		expect(result.so_number).toBe("SO-000123");
		expect(result.invoice_no).toBe("IV-000123");
		expect(result.total).toBe(150);
		expect(ctx.db.rpc).toHaveBeenCalledWith(
			"collect_appointment_payment",
			expect.objectContaining({ p_appointment_id: appointmentId }),
		);
	});

	it("rollback — maps DB error to ValidationError", async () => {
		const ctx = makeCtx({
			rpc: () => ({
				data: null,
				error: { message: "insufficient stock for SKU PRD-001" },
			}),
		});
		await expect(
			collectAppointmentPayment(ctx as never, appointmentId, input),
		).rejects.toThrow(ValidationError);
		await expect(
			collectAppointmentPayment(ctx as never, appointmentId, input),
		).rejects.toThrow(/insufficient stock/);
	});

	it("rollback — null RPC return raises ValidationError", async () => {
		const ctx = makeCtx({ rpc: () => ({ data: null, error: null }) });
		await expect(
			collectAppointmentPayment(ctx as never, appointmentId, input),
		).rejects.toThrow(ValidationError);
		await expect(
			collectAppointmentPayment(ctx as never, appointmentId, input),
		).rejects.toThrow(/returned no result/);
	});

	it("enforces per-service discount cap BEFORE hitting the RPC", async () => {
		const ctx = makeCtx({
			servicesForCapCheck: [
				{
					id: "00000000-0000-0000-0000-000000000001",
					name: "Dental Cleaning",
					discount_cap: 5, // 5%
				},
			],
			rpc: () => ({
				data: { sales_order_id: "x", so_number: "y", invoice_no: "z" },
				error: null,
			}),
		});
		const overCap = {
			...input,
			items: [
				{
					...input.items[0],
					discount: 30, // 20% of 150 — exceeds 5% cap (RM 7.50)
				},
			],
		};
		await expect(
			collectAppointmentPayment(ctx as never, appointmentId, overCap),
		).rejects.toThrow(/exceeds the 5% cap/);
		// Cap failure MUST short-circuit before the RPC call.
		expect(ctx.db.rpc).not.toHaveBeenCalled();
	});

	it("invalid Zod input raises ZodError (short-circuits before DB access)", async () => {
		const ctx = makeCtx({});
		await expect(
			collectAppointmentPayment(ctx as never, appointmentId, {
				...input,
				items: [],
			}),
		).rejects.toThrow(ZodError);
		expect(ctx.db.rpc).not.toHaveBeenCalled();
	});
});

describe("voidSalesOrder", () => {
	const salesOrderId = "00000000-0000-0000-0000-000000000050";
	const validVoidInput = {
		reason: "CUSTOMER_CANCELLATION",
		passcode: "1234",
		refund_method: "cash",
		include_admin_fee: false,
		admin_fee: 0,
		sale_item_ids: ["00000000-0000-0000-0000-0000000000aa"],
	};

	it("happy path — returns CN/RN result", async () => {
		const ctx = makeCtx({
			rpc: () => ({
				data: {
					cn_id: "cn-1",
					cn_number: "CN-000001",
					rn_id: "rn-1",
					rn_number: "RN-000001",
					refund_amount: 150,
					sales_order_id: salesOrderId,
				},
				error: null,
			}),
		});
		const result = await voidSalesOrder(ctx as never, salesOrderId, validVoidInput);
		expect(result.cn_number).toBe("CN-000001");
		expect(result.rn_number).toBe("RN-000001");
		expect(result.refund_amount).toBe(150);
	});

	it("maps passcode-failure message to ValidationError", async () => {
		const ctx = makeCtx({
			rpc: () => ({
				data: null,
				error: { message: "Invalid or expired passcode" },
			}),
		});
		await expect(
			voidSalesOrder(ctx as never, salesOrderId, validVoidInput),
		).rejects.toThrow(/Invalid or expired passcode/);
	});
});

describe("issueRefund", () => {
	const salesOrderId = "00000000-0000-0000-0000-000000000050";

	it("happy path — standalone refund insert", async () => {
		const ctx = makeCtx({
			rpc: () => ({
				data: {
					rn_id: "rn-std-1",
					rn_number: "RN-000007",
					amount: 50,
					sales_order_id: salesOrderId,
				},
				error: null,
			}),
		});
		const result = await issueRefund(ctx as never, salesOrderId, {
			amount: 50,
			refund_method: "cash",
			notes: "goodwill",
		});
		expect(result.rn_number).toBe("RN-000007");
		expect(result.amount).toBe(50);
	});

	it("rejects non-positive amount (Zod layer)", async () => {
		const ctx = makeCtx({});
		await expect(
			issueRefund(ctx as never, salesOrderId, {
				amount: 0,
				refund_method: "cash",
			}),
		).rejects.toThrow(ZodError);
	});

	it("rejects missing refund_method (Zod layer)", async () => {
		const ctx = makeCtx({});
		await expect(
			issueRefund(ctx as never, salesOrderId, {
				amount: 50,
				refund_method: "",
			}),
		).rejects.toThrow(ZodError);
	});

	it("maps DB 'amount exceeds order total' to ValidationError", async () => {
		const ctx = makeCtx({
			rpc: () => ({
				data: null,
				error: { message: "Refund amount exceeds order total" },
			}),
		});
		await expect(
			issueRefund(ctx as never, salesOrderId, {
				amount: 9999,
				refund_method: "cash",
			}),
		).rejects.toThrow(/exceeds order total/);
	});
});
