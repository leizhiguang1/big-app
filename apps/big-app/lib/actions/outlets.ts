"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as outletsService from "@/lib/services/outlets";

export async function listRoomsAction(outletId: string) {
	const ctx = await getServerContext();
	return outletsService.listRooms(ctx, outletId);
}

export async function createOutletAction(input: unknown) {
	const ctx = await getServerContext();
	const outlet = await outletsService.createOutlet(ctx, input);
	revalidatePath("/o/[outlet]/config/outlets", "page");
	return outlet;
}

export async function updateOutletAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const outlet = await outletsService.updateOutlet(ctx, id, input);
	revalidatePath("/o/[outlet]/config/outlets", "page");
	revalidatePath(`/o/[outlet]/config/outlets/${id}`, "page");
	return outlet;
}

export async function deleteOutletAction(id: string) {
	const ctx = await getServerContext();
	await outletsService.deleteOutlet(ctx, id);
	revalidatePath("/o/[outlet]/config/outlets", "page");
}

export async function createRoomAction(outletId: string, input: unknown) {
	const ctx = await getServerContext();
	const room = await outletsService.createRoom(ctx, outletId, input);
	revalidatePath("/o/[outlet]/config/outlets", "page");
	revalidatePath(`/o/[outlet]/config/outlets/${outletId}`, "page");
	return room;
}

export async function updateRoomAction(
	outletId: string,
	roomId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const room = await outletsService.updateRoom(ctx, roomId, input);
	revalidatePath(`/o/[outlet]/config/outlets/${outletId}`, "page");
	return room;
}

export async function deleteRoomAction(outletId: string, roomId: string) {
	const ctx = await getServerContext();
	await outletsService.deleteRoom(ctx, roomId);
	revalidatePath(`/o/[outlet]/config/outlets/${outletId}`, "page");
}
