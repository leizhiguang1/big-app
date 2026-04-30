"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getServerContext } from "@/lib/context/server";
import * as employeesService from "@/lib/services/employees";

export async function createEmployeeAction(
	input: unknown,
	password?: string,
	pin?: string,
) {
	const ctx = await getServerContext();
	const employee = await employeesService.createEmployee(
		ctx,
		input,
		password,
		pin,
	);
	revalidatePath("/o/[outlet]/employees", "page");
	return employee;
}

export async function updateEmployeeAction(
	id: string,
	input: unknown,
	password?: string,
	pin?: string,
) {
	const ctx = await getServerContext();
	const employee = await employeesService.updateEmployee(
		ctx,
		id,
		input,
		password,
		pin,
	);
	revalidatePath("/o/[outlet]/employees", "page");
	return employee;
}

export async function deleteEmployeeAction(id: string) {
	const ctx = await getServerContext();
	await employeesService.deleteEmployee(ctx, id);
	revalidatePath("/o/[outlet]/employees", "page");
}

/** Returns a password-reset link the admin can copy and share. */
export async function resetPasswordAction(
	employeeId: string,
): Promise<string> {
	const ctx = await getServerContext();
	const headersList = await headers();
	const origin = headersList.get("origin") ?? "";
	return employeesService.generatePasswordResetLink(ctx, employeeId, origin);
}

export type ChangeEmailResult = { error: string } | { ok: true };

export async function changeOwnEmailAction(
	newEmail: string,
): Promise<ChangeEmailResult> {
	try {
		const ctx = await getServerContext();
		await employeesService.changeOwnEmail(ctx, newEmail);
		revalidatePath("/", "layout");
		return { ok: true };
	} catch (err) {
		return { error: err instanceof Error ? err.message : "Something went wrong" };
	}
}

export type ChangePasswordResult = { error: string } | { ok: true };

export async function changeOwnPasswordAction(
	newPassword: string,
): Promise<ChangePasswordResult> {
	try {
		const ctx = await getServerContext();
		await employeesService.changeOwnPassword(ctx, newPassword);
		return { ok: true };
	} catch (err) {
		return { error: err instanceof Error ? err.message : "Something went wrong" };
	}
}

export async function verifyPinAction(
	employeeId: string,
	pin: string,
): Promise<boolean> {
	try {
		const ctx = await getServerContext();
		return await employeesService.verifyPin(ctx, employeeId, pin);
	} catch {
		return false;
	}
}

export type ChangePinResult = { error: string } | { ok: true };

export async function changeOwnPinAction(
	newPin: string,
): Promise<ChangePinResult> {
	try {
		const ctx = await getServerContext();
		await employeesService.changeOwnPin(ctx, newPin);
		return { ok: true };
	} catch (err) {
		return { error: err instanceof Error ? err.message : "Something went wrong" };
	}
}
