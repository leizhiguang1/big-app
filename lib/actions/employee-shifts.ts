"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as service from "@/lib/services/employee-shifts";

export async function createShiftAction(input: unknown) {
	const ctx = await getServerContext();
	const shift = await service.createShift(ctx, input);
	revalidatePath("/roster");
	return shift;
}

export async function updateShiftAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const shift = await service.updateShift(ctx, id, input);
	revalidatePath("/roster");
	return shift;
}

export async function deleteShiftAction(id: string) {
	const ctx = await getServerContext();
	await service.deleteShift(ctx, id);
	revalidatePath("/roster");
}
