import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
	emptyPermissions,
	normalizePermissions,
	type RolePermissions,
} from "@/lib/schemas/role-permissions";
import { roleInputSchema } from "@/lib/schemas/roles";
import type { Tables } from "@/lib/supabase/types";

type RoleRow = Tables<"roles">;

export type Role = Omit<RoleRow, "permissions"> & {
	permissions: RolePermissions;
};

function hydrate(row: RoleRow): Role {
	return { ...row, permissions: normalizePermissions(row.permissions) };
}

export async function listRoles(ctx: Context): Promise<Role[]> {
	const { data, error } = await ctx.db
		.from("roles")
		.select("*")
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return (data ?? []).map(hydrate);
}

export async function getRole(ctx: Context, id: string): Promise<Role> {
	const { data, error } = await ctx.db
		.from("roles")
		.select("*")
		.eq("id", id)
		.single();
	if (error || !data) throw new NotFoundError(`Role ${id} not found`);
	return hydrate(data);
}

export async function createRole(ctx: Context, input: unknown): Promise<Role> {
	const parsed = roleInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("roles")
		.insert({
			name: parsed.name,
			is_active: parsed.is_active,
			permissions: parsed.permissions,
		})
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A role with that name already exists");
		throw new ValidationError(error.message);
	}
	return hydrate(data);
}

export async function updateRole(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Role> {
	const parsed = roleInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("roles")
		.update({
			name: parsed.name,
			is_active: parsed.is_active,
			permissions: parsed.permissions,
		})
		.eq("id", id)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A role with that name already exists");
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`Role ${id} not found`);
	return hydrate(data);
}

export async function deleteRole(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db.from("roles").delete().eq("id", id);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This role is assigned to one or more employees. Reassign them first.",
			);
		throw new ValidationError(error.message);
	}
}

export { emptyPermissions };
