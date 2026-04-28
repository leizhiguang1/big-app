import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { ConflictError, ValidationError } from "@/lib/errors";
import {
	createBrandSchema,
	renameSubdomainSchema,
} from "@/lib/schemas/admin-brands";
import { renameBrandSubdomain } from "@/lib/services/brands";
import { createBrand } from "@/lib/services/platform-admin";

// Schema validation — no DB needed.

describe("createBrandSchema", () => {
	const valid = {
		subdomain: "sunshine",
		code: "SUN",
		name: "Sunshine Dental",
		currency_code: "MYR",
		owner_first_name: "Jane",
		owner_last_name: "Doe",
	};

	it("accepts a valid input", () => {
		expect(createBrandSchema.parse(valid)).toMatchObject(valid);
	});

	it("lowercases the subdomain", () => {
		const out = createBrandSchema.parse({ ...valid, subdomain: "SunShine" });
		expect(out.subdomain).toBe("sunshine");
	});

	it("uppercases the code", () => {
		const out = createBrandSchema.parse({ ...valid, code: "sun" });
		expect(out.code).toBe("SUN");
	});

	it("rejects subdomain with leading dash", () => {
		expect(() =>
			createBrandSchema.parse({ ...valid, subdomain: "-sunshine" }),
		).toThrow(ZodError);
	});

	it("rejects subdomain with trailing dash", () => {
		expect(() =>
			createBrandSchema.parse({ ...valid, subdomain: "sunshine-" }),
		).toThrow(ZodError);
	});

	it("rejects subdomain with consecutive dashes", () => {
		expect(() =>
			createBrandSchema.parse({ ...valid, subdomain: "sun--shine" }),
		).toThrow(ZodError);
	});

	it("rejects too-short subdomain", () => {
		expect(() =>
			createBrandSchema.parse({ ...valid, subdomain: "ab" }),
		).toThrow(ZodError);
	});

	it("rejects too-long code (>8 chars)", () => {
		expect(() =>
			createBrandSchema.parse({ ...valid, code: "TOOLONG12" }),
		).toThrow(ZodError);
	});

	it("rejects code with lowercase letters in input pattern check", () => {
		// Lowercase gets uppercased before regex — but we want to ensure pure
		// digits or empty are still rejected by the leading-letter rule.
		expect(() => createBrandSchema.parse({ ...valid, code: "12" })).toThrow(
			ZodError,
		);
	});

	it("rejects unsupported currency", () => {
		expect(() =>
			createBrandSchema.parse({ ...valid, currency_code: "XXX" }),
		).toThrow(ZodError);
	});

	it("rejects empty owner names", () => {
		expect(() =>
			createBrandSchema.parse({ ...valid, owner_first_name: "  " }),
		).toThrow(ZodError);
	});
});

describe("renameSubdomainSchema", () => {
	it("accepts when both fields match", () => {
		const out = renameSubdomainSchema.parse({
			subdomain: "newname",
			confirm_subdomain: "newname",
		});
		expect(out.subdomain).toBe("newname");
	});

	it("rejects when confirmation does not match", () => {
		expect(() =>
			renameSubdomainSchema.parse({
				subdomain: "newname",
				confirm_subdomain: "different",
			}),
		).toThrow(ZodError);
	});

	it("lowercases both fields before comparing", () => {
		const out = renameSubdomainSchema.parse({
			subdomain: "NewName",
			confirm_subdomain: "NEWNAME",
		});
		expect(out.subdomain).toBe("newname");
		expect(out.confirm_subdomain).toBe("newname");
	});
});

// Service-layer behaviour. We mock ctx.dbAdmin.rpc and assert the wiring.

type MockCtx = {
	currentUser: { id: string; employeeId: string | null; email: string } | null;
	brandId: string | null;
	dbAdmin: {
		rpc: ReturnType<typeof vi.fn>;
	};
	db: unknown;
	outletIds: string[];
	requestId: string;
};

function makeCtx(opts: {
	rpc?: (fn: string, params: unknown) => { data: unknown; error: unknown };
	brandId?: string | null;
	currentUser?: MockCtx["currentUser"];
}): MockCtx {
	return {
		currentUser: opts.currentUser ?? {
			id: "00000000-0000-0000-0000-0000000000a1",
			employeeId: null,
			email: "admin@example.com",
		},
		brandId: opts.brandId ?? null,
		dbAdmin: {
			rpc: vi.fn(async (fn: string, params: unknown) =>
				opts.rpc ? opts.rpc(fn, params) : { data: null, error: null },
			),
		},
		db: null,
		outletIds: [],
		requestId: "test",
	};
}

describe("createBrand service", () => {
	const valid = {
		subdomain: "sunshine",
		code: "SUN",
		name: "Sunshine Dental",
		currency_code: "MYR",
		owner_first_name: "Jane",
		owner_last_name: "Doe",
	};

	it("happy path — calls create_brand_atomic with caller as owner", async () => {
		const ctx = makeCtx({
			rpc: () => ({
				data: {
					brand_id: "b1",
					employee_id: "e1",
					subdomain: "sunshine",
					code: "SUN",
				},
				error: null,
			}),
		});
		const result = await createBrand(ctx as never, valid);
		expect(result.brand_id).toBe("b1");
		expect(ctx.dbAdmin.rpc).toHaveBeenCalledWith(
			"create_brand_atomic",
			expect.objectContaining({
				p_subdomain: "sunshine",
				p_code: "SUN",
				p_name: "Sunshine Dental",
				p_currency_code: "MYR",
				p_owner_auth_user_id: "00000000-0000-0000-0000-0000000000a1",
				p_owner_email: "admin@example.com",
			}),
		);
	});

	it("maps reserved-name DB error to ConflictError", async () => {
		const ctx = makeCtx({
			rpc: () => ({
				data: null,
				error: { message: 'Subdomain "admin" is reserved' },
			}),
		});
		await expect(
			createBrand(ctx as never, { ...valid, subdomain: "admin" }),
		).rejects.toThrow(ConflictError);
	});

	it("maps cooldown DB error to ConflictError", async () => {
		const ctx = makeCtx({
			rpc: () => ({
				data: null,
				error: {
					message:
						'Subdomain "olddemo" was released within the last 30 days; please try again later or pick another',
				},
			}),
		});
		await expect(
			createBrand(ctx as never, { ...valid, subdomain: "olddemo" }),
		).rejects.toThrow(ConflictError);
	});

	it("maps unique-violation 23505 on subdomain to ConflictError with the value", async () => {
		const ctx = makeCtx({
			rpc: () => ({
				data: null,
				error: {
					code: "23505",
					message:
						'duplicate key value violates unique constraint "brands_subdomain_key"',
				},
			}),
		});
		await expect(createBrand(ctx as never, valid)).rejects.toThrow(
			/Subdomain "sunshine" is taken/,
		);
	});

	it("maps unique-violation 23505 on code to ConflictError", async () => {
		const ctx = makeCtx({
			rpc: () => ({
				data: null,
				error: {
					code: "23505",
					message:
						'duplicate key value violates unique constraint "brands_code_key"',
				},
			}),
		});
		await expect(createBrand(ctx as never, valid)).rejects.toThrow(
			/Brand code "SUN" is taken/,
		);
	});

	it("rejects when not signed in", async () => {
		const ctx = makeCtx({ currentUser: null });
		await expect(createBrand(ctx as never, valid)).rejects.toThrow(
			ValidationError,
		);
	});
});

describe("renameBrandSubdomain service", () => {
	it("happy path — calls rename_brand_subdomain", async () => {
		const ctx = makeCtx({
			brandId: "00000000-0000-0000-0000-0000000000b0",
			rpc: () => ({
				data: { brand_id: "b0", subdomain: "newname", changed: true },
				error: null,
			}),
		});
		const result = await renameBrandSubdomain(ctx as never, {
			subdomain: "newname",
			confirm_subdomain: "newname",
		});
		expect(result.changed).toBe(true);
		expect(ctx.dbAdmin.rpc).toHaveBeenCalledWith(
			"rename_brand_subdomain",
			expect.objectContaining({
				p_new_subdomain: "newname",
			}),
		);
	});

	it("maps cooldown DB error to ConflictError", async () => {
		const ctx = makeCtx({
			brandId: "b0",
			rpc: () => ({
				data: null,
				error: {
					message:
						'Subdomain "olddemo" was released within the last 30 days; please try again later or pick another',
				},
			}),
		});
		await expect(
			renameBrandSubdomain(ctx as never, {
				subdomain: "olddemo",
				confirm_subdomain: "olddemo",
			}),
		).rejects.toThrow(ConflictError);
	});

	it("rejects mismatched confirm_subdomain at the schema layer", async () => {
		const ctx = makeCtx({ brandId: "b0" });
		await expect(
			renameBrandSubdomain(ctx as never, {
				subdomain: "newname",
				confirm_subdomain: "different",
			}),
		).rejects.toThrow(ZodError);
	});
});
