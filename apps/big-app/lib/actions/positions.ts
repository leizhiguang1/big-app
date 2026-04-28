"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as positionsService from "@/lib/services/positions";

export async function createPositionAction(input: unknown) {
	const ctx = await getServerContext();
	const position = await positionsService.createPosition(ctx, input);
	revalidatePath("/employees/positions");
	return position;
}

export async function updatePositionAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const position = await positionsService.updatePosition(ctx, id, input);
	revalidatePath("/employees/positions");
	return position;
}

export async function deletePositionAction(id: string) {
	const ctx = await getServerContext();
	await positionsService.deletePosition(ctx, id);
	revalidatePath("/employees/positions");
}
