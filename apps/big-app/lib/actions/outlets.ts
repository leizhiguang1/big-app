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
	revalidatePath("/config/outlets");
	return outlet;
}

export async function updateOutletAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const outlet = await outletsService.updateOutlet(ctx, id, input);
	revalidatePath("/config/outlets");
	revalidatePath(`/config/outlets/${id}`);
	return outlet;
}

export async function deleteOutletAction(id: string) {
	const ctx = await getServerContext();
	await outletsService.deleteOutlet(ctx, id);
	revalidatePath("/config/outlets");
}

export async function createRoomAction(outletId: string, input: unknown) {
	const ctx = await getServerContext();
	const room = await outletsService.createRoom(ctx, outletId, input);
	revalidatePath("/config/outlets");
	revalidatePath(`/config/outlets/${outletId}`);
	return room;
}

export async function updateRoomAction(
	outletId: string,
	roomId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const room = await outletsService.updateRoom(ctx, roomId, input);
	revalidatePath(`/config/outlets/${outletId}`);
	return room;
}

export async function deleteRoomAction(outletId: string, roomId: string) {
	const ctx = await getServerContext();
	await outletsService.deleteRoom(ctx, roomId);
	revalidatePath(`/config/outlets/${outletId}`);
}
