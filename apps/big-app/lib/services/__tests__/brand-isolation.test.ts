import { describe, expect, it } from "vitest";
import * as appointments from "@/lib/services/appointments";
import * as billing from "@/lib/services/billing-settings";
import * as brandConfig from "@/lib/services/brand-config";
import * as brandSettings from "@/lib/services/brand-settings";
import * as caseNotes from "@/lib/services/case-notes";
import * as customerDocs from "@/lib/services/customer-documents";
import * as customers from "@/lib/services/customers";
import * as employees from "@/lib/services/employees";
import * as followUps from "@/lib/services/follow-ups";
import * as inventory from "@/lib/services/inventory";
import * as outlets from "@/lib/services/outlets";
import * as paymentMethods from "@/lib/services/payment-methods";
import * as receipts from "@/lib/services/receipts";
import * as sales from "@/lib/services/sales";
import * as services from "@/lib/services/services";
import * as taxes from "@/lib/services/taxes";

// Brand-isolation contract test.
//
// What this verifies: every list/get function on a Tier-A or Tier-C table
// applies a brand filter — either directly via `.eq("brand_id", …)` or
// transitively via an ownership pre-check that joins the closest
// brand-bearing ancestor (outlets, customers, employees).
//
// What this does NOT verify: that the database actually returns 0 rows from
// brand B (we have no real DB in this suite). It's a structural test —
// every service call's recorded query trace must reference the caller's
// brandId, OR must have read from a parent table with a brand-scoped lookup.
// If a future commit removes a brand filter, this test fails.

const BRAND_A = "00000000-0000-0000-0000-0000000000a0";
const BRAND_B = "00000000-0000-0000-0000-0000000000b0";

type Trace = {
	tables: string[];
	eqs: Array<{ col: string; val: unknown }>;
	ins: Array<{ col: string; vals: unknown[] }>;
};

// Chainable recorder. .single/.maybeSingle resolve to a single owned row;
// any direct await on the chain (no terminal call) resolves to an empty
// array. This lets ownership pre-checks pass and list queries return [].
function ctxFor(brandId: string) {
	const trace: Trace = { tables: [], eqs: [], ins: [] };

	function chain(table: string): unknown {
		const handler: ProxyHandler<object> = {
			get(_t, prop) {
				if (prop === "then") {
					return (onFulfilled: (v: unknown) => unknown) =>
						Promise.resolve({ data: [], error: null }).then(onFulfilled);
				}
				if (prop === "single" || prop === "maybeSingle") {
					return () =>
						Promise.resolve({
							data: { id: "owned", brand_id: brandId, [table]: null },
							error: null,
						});
				}
				if (prop === "eq") {
					return (col: string, val: unknown) => {
						trace.eqs.push({ col, val });
						return chain(table);
					};
				}
				if (prop === "in") {
					return (col: string, vals: unknown[]) => {
						trace.ins.push({ col, vals });
						return chain(table);
					};
				}
				return () => chain(table);
			},
		};
		return new Proxy({}, handler);
	}

	const db = {
		from(table: string) {
			trace.tables.push(table);
			return chain(table);
		},
		rpc: () => Promise.resolve({ data: null, error: null }),
		// Storage methods used by services that handle storage ops; safe
		// no-ops for the brand-isolation harness.
		storage: {
			from: () => ({
				getPublicUrl: () => ({ data: { publicUrl: "" } }),
				createSignedUploadUrl: () =>
					Promise.resolve({
						data: { signedUrl: "", token: "", path: "" },
						error: null,
					}),
				createSignedUrl: () =>
					Promise.resolve({ data: { signedUrl: "" }, error: null }),
				createSignedUrls: () => Promise.resolve({ data: [], error: null }),
				remove: () => Promise.resolve({ data: null, error: null }),
			}),
		},
	};
	return {
		ctx: {
			db,
			dbAdmin: db,
			currentUser: { id: "u", employeeId: "e", email: "x@y" },
			brandId,
			outletIds: [],
			requestId: "test",
		},
		trace,
	};
}

function brandIdReferenced(trace: Trace, brandId: string): boolean {
	if (trace.eqs.some((e) => e.val === brandId)) return true;
	// Some chains carry the brand check through a parent embed where the
	// filter is `eq("outlets.brand_id", brandId)` etc. — covered above.
	return false;
}

describe("brand isolation — Tier-A direct filters", () => {
	it("listCustomers filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await customers.listCustomers(ctx as never);
		expect(trace.tables).toContain("customers");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listOutlets filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await outlets.listOutlets(ctx as never);
		expect(trace.tables).toContain("outlets");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listEmployees filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await employees.listEmployees(ctx as never);
		expect(trace.tables).toContain("employees");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listServices filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await services.listServices(ctx as never);
		expect(trace.tables).toContain("services");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listInventoryItems filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await inventory.listInventoryItems(ctx as never);
		expect(trace.tables).toContain("inventory_items");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listSellableProducts filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await inventory.listSellableProducts(ctx as never);
		expect(trace.tables).toContain("inventory_items");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listPaymentMethods filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await paymentMethods.listPaymentMethods(ctx as never);
		expect(trace.tables).toContain("payment_methods");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listActivePaymentMethods filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await paymentMethods.listActivePaymentMethods(ctx as never);
		expect(trace.tables).toContain("payment_methods");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listTaxes filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await taxes.listTaxes(ctx as never);
		expect(trace.tables).toContain("taxes");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listActiveTaxes filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await taxes.listActiveTaxes(ctx as never);
		expect(trace.tables).toContain("taxes");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("getBillingSettings filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		try {
			await billing.getBillingSettings(ctx as never);
		} catch {
			// Mock returns no row → service throws NotFoundError. That's fine
			// for this test; we only care that brand_id was filtered.
		}
		expect(trace.tables).toContain("billing_settings");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listBrandSettings filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await brandSettings.listBrandSettings(ctx as never);
		expect(trace.tables).toContain("brand_settings");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listBrandConfigItems filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await brandConfig.listBrandConfigItems(ctx as never, "salutation");
		expect(trace.tables).toContain("brand_config_items");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});
});

describe("brand isolation — Tier-C ownership pre-checks", () => {
	it("listAppointmentsForRange checks outlet ownership", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await appointments.listAppointmentsForRange(ctx as never, {
			outletId: "o-1",
			from: "2026-04-01",
			to: "2026-04-30",
		});
		expect(trace.tables).toContain("outlets");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listCustomerAppointments checks customer ownership", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await appointments.listCustomerAppointments(ctx as never, "c-1");
		expect(trace.tables).toContain("customers");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listCustomerTimeline checks customer ownership", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await appointments.listCustomerTimeline(ctx as never, "c-1");
		expect(trace.tables).toContain("customers");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listSalesOrders applies brand filter via outlet join", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await sales.listSalesOrders(ctx as never);
		expect(trace.tables).toContain("sales_orders");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listSaleItems checks sales-order ownership", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await sales.listSaleItems(ctx as never, "so-1");
		expect(trace.tables).toContain("sales_orders");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listPayments applies brand filter via outlet join", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await sales.listPayments(ctx as never);
		expect(trace.tables).toContain("payments");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listCancellations applies brand filter via outlet join", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await sales.listCancellations(ctx as never);
		expect(trace.tables).toContain("cancellations");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listRefundNotes applies brand filter via outlet join", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await sales.listRefundNotes(ctx as never);
		expect(trace.tables).toContain("refund_notes");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listCaseNotesForCustomer checks customer ownership", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await caseNotes.listCaseNotesForCustomer(ctx as never, "c-1");
		expect(trace.tables).toContain("customers");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listCustomerDocuments checks customer ownership", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await customerDocs.listCustomerDocuments(ctx as never, "c-1");
		expect(trace.tables).toContain("customers");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("listFollowUpsForCustomer checks customer ownership", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		await followUps.listFollowUpsForCustomer(ctx as never, "c-1");
		expect(trace.tables).toContain("customers");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});

	it("getReceiptByPaymentId joins outlet and filters by brand_id", async () => {
		const { ctx, trace } = ctxFor(BRAND_A);
		try {
			await receipts.getReceiptByPaymentId(ctx as never, "p-1");
		} catch {
			// Mock returns minimal data; shapeReceipt may throw downstream.
			// We only assert the brand filter on the receipt query itself.
		}
		expect(trace.tables).toContain("receipts");
		expect(brandIdReferenced(trace, BRAND_A)).toBe(true);
	});
});

describe("brand isolation — different brands are not interchangeable", () => {
	it("brand A and brand B contexts produce different traces", async () => {
		const a = ctxFor(BRAND_A);
		const b = ctxFor(BRAND_B);
		await customers.listCustomers(a.ctx as never);
		await customers.listCustomers(b.ctx as never);
		expect(brandIdReferenced(a.trace, BRAND_A)).toBe(true);
		expect(brandIdReferenced(b.trace, BRAND_B)).toBe(true);
		// Brand A's trace must NOT contain brand B's id and vice versa.
		expect(a.trace.eqs.some((e) => e.val === BRAND_B)).toBe(false);
		expect(b.trace.eqs.some((e) => e.val === BRAND_A)).toBe(false);
	});
});
