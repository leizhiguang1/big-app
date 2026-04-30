"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as servicesService from "@/lib/services/services";

export async function createServiceAction(input: unknown) {
	const ctx = await getServerContext();
	const service = await servicesService.createService(ctx, input);
	revalidatePath("/o/[outlet]/services", "page");
	return service;
}

export async function updateServiceAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const service = await servicesService.updateService(ctx, id, input);
	revalidatePath("/o/[outlet]/services", "page");
	return service;
}

export async function deleteServiceAction(id: string) {
	const ctx = await getServerContext();
	await servicesService.deleteService(ctx, id);
	revalidatePath("/o/[outlet]/services", "page");
}

export async function createCategoryAction(input: unknown) {
	const ctx = await getServerContext();
	const category = await servicesService.createCategory(ctx, input);
	revalidatePath("/o/[outlet]/services", "page");
	return category;
}

export async function updateCategoryAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const category = await servicesService.updateCategory(ctx, id, input);
	revalidatePath("/o/[outlet]/services", "page");
	return category;
}

export async function deleteCategoryAction(id: string) {
	const ctx = await getServerContext();
	await servicesService.deleteCategory(ctx, id);
	revalidatePath("/o/[outlet]/services", "page");
}
