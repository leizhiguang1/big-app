import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { employeeInputSchema } from "@/lib/schemas/employees";
import type { Tables } from "@/lib/supabase/types";

export type Employee = Tables<"employees">;

export type EmployeeWithRelations = Employee & {
	role: { id: string; name: string } | null;
	position: { id: string; name: string } | null;
};

const SELECT_WITH_RELATIONS =
	"*, role:roles(id, name), position:positions(id, name)";

const FOREVER_BAN = "876000h";

export async function listEmployees(
	ctx: Context,
): Promise<EmployeeWithRelations[]> {
	const { data, error } = await ctx.db
		.from("employees")
		.select(SELECT_WITH_RELATIONS)
		.order("code", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as EmployeeWithRelations[];
}

export async function getEmployee(
	ctx: Context,
	id: string,
): Promise<EmployeeWithRelations> {
	const { data, error } = await ctx.db
		.from("employees")
		.select(SELECT_WITH_RELATIONS)
		.eq("id", id)
		.single();
	if (error || !data) throw new NotFoundError(`Employee ${id} not found`);
	return data as unknown as EmployeeWithRelations;
}

function normalize(input: unknown) {
	const p = employeeInputSchema.parse(input);
	const nz = (v: string | undefined | null) => (v && v.length > 0 ? v : null);
	return {
		salutation: nz(p.salutation),
		first_name: p.first_name,
		last_name: p.last_name,
		gender: p.gender ?? null,
		date_of_birth: nz(p.date_of_birth),
		profile_image_path: p.profile_image_path ?? null,
		id_type: p.id_type,
		id_number: nz(p.id_number),
		email: p.email,
		phone: nz(p.phone),
		phone2: nz(p.phone2),
		role_id: p.role_id || null,
		position_id: p.position_id || null,
		start_date: nz(p.start_date),
		appointment_sequencing:
			typeof p.appointment_sequencing === "number"
				? p.appointment_sequencing
				: null,
		monthly_sales_target: p.monthly_sales_target,
		is_bookable: p.is_bookable,
		is_online_bookable: p.is_online_bookable,
		web_login_enabled: p.web_login_enabled,
		mfa_enabled: p.mfa_enabled,
		mobile_app_enabled: p.mobile_app_enabled,
		address1: nz(p.address1),
		address2: nz(p.address2),
		address3: nz(p.address3),
		postcode: nz(p.postcode),
		city: nz(p.city),
		state: nz(p.state),
		country: nz(p.country),
		language: nz(p.language),
		is_active: p.is_active,
	};
}

async function createAuthUser(
	ctx: Context,
	email: string,
	password: string,
): Promise<string> {
	const { data, error } = await ctx.dbAdmin.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
	});
	if (error || !data.user) {
		const msg = error?.message ?? "Failed to create auth user";
		if (msg.toLowerCase().includes("already")) throw new ConflictError(msg);
		throw new ValidationError(msg);
	}
	return data.user.id;
}

async function deleteAuthUser(ctx: Context, authUserId: string) {
	await ctx.dbAdmin.auth.admin.deleteUser(authUserId);
}

async function setAuthUserBanned(
	ctx: Context,
	authUserId: string,
	banned: boolean,
) {
	const { error } = await ctx.dbAdmin.auth.admin.updateUserById(authUserId, {
		ban_duration: banned ? FOREVER_BAN : "none",
	});
	if (error) throw new ValidationError(error.message);
}

async function updateAuthUserEmail(
	ctx: Context,
	authUserId: string,
	email: string,
) {
	const { error } = await ctx.dbAdmin.auth.admin.updateUserById(authUserId, {
		email,
	});
	if (error) {
		if (error.message.toLowerCase().includes("already"))
			throw new ConflictError(error.message);
		throw new ValidationError(error.message);
	}
}

export async function createEmployee(
	ctx: Context,
	input: unknown,
	password?: string,
): Promise<Employee> {
	const row = normalize(input);

	let authUserId: string | null = null;
	if (row.web_login_enabled) {
		if (!password) {
			throw new ValidationError(
				"Password is required when web login is enabled",
			);
		}
		authUserId = await createAuthUser(ctx, row.email, password);
		if (!row.is_active) {
			await setAuthUserBanned(ctx, authUserId, true);
		}
	}

	const { data, error } = await ctx.db
		.from("employees")
		.insert({ ...row, auth_user_id: authUserId })
		.select("*")
		.single();

	if (error) {
		if (authUserId) await deleteAuthUser(ctx, authUserId);
		if (error.code === "23505")
			throw new ConflictError("An employee with that email already exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateEmployee(
	ctx: Context,
	id: string,
	input: unknown,
	password?: string,
): Promise<Employee> {
	const row = normalize(input);

	const { data: existing, error: fetchError } = await ctx.db
		.from("employees")
		.select("*")
		.eq("id", id)
		.single();
	if (fetchError || !existing)
		throw new NotFoundError(`Employee ${id} not found`);

	let authUserId: string | null = existing.auth_user_id;
	let createdAuthUserHere = false;

	const turningOn = row.web_login_enabled && !existing.web_login_enabled;
	const turningOff = !row.web_login_enabled && existing.web_login_enabled;
	const becameInactive = !row.is_active && existing.is_active;
	const becameActive = row.is_active && !existing.is_active;
	const emailChanged = row.email !== existing.email;

	if (turningOn) {
		if (!authUserId) {
			if (!password) {
				throw new ValidationError(
					"Password is required when enabling web login",
				);
			}
			authUserId = await createAuthUser(ctx, row.email, password);
			createdAuthUserHere = true;
		} else {
			await setAuthUserBanned(ctx, authUserId, false);
			if (password) {
				const { error } = await ctx.dbAdmin.auth.admin.updateUserById(
					authUserId,
					{ password },
				);
				if (error) throw new ValidationError(error.message);
			}
		}
	} else if (turningOff && authUserId) {
		await setAuthUserBanned(ctx, authUserId, true);
	} else if (
		row.web_login_enabled &&
		authUserId &&
		password &&
		password.length > 0
	) {
		const { error } = await ctx.dbAdmin.auth.admin.updateUserById(authUserId, {
			password,
		});
		if (error) throw new ValidationError(error.message);
	}

	if (emailChanged && authUserId) {
		await updateAuthUserEmail(ctx, authUserId, row.email);
	}

	if (authUserId && row.web_login_enabled) {
		if (becameInactive) await setAuthUserBanned(ctx, authUserId, true);
		if (becameActive) await setAuthUserBanned(ctx, authUserId, false);
	}

	const { data, error } = await ctx.db
		.from("employees")
		.update({ ...row, auth_user_id: authUserId })
		.eq("id", id)
		.select("*")
		.single();

	if (error) {
		if (createdAuthUserHere && authUserId) {
			await deleteAuthUser(ctx, authUserId);
		}
		if (error.code === "23505")
			throw new ConflictError("An employee with that email already exists");
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`Employee ${id} not found`);
	return data;
}

export async function deleteEmployee(ctx: Context, id: string): Promise<void> {
	const { data: existing, error: fetchError } = await ctx.db
		.from("employees")
		.select("id, auth_user_id")
		.eq("id", id)
		.single();
	if (fetchError || !existing)
		throw new NotFoundError(`Employee ${id} not found`);
	const { error } = await ctx.db.from("employees").delete().eq("id", id);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This employee is referenced by existing records (appointments, sales, etc.). Deactivate instead.",
			);
		throw new ValidationError(error.message);
	}
	if (existing.auth_user_id) {
		await deleteAuthUser(ctx, existing.auth_user_id);
	}
}
