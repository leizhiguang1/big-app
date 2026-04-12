"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as employeesService from "@/lib/services/employees";

export async function createEmployeeAction(input: unknown, password?: string) {
	const ctx = await getServerContext();
	const employee = await employeesService.createEmployee(ctx, input, password);
	revalidatePath("/employees");
	return employee;
}

export async function updateEmployeeAction(
	id: string,
	input: unknown,
	password?: string,
) {
	const ctx = await getServerContext();
	const employee = await employeesService.updateEmployee(
		ctx,
		id,
		input,
		password,
	);
	revalidatePath("/employees");
	return employee;
}

export async function deleteEmployeeAction(id: string) {
	const ctx = await getServerContext();
	await employeesService.deleteEmployee(ctx, id);
	revalidatePath("/employees");
}
