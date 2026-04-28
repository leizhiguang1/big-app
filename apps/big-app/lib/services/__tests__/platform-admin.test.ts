import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { ConflictError } from "@/lib/errors";
import {
	adminRenameSubdomainSchema,
	createBrandSchema,
	renameSubdomainSchema,
	setBrandActiveSchema,
	updateBrandSchema,
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
		admin_email: "jane@sunshine.com",
		admin_password: "password123",
		admin_first_name: "Jane",
		admin_last_name: "Doe",
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

	it("lowercases the admin email", () => {
		const out = createBrandSchema.parse({
			...valid,
			admin_email: "Jane@Sunshine.COM",
		});
		expect(out.admin_email).toBe("jane@sunshine.com");
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

	it("rejects code that doesn't start with a letter", () => {
		expect(() => createBrandSchema.parse({ ...valid, code: "12" })).toThrow(
			ZodError,
		);
	});

	it("rejects unsupported currency", () => {
		expect(() =>
			createBrandSchema.parse({ ...valid, currency_code: "XXX" }),
		).toThrow(ZodError);
	});

	it("rejects empty admin names", () => {
		expect(() =>
			createBrandSchema.parse({ ...valid, admin_first_name: "  " }),
		).toThrow(ZodError);
	});

	it("rejects invalid admin email", () => {
		expect(() =>
			createBrandSchema.parse({ ...valid, admin_email: "not-an-email" }),
		).toThrow(ZodError);
	});

	it("rejects too-short admin password (<8 chars)", () => {
		expect(() =>
			createBrandSchema.parse({ ...valid, admin_password: "short" }),
		).toThrow(ZodError);
	});
});

describe("updateBrandSchema", () => {
	const valid = {
		brand_id: "00000000-0000-0000-0000-0000000000b1",
		name: "New Name",
		nickname: "Nick",
		currency_code: "MYR",
	};

	it("accepts a valid input", () => {
		expect(updateBrandSchema.parse(valid)).toMatchObject(valid);
	});

	it("accepts an empty nickname (means clear)", () => {
		const out = updateBrandSchema.parse({ ...valid, nickname: "" });
		expect(out.nickname).toBe("");
	});

	it("rejects a non-uuid brand_id", () => {
		expect(() =>
			updateBrandSchema.parse({ ...valid, brand_id: "not-a-uuid" }),
		).toThrow(ZodError);
	});
});

describe("setBrandActiveSchema", () => {
	it("accepts true / false", () => {
		const valid = {
			brand_id: "00000000-0000-0000-0000-0000000000b1",
			is_active: true,
		};
		expect(setBrandActiveSchema.parse(valid)).toMatchObject(valid);
		expect(
			setBrandActiveSchema.parse({ ...valid, is_active: false }),
		).toMatchObject({ ...valid, is_active: false });
	});
});

describe("renameSubdomainSchema (tenant)", () => {
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
});

describe("adminRenameSubdomainSchema (apex)", () => {
	it("requires brand_id and matching confirm", () => {
		const out = adminRenameSubdomainSchema.parse({
			brand_id: "00000000-0000-0000-0000-0000000000b1",
			subdomain: "newname",
			confirm_subdomain: "newname",
		});
		expect(out.brand_id).toBe("00000000-0000-0000-0000-0000000000b1");
	});

	it("rejects mismatched confirm", () => {
		expect(() =>
			adminRenameSubdomainSchema.parse({
				brand_id: "00000000-0000-0000-0000-0000000000b1",
				subdomain: "newname",
				confirm_subdomain: "different",
			}),
		).toThrow(ZodError);
	});
});

// Service-layer behaviour. We mock the admin SDK + RPC and assert wiring.

type AuthAdmin = {
	createUser: ReturnType<typeof vi.fn>;
	deleteUser: ReturnType<typeof vi.fn>;
};

type MockCtx = {
	currentUser: { id: string; employeeId: string | null; email: string } | null;
	brandId: string | null;
	dbAdmin: {
		rpc: ReturnType<typeof vi.fn>;
		auth: { admin: AuthAdmin };
	};
	db: unknown;
	outletIds: string[];
	requestId: string;
};

function makeCtx(opts: {
	rpc?: (fn: string, params: unknown) => { data: unknown; error: unknown };
	createUser?: () => {
		data: { user: { id: string } | null };
		error: { message: string } | null;
	};
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
			auth: {
				admin: {
					createUser: vi.fn(async () =>
						opts.createUser
							? opts.createUser()
							: {
									data: {
										user: { id: "00000000-0000-0000-0000-00000000beef" },
									},
									error: null,
								},
					),
					deleteUser: vi.fn(async () => ({ data: {}, error: null })),
				},
			},
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
		admin_email: "jane@sunshine.com",
		admin_password: "password123",
		admin_first_name: "Jane",
		admin_last_name: "Doe",
	};

	it("happy path — provisions auth user, then calls RPC with new user id", async () => {
		const newAuthId = "00000000-0000-0000-0000-00000000beef";
		const ctx = makeCtx({
			createUser: () => ({
				data: { user: { id: newAuthId } },
				error: null,
			}),
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
		expect(result.admin_user_id).toBe(newAuthId);
		expect(result.admin_email).toBe("jane@sunshine.com");

		expect(ctx.dbAdmin.auth.admin.createUser).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "jane@sunshine.com",
				password: "password123",
				email_confirm: true,
			}),
		);
		expect(ctx.dbAdmin.rpc).toHaveBeenCalledWith(
			"create_brand_atomic",
			expect.objectContaining({
				p_subdomain: "sunshine",
				p_code: "SUN",
				p_owner_auth_user_id: newAuthId,
				p_owner_email: "jane@sunshine.com",
			}),
		);
	});

	it("rejects duplicate-email at the auth layer with ConflictError", async () => {
		const ctx = makeCtx({
			createUser: () => ({
				data: { user: null },
				error: { message: "User already registered" },
			}),
		});
		await expect(createBrand(ctx as never, valid)).rejects.toThrow(
			ConflictError,
		);
		expect(ctx.dbAdmin.rpc).not.toHaveBeenCalled();
	});

	it("rolls back the auth user when the RPC fails", async () => {
		const newAuthId = "00000000-0000-0000-0000-00000000beef";
		const ctx = makeCtx({
			createUser: () => ({
				data: { user: { id: newAuthId } },
				error: null,
			}),
			rpc: () => ({
				data: null,
				error: { message: 'Subdomain "admin" is reserved' },
			}),
		});
		await expect(
			createBrand(ctx as never, { ...valid, subdomain: "admin" }),
		).rejects.toThrow(ConflictError);
		expect(ctx.dbAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(newAuthId);
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
});

describe("renameBrandSubdomain service (tenant)", () => {
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
