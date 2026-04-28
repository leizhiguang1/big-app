import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
	type PasscodeFunction,
	passcodeInputSchema,
} from "@/lib/schemas/passcodes";
import { assertBrandId } from "@/lib/supabase/query";
import type { Tables } from "@/lib/supabase/types";

export type Passcode = Tables<"passcodes">;

export type PasscodeEmployeeRef = {
	id: string;
	first_name: string;
	last_name: string;
};

export type PasscodeListItem = Passcode & {
	outlet: { id: string; name: string } | null;
	created_by: PasscodeEmployeeRef | null;
	used_by: PasscodeEmployeeRef | null;
};

const LIST_SELECT = `
  *,
  outlet:outlets!passcodes_outlet_id_fkey ( id, name ),
  created_by:employees!passcodes_created_by_employee_id_fkey ( id, first_name, last_name ),
  used_by:employees!passcodes_used_by_employee_id_fkey ( id, first_name, last_name )
`;

function generatePasscodeValue(): string {
	return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function listPasscodes(ctx: Context): Promise<PasscodeListItem[]> {
	const { data, error } = await ctx.db
		.from("passcodes")
		.select(LIST_SELECT)
		.order("created_at", { ascending: false });
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as PasscodeListItem[];
}

export async function getPasscode(
	ctx: Context,
	id: string,
): Promise<PasscodeListItem> {
	const { data, error } = await ctx.db
		.from("passcodes")
		.select(LIST_SELECT)
		.eq("id", id)
		.single();
	if (error || !data) throw new NotFoundError(`Passcode ${id} not found`);
	return data as unknown as PasscodeListItem;
}

export async function createPasscode(
	ctx: Context,
	input: unknown,
): Promise<Passcode> {
	const parsed = passcodeInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("passcodes")
		.insert({
			brand_id: assertBrandId(ctx),
			passcode: generatePasscodeValue(),
			outlet_id: parsed.outlet_id,
			function: parsed.function,
			created_by_employee_id: ctx.currentUser?.employeeId ?? null,
		})
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	return data;
}

export type RedeemPasscodeInput = {
	passcode: string;
	function: PasscodeFunction;
	outletId: string;
	appliedOn: string;
};

export async function redeemPasscode(
	ctx: Context,
	input: RedeemPasscodeInput,
): Promise<Passcode> {
	const { data, error } = await ctx.db.rpc("redeem_passcode", {
		p_passcode: input.passcode,
		p_function: input.function,
		p_outlet_id: input.outletId,
		p_applied_on: input.appliedOn,
		p_used_by: (ctx.currentUser?.employeeId ?? null) as string,
	});
	if (error) {
		if (error.message?.includes("Invalid or expired passcode")) {
			throw new ValidationError("Invalid or expired passcode");
		}
		throw new ValidationError(error.message);
	}
	if (!data) throw new ValidationError("Invalid or expired passcode");
	return data as Passcode;
}

export async function deletePasscode(ctx: Context, id: string): Promise<void> {
	const { data: existing, error: fetchError } = await ctx.db
		.from("passcodes")
		.select("id, used_at")
		.eq("id", id)
		.single();
	if (fetchError || !existing)
		throw new NotFoundError(`Passcode ${id} not found`);
	if (existing.used_at)
		throw new ConflictError(
			"Cannot delete a passcode that has already been used.",
		);

	const { error } = await ctx.db.from("passcodes").delete().eq("id", id);
	if (error) throw new ValidationError(error.message);
}
