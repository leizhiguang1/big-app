import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { collectPaymentInputSchema } from "@/lib/schemas/sales";

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

	it("rejects invalid payment mode", () => {
		expect(() =>
			collectPaymentInputSchema.parse(
				validInput({
					payments: [{ mode: "bitcoin", amount: 150, reference_no: null }],
				}),
			),
		).toThrow(ZodError);
	});

	it("accepts all valid payment modes", () => {
		for (const mode of [
			"cash",
			"card",
			"bank_transfer",
			"e_wallet",
			"other",
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
