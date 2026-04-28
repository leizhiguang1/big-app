import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { shiftOverlapsRange, shiftsConflict } from "@/lib/roster/week";
import {
	employeeShiftInputSchema,
	type ShiftBreak,
} from "@/lib/schemas/employee-shifts";
import {
	assertEmployeeInBrand,
	assertOutletInBrand,
} from "@/lib/supabase/brand-ownership";
import { assertBrandId } from "@/lib/supabase/query";
import type { Tables } from "@/lib/supabase/types";

export type EmployeeShift = Tables<"employee_shifts">;

export type RosterEmployee = {
	id: string;
	code: string;
	first_name: string;
	last_name: string;
	salutation: string | null;
	profile_image_path: string | null;
	position: { id: string; name: string } | null;
	role: { id: string; name: string } | null;
};

function normalize(input: unknown) {
	const p = employeeShiftInputSchema.parse(input);
	return {
		employee_id: p.employee_id,
		outlet_id: p.outlet_id,
		shift_date: p.shift_date,
		start_time: p.start_time,
		end_time: p.end_time,
		is_overnight: p.is_overnight,
		repeat_type: p.repeat_type,
		repeat_end: p.repeat_type === "weekly" ? (p.repeat_end ?? null) : null,
		breaks: p.breaks satisfies ShiftBreak[],
		remarks: p.remarks ?? null,
	};
}

async function assertNoConflict(
	ctx: Context,
	row: ReturnType<typeof normalize>,
	excludeId: string | null,
) {
	const { data, error } = await ctx.db
		.from("employee_shifts")
		.select("id, shift_date, repeat_type, repeat_end")
		.eq("employee_id", row.employee_id)
		.eq("outlet_id", row.outlet_id);
	if (error) throw new ValidationError(error.message);

	for (const other of data ?? []) {
		if (other.id === excludeId) continue;
		if (shiftsConflict(row, other)) {
			throw new ConflictError(
				"This employee already has a shift at this outlet that overlaps with the new one.",
			);
		}
	}
}

export async function listBookableEmployeesForOutlet(
	ctx: Context,
	outletId: string,
): Promise<RosterEmployee[]> {
	await assertOutletInBrand(ctx, outletId);
	const { data, error } = await ctx.db
		.from("employee_outlets")
		.select(
			"employee:employees!inner(id, code, first_name, last_name, salutation, profile_image_path, is_bookable, is_active, brand_id, position:positions(id, name), role:roles(id, name))",
		)
		.eq("outlet_id", outletId)
		.eq("employee.brand_id", assertBrandId(ctx))
		.eq("employee.is_bookable", true)
		.eq("employee.is_active", true);
	if (error) throw new ValidationError(error.message);

	const rows = (data ?? []) as unknown as {
		employee: RosterEmployee | null;
	}[];
	const employees = rows
		.map((r) => r.employee)
		.filter((e): e is RosterEmployee => e !== null);
	employees.sort((a, b) => a.code.localeCompare(b.code));
	return employees;
}

export async function listEmployeesForOutlet(
	ctx: Context,
	outletId: string,
): Promise<RosterEmployee[]> {
	await assertOutletInBrand(ctx, outletId);
	const { data, error } = await ctx.db
		.from("employee_outlets")
		.select(
			"employee:employees!inner(id, code, first_name, last_name, salutation, profile_image_path, is_bookable, is_active, brand_id, position:positions(id, name), role:roles(id, name))",
		)
		.eq("outlet_id", outletId)
		.eq("employee.brand_id", assertBrandId(ctx))
		.eq("employee.is_active", true);
	if (error) throw new ValidationError(error.message);

	const rows = (data ?? []) as unknown as {
		employee: RosterEmployee | null;
	}[];
	const employees = rows
		.map((r) => r.employee)
		.filter((e): e is RosterEmployee => e !== null);
	employees.sort((a, b) => a.code.localeCompare(b.code));
	return employees;
}

export async function listShiftsForWeek(
	ctx: Context,
	args: { outletId: string; weekStart: string; weekEnd: string },
): Promise<EmployeeShift[]> {
	await assertOutletInBrand(ctx, args.outletId);
	const { data, error } = await ctx.db
		.from("employee_shifts")
		.select("*")
		.eq("outlet_id", args.outletId);
	if (error) throw new ValidationError(error.message);
	return (data ?? []).filter((s) =>
		shiftOverlapsRange(s, args.weekStart, args.weekEnd),
	);
}

export async function listShiftsForRange(
	ctx: Context,
	args: { outletId: string; from: string; to: string },
): Promise<EmployeeShift[]> {
	return listShiftsForWeek(ctx, {
		outletId: args.outletId,
		weekStart: args.from,
		weekEnd: args.to,
	});
}

export async function createShift(
	ctx: Context,
	input: unknown,
): Promise<EmployeeShift> {
	const row = normalize(input);
	await assertEmployeeInBrand(ctx, row.employee_id);
	await assertOutletInBrand(ctx, row.outlet_id);
	await assertNoConflict(ctx, row, null);
	const { data, error } = await ctx.db
		.from("employee_shifts")
		.insert(row)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	return data;
}

export async function updateShift(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<EmployeeShift> {
	await assertShiftInBrand(ctx, id);
	const row = normalize(input);
	await assertEmployeeInBrand(ctx, row.employee_id);
	await assertOutletInBrand(ctx, row.outlet_id);
	await assertNoConflict(ctx, row, id);
	const { data, error } = await ctx.db
		.from("employee_shifts")
		.update(row)
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Shift ${id} not found`);
	return data;
}

export async function deleteShift(ctx: Context, id: string): Promise<void> {
	await assertShiftInBrand(ctx, id);
	const { error } = await ctx.db.from("employee_shifts").delete().eq("id", id);
	if (error) throw new ValidationError(error.message);
}

// employee_shifts inherit brand via employees.brand_id.
async function assertShiftInBrand(
	ctx: Context,
	shiftId: string,
): Promise<void> {
	const brandId = assertBrandId(ctx);
	const { data, error } = await ctx.db
		.from("employee_shifts")
		.select("id, employees!inner(brand_id)")
		.eq("id", shiftId)
		.eq("employees.brand_id", brandId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new NotFoundError(`Shift ${shiftId} not found`);
}
