import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
	type AdminRenameSubdomainInput,
	adminRenameSubdomainSchema,
	type CreateBrandInput,
	createBrandSchema,
	type SetBrandActiveInput,
	setBrandActiveSchema,
	type UpdateBrandInput,
	updateBrandSchema,
} from "@/lib/schemas/admin-brands";
import type { Tables } from "@/lib/supabase/types";

// Platform-admin services. Callers MUST gate with assertPlatformAdmin
// before reaching these functions — none of these enforce the membership
// check themselves, since they operate cross-brand by design.

export type AdminBrandRow = Pick<
	Tables<"brands">,
	| "id"
	| "code"
	| "name"
	| "nickname"
	| "subdomain"
	| "currency_code"
	| "is_active"
	| "created_at"
> & {
	employee_count: number;
};

export async function listAllBrandsAdmin(
	ctx: Context,
): Promise<AdminBrandRow[]> {
	const { data, error } = await ctx.dbAdmin
		.from("brands")
		.select(
			"id, code, name, nickname, subdomain, currency_code, is_active, created_at, employees(count)",
		)
		.order("created_at", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return (data ?? []).map((row) => {
		const { employees, ...rest } = row as Tables<"brands"> & {
			employees: { count: number }[] | null;
		};
		return {
			...rest,
			employee_count: employees?.[0]?.count ?? 0,
		};
	});
}

export type CreateBrandResult = {
	brand_id: string;
	employee_id: string;
	subdomain: string;
	code: string;
	admin_user_id: string;
	admin_email: string;
};

// Brand creation provisions a NEW auth user as the brand's admin and inserts
// the bootstrap employee for that user. The platform admin who invokes this
// is NOT added to the brand — they stay platform-admin-only and never become
// a tenant member.
export async function createBrand(
	ctx: Context,
	input: unknown,
): Promise<CreateBrandResult> {
	const parsed: CreateBrandInput = createBrandSchema.parse(input);

	// 1. Provision the brand-admin auth user. Reject duplicate emails — if a
	//    platform admin wants to make an existing user the admin of a new
	//    brand, that's a different flow (manual employees insert) we'll
	//    add when needed.
	const { data: created, error: createUserError } =
		await ctx.dbAdmin.auth.admin.createUser({
			email: parsed.admin_email,
			password: parsed.admin_password,
			email_confirm: true,
			user_metadata: {
				first_name: parsed.admin_first_name,
				last_name: parsed.admin_last_name,
			},
		});
	if (createUserError || !created.user) {
		const msg = createUserError?.message ?? "Failed to create admin user";
		if (
			msg.toLowerCase().includes("already") ||
			msg.toLowerCase().includes("registered")
		) {
			throw new ConflictError(
				`Email "${parsed.admin_email}" is already registered. Use a different email for the brand admin.`,
			);
		}
		throw new ValidationError(msg);
	}
	const adminUserId = created.user.id;

	// 2. Create brand + bootstrap employee atomically. If this fails, roll
	//    back the auth user we just created so we don't leave orphans.
	const { data, error } = await ctx.dbAdmin.rpc("create_brand_atomic", {
		p_subdomain: parsed.subdomain,
		p_code: parsed.code,
		p_name: parsed.name,
		p_currency_code: parsed.currency_code,
		p_owner_auth_user_id: adminUserId,
		p_owner_first_name: parsed.admin_first_name,
		p_owner_last_name: parsed.admin_last_name,
		p_owner_email: parsed.admin_email,
	});

	if (error || !data) {
		await ctx.dbAdmin.auth.admin.deleteUser(adminUserId).catch(() => {});
		const msg = error?.message ?? "Failed to create brand";
		if (msg.includes("reserved")) throw new ConflictError(msg);
		if (msg.includes("released within")) throw new ConflictError(msg);
		if (error?.code === "23505") {
			if (msg.includes("brands_subdomain"))
				throw new ConflictError(`Subdomain "${parsed.subdomain}" is taken`);
			if (msg.includes("brands_code"))
				throw new ConflictError(`Brand code "${parsed.code}" is taken`);
			throw new ConflictError(msg);
		}
		throw new ValidationError(msg);
	}
	const result = data as unknown as Omit<
		CreateBrandResult,
		"admin_user_id" | "admin_email"
	>;
	return {
		...result,
		admin_user_id: adminUserId,
		admin_email: parsed.admin_email,
	};
}

export async function updateBrandAdmin(
	ctx: Context,
	input: unknown,
): Promise<Tables<"brands">> {
	const parsed: UpdateBrandInput = updateBrandSchema.parse(input);
	const { data, error } = await ctx.dbAdmin
		.from("brands")
		.update({
			name: parsed.name,
			nickname: parsed.nickname.length ? parsed.nickname : null,
			currency_code: parsed.currency_code,
		})
		.eq("id", parsed.brand_id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Brand ${parsed.brand_id} not found`);
	return data;
}

export async function setBrandActive(
	ctx: Context,
	input: unknown,
): Promise<Tables<"brands">> {
	const parsed: SetBrandActiveInput = setBrandActiveSchema.parse(input);
	const { data, error } = await ctx.dbAdmin
		.from("brands")
		.update({ is_active: parsed.is_active })
		.eq("id", parsed.brand_id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Brand ${parsed.brand_id} not found`);
	return data;
}

// Apex variant of subdomain rename. Same RPC as the tenant-side flow, but
// takes brand_id explicitly so the platform admin doesn't need a tenant
// session.
export async function adminRenameSubdomain(
	ctx: Context,
	input: unknown,
): Promise<{ brand_id: string; subdomain: string; changed: boolean }> {
	const parsed: AdminRenameSubdomainInput =
		adminRenameSubdomainSchema.parse(input);
	const { data, error } = await ctx.dbAdmin.rpc("rename_brand_subdomain", {
		p_brand_id: parsed.brand_id,
		p_new_subdomain: parsed.subdomain,
		p_changed_by: ctx.currentUser?.id ?? undefined,
	});
	if (error) {
		const msg = error.message ?? "Failed to rename subdomain";
		if (msg.includes("reserved") || msg.includes("released within"))
			throw new ConflictError(msg);
		if (error.code === "23505")
			throw new ConflictError(`Subdomain "${parsed.subdomain}" is taken`);
		throw new ValidationError(msg);
	}
	if (!data) throw new ValidationError("Rename returned no result");
	return data as unknown as {
		brand_id: string;
		subdomain: string;
		changed: boolean;
	};
}

export type UserWorkspace = {
	id: string;
	name: string;
	nickname: string | null;
	subdomain: string;
	logo_url: string | null;
	is_active: boolean;
};

export async function listWorkspacesForUser(
	ctx: Context,
): Promise<UserWorkspace[]> {
	if (!ctx.currentUser) return [];
	// brand-filter:exempt — workspace picker enumerates every brand the
	// signed-in auth user belongs to, by definition cross-brand.
	const { data, error } = await ctx.dbAdmin
		.from("employees")
		.select(
			"brand:brands!employees_brand_id_fkey!inner(id, name, nickname, subdomain, logo_url, is_active)",
		)
		.eq("auth_user_id", ctx.currentUser.id)
		.eq("is_active", true);
	if (error) throw new ValidationError(error.message);
	const seen = new Set<string>();
	const out: UserWorkspace[] = [];
	for (const row of (data ?? []) as unknown as {
		brand: UserWorkspace | null;
	}[]) {
		const b = row.brand;
		if (!b || !b.is_active) continue;
		if (seen.has(b.id)) continue;
		seen.add(b.id);
		out.push(b);
	}
	out.sort((a, b) => a.name.localeCompare(b.name));
	return out;
}
