import type { Context } from "@/lib/context/types";
import {
	ConflictError,
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "@/lib/errors";
import { employeeInputSchema, pinField } from "@/lib/schemas/employees";
import type { Tables } from "@/lib/supabase/types";

export type Employee = Tables<"employees">;

export type EmployeeOutletLink = {
	outlet_id: string;
	is_primary: boolean;
};

export type EmployeeWithRelations = Employee & {
	role: { id: string; name: string } | null;
	position: { id: string; name: string } | null;
	outlets: EmployeeOutletLink[];
};

function describeUniqueViolation(error: { message?: string; details?: string }): string {
	const detail = error.details ?? error.message ?? "";
	if (detail.includes("id_number")) return "An employee with that ID number already exists";
	if (detail.includes("auth_user_id")) return "This login account is already linked to another employee";
	if (detail.includes("code")) return "Employee code conflict — please retry";
	return "A duplicate value conflicts with an existing employee record";
}

const SELECT_WITH_RELATIONS =
	"*, role:roles(id, name), position:positions(id, name), outlets:employee_outlets(outlet_id, is_primary)";

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
	const outletIds = Array.from(new Set(p.outlet_ids ?? []));
	const primaryOutletId =
		p.primary_outlet_id && outletIds.includes(p.primary_outlet_id)
			? p.primary_outlet_id
			: (outletIds[0] ?? null);
	return {
		row: {
			id: p.id,
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
		},
		outletIds,
		primaryOutletId,
	};
}

async function replaceEmployeeOutlets(
	ctx: Context,
	employeeId: string,
	outletIds: string[],
	primaryOutletId: string | null,
): Promise<void> {
	const { error: delError } = await ctx.db
		.from("employee_outlets")
		.delete()
		.eq("employee_id", employeeId);
	if (delError) throw new ValidationError(delError.message);

	if (outletIds.length === 0) return;

	const rows = outletIds.map((outlet_id) => ({
		employee_id: employeeId,
		outlet_id,
		is_primary: outlet_id === primaryOutletId,
	}));
	const { error: insError } = await ctx.db
		.from("employee_outlets")
		.insert(rows);
	if (insError) throw new ValidationError(insError.message);
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

async function setEmployeePin(
	ctx: Context,
	employeeId: string,
	pinInput: unknown,
): Promise<void> {
	const parsed = pinField.parse(pinInput);
	const { error } = await ctx.db.rpc("set_employee_pin", {
		p_employee_id: employeeId,
		p_pin: parsed ?? "",
	});
	if (error) throw new ValidationError(error.message);
}

export async function createEmployee(
	ctx: Context,
	input: unknown,
	password?: string,
	pin?: string,
): Promise<Employee> {
	const { row, outletIds, primaryOutletId } = normalize(input);

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

	const insert = { ...row, auth_user_id: authUserId };
	if (insert.id === undefined) {
		delete (insert as { id?: string }).id;
	}

	const { data, error } = await ctx.db
		.from("employees")
		.insert(insert)
		.select("*")
		.single();

	if (error) {
		if (authUserId) await deleteAuthUser(ctx, authUserId);
		if (error.code === "23505") throw new ConflictError(describeUniqueViolation(error));
		throw new ValidationError(error.message);
	}

	try {
		await replaceEmployeeOutlets(ctx, data.id, outletIds, primaryOutletId);
		if (pin !== undefined) {
			await setEmployeePin(ctx, data.id, pin);
		}
	} catch (err) {
		await ctx.db.from("employees").delete().eq("id", data.id);
		if (authUserId) await deleteAuthUser(ctx, authUserId);
		throw err;
	}

	return data;
}

export async function updateEmployee(
	ctx: Context,
	id: string,
	input: unknown,
	password?: string,
	pin?: string,
): Promise<Employee> {
	const { row, outletIds, primaryOutletId } = normalize(input);

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

	const update = { ...row, auth_user_id: authUserId };
	delete (update as { id?: string }).id;

	const { data, error } = await ctx.db
		.from("employees")
		.update(update)
		.eq("id", id)
		.select("*")
		.single();

	if (error) {
		if (createdAuthUserHere && authUserId) {
			await deleteAuthUser(ctx, authUserId);
		}
		if (error.code === "23505") throw new ConflictError(describeUniqueViolation(error));
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`Employee ${id} not found`);

	await replaceEmployeeOutlets(ctx, id, outletIds, primaryOutletId);

	if (pin !== undefined) {
		await setEmployeePin(ctx, id, pin);
	}

	return data;
}

/**
 * Admin-initiated password reset: generates a recovery link the admin can
 * copy and share (WhatsApp, in person, etc.). Does NOT send an email — no
 * SMTP dependency.
 */
export async function generatePasswordResetLink(
	ctx: Context,
	employeeId: string,
	siteUrl: string,
): Promise<string> {
	const { data: emp, error } = await ctx.db
		.from("employees")
		.select("email, auth_user_id")
		.eq("id", employeeId)
		.single();
	if (error || !emp) throw new NotFoundError(`Employee ${employeeId} not found`);
	if (!emp.auth_user_id || !emp.email)
		throw new ValidationError(
			"This employee does not have web login enabled",
		);

	const { data, error: linkError } =
		await ctx.dbAdmin.auth.admin.generateLink({
			type: "recovery",
			email: emp.email,
			options: {
				redirectTo: `${siteUrl}/auth/callback?type=recovery`,
			},
		});

	if (linkError || !data.properties?.action_link) {
		throw new ValidationError(
			linkError?.message ?? "Failed to generate reset link",
		);
	}

	return data.properties.action_link;
}

/**
 * Self-serve password change. User is already authenticated via session.
 */
export async function changeOwnPassword(
	ctx: Context,
	newPassword: string,
): Promise<void> {
	if (!ctx.currentUser) throw new UnauthorizedError("Not logged in");
	const { error } = await ctx.db.auth.updateUser({ password: newPassword });
	if (error) throw new ValidationError(error.message);
}

/**
 * Self-serve email change. User is already authenticated via session.
 * Updates both auth email (immediate via admin API) and profile email.
 */
export async function changeOwnEmail(
	ctx: Context,
	newEmail: string,
): Promise<void> {
	if (!ctx.currentUser) throw new UnauthorizedError("Not logged in");
	if (!ctx.currentUser.employeeId)
		throw new UnauthorizedError("No employee profile linked");

	await updateAuthUserEmail(ctx, ctx.currentUser.id, newEmail);

	const { error } = await ctx.db
		.from("employees")
		.update({ email: newEmail })
		.eq("id", ctx.currentUser.employeeId);
	if (error) throw new ValidationError(error.message);
}

/**
 * Self-serve PIN change. User is already authenticated via session.
 */
export async function changeOwnPin(
	ctx: Context,
	newPin: string,
): Promise<void> {
	if (!ctx.currentUser?.employeeId)
		throw new UnauthorizedError("Not logged in");

	const parsed = pinField.parse(newPin);
	if (!parsed) throw new ValidationError("PIN must be exactly 6 digits");

	await setEmployeePin(ctx, ctx.currentUser.employeeId, parsed);
}

export async function verifyPin(
	ctx: Context,
	employeeId: string,
	pin: string,
): Promise<boolean> {
	const { data, error } = await ctx.db.rpc("verify_employee_pin", {
		p_employee_id: employeeId,
		p_pin: pin,
	});
	if (error) return false;
	return data === true;
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
