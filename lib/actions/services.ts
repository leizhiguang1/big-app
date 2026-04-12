"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as servicesService from "@/lib/services/services";

export async function createServiceAction(input: unknown) {
	const ctx = await getServerContext();
	const service = await servicesService.createService(ctx, input);
	revalidatePath("/services");
	return service;
}

export async function updateServiceAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const service = await servicesService.updateService(ctx, id, input);
	revalidatePath("/services");
	return service;
}

export async function deleteServiceAction(id: string) {
	const ctx = await getServerContext();
	await servicesService.deleteService(ctx, id);
	revalidatePath("/services");
}

export async function createCategoryAction(input: unknown) {
	const ctx = await getServerContext();
	const category = await servicesService.createCategory(ctx, input);
	revalidatePath("/services");
	return category;
}
