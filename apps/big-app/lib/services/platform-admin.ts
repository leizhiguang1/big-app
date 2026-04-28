import type { Context } from "@/lib/context/types";
import { ConflictError, ValidationError } from "@/lib/errors";
import {
	type CreateBrandInput,
	createBrandSchema,
} from "@/lib/schemas/admin-brands";
import type { Tables } from "@/lib/supabase/types";

// Platform-admin services. Callers MUST gate with assertPlatformAdmin
// before reaching these functions — none of these enforce the membership
// check themselves, since some operate cross-brand by design (listing all
// brands, creating a brand the caller isn't yet a member of).

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
};

export async function createBrand(
	ctx: Context,
	input: unknown,
): Promise<CreateBrandResult> {
	if (!ctx.currentUser) throw new ValidationError("Not signed in");
	const parsed: CreateBrandInput = createBrandSchema.parse(input);

	const { data, error } = await ctx.dbAdmin.rpc("create_brand_atomic", {
		p_subdomain: parsed.subdomain,
		p_code: parsed.code,
		p_name: parsed.name,
		p_currency_code: parsed.currency_code,
		p_owner_auth_user_id: ctx.currentUser.id,
		p_owner_first_name: parsed.owner_first_name,
		p_owner_last_name: parsed.owner_last_name,
		p_owner_email: ctx.currentUser.email,
	});

	if (error) {
		const msg = error.message ?? "Failed to create brand";
		if (msg.includes("reserved")) throw new ConflictError(msg);
		if (msg.includes("released within")) throw new ConflictError(msg);
		if (error.code === "23505") {
			if (msg.includes("brands_subdomain"))
				throw new ConflictError(`Subdomain "${parsed.subdomain}" is taken`);
			if (msg.includes("brands_code"))
				throw new ConflictError(`Brand code "${parsed.code}" is taken`);
			throw new ConflictError(msg);
		}
		throw new ValidationError(msg);
	}
	if (!data) throw new ValidationError("Brand creation returned no result");
	return data as unknown as CreateBrandResult;
}

// Workspaces the signed-in user belongs to. Used by /select-brand to scope
// the list to the current user's brands when they're authenticated.
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
