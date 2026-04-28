"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as customersService from "@/lib/services/customers";

export async function createCustomerAction(input: unknown) {
	const ctx = await getServerContext();
	const customer = await customersService.createCustomer(ctx, input);
	revalidatePath("/customers");
	return customer;
}

export async function updateCustomerAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const customer = await customersService.updateCustomer(ctx, id, input);
	revalidatePath("/customers");
	return customer;
}

export async function deleteCustomerAction(id: string) {
	const ctx = await getServerContext();
	await customersService.deleteCustomer(ctx, id);
	revalidatePath("/customers");
}
