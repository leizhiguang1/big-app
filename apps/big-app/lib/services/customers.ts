import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { customerInputSchema } from "@/lib/schemas/customers";
import { assertBrandId } from "@/lib/supabase/query";
import type { Tables } from "@/lib/supabase/types";

export type Customer = Tables<"customers">;

export type CustomerWithRelations = Customer & {
	home_outlet: { id: string; name: string; code: string } | null;
	consultant: {
		id: string;
		first_name: string;
		last_name: string;
		code: string;
	} | null;
};

export type CustomerIdentity = {
	id: string;
	code: string;
	first_name: string;
	last_name: string | null;
	profile_image_path: string | null;
	phone?: string | null;
	id_number?: string | null;
	is_vip?: boolean | null;
	is_staff?: boolean | null;
	tag?: string | null;
};

const SELECT_WITH_RELATIONS =
	"*, home_outlet:outlets!customers_home_outlet_id_fkey(id, name, code), consultant:employees!customers_consultant_id_fkey(id, first_name, last_name, code)";

function nz(value: string | undefined | null): string | null {
	if (value === undefined || value === null) return null;
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
}

function normalize(input: unknown) {
	const p = customerInputSchema.parse(input);
	return {
		id: p.id,
		salutation: p.salutation,
		first_name: p.first_name,
		last_name: nz(p.last_name),
		gender: p.gender ?? null,
		date_of_birth: nz(p.date_of_birth),
		profile_image_path: p.profile_image_path ?? null,
		id_type: p.id_type,
		id_number: nz(p.id_number),
		phone: p.phone,
		phone2: nz(p.phone2),
		email: nz(p.email),
		country_of_origin: nz(p.country_of_origin),
		address1: nz(p.address1),
		address2: nz(p.address2),
		city: nz(p.city),
		state: nz(p.state),
		postcode: nz(p.postcode),
		address_country: p.address_country,
		home_outlet_id: p.home_outlet_id,
		consultant_id: p.consultant_id,
		source: p.source ?? null,
		external_code: nz(p.external_code),
		is_vip: p.is_vip,
		is_staff: p.is_staff,
		tag: nz(p.tag),
		smoker: p.smoker ?? null,
		drug_allergies: nz(p.drug_allergies),
		medical_conditions: p.medical_conditions ?? [],
		medical_alert: nz(p.medical_alert),
		opt_in_notifications: p.opt_in_notifications,
		opt_in_marketing: p.opt_in_marketing,
		join_date: nz(p.join_date) ?? undefined,
	};
}

export async function listCustomers(
	ctx: Context,
): Promise<CustomerWithRelations[]> {
	const { data, error } = await ctx.db
		.from("customers")
		.select(SELECT_WITH_RELATIONS)
		.eq("brand_id", assertBrandId(ctx))
		.order("code", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as CustomerWithRelations[];
}

export async function getCustomer(
	ctx: Context,
	id: string,
): Promise<CustomerWithRelations> {
	const { data, error } = await ctx.db
		.from("customers")
		.select(SELECT_WITH_RELATIONS)
		.eq("id", id)
		.eq("brand_id", assertBrandId(ctx))
		.single();
	if (error || !data) throw new NotFoundError(`Customer ${id} not found`);
	return data as unknown as CustomerWithRelations;
}

export async function createCustomer(
	ctx: Context,
	input: unknown,
): Promise<Customer> {
	const row = normalize(input);
	const insert = { ...row, brand_id: assertBrandId(ctx) };
	if (insert.id === undefined) {
		delete (insert as { id?: string }).id;
	}
	if (insert.join_date === undefined) {
		delete (insert as { join_date?: string }).join_date;
	}
	const { data, error } = await ctx.db
		.from("customers")
		.insert(insert)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A customer with that identifier already exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateCustomer(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Customer> {
	const row = normalize(input);
	const update = { ...row };
	delete (update as { id?: string }).id;
	if (update.join_date === undefined) {
		delete (update as { join_date?: string }).join_date;
	}
	const { data, error } = await ctx.db
		.from("customers")
		.update(update)
		.eq("id", id)
		.eq("brand_id", assertBrandId(ctx))
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A customer with that identifier already exists");
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`Customer ${id} not found`);
	return data;
}

export async function deleteCustomer(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db
		.from("customers")
		.delete()
		.eq("id", id)
		.eq("brand_id", assertBrandId(ctx));
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"Cannot delete: customer is referenced by other records",
			);
		throw new ValidationError(error.message);
	}
}
