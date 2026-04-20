"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as wa from "@/lib/services/whatsapp";

export async function connectOutletAction(outletId: string) {
	const ctx = await getServerContext();
	const result = await wa.connectOutlet(ctx, outletId);
	revalidatePath("/whatsapp");
	return result;
}

export async function disconnectOutletAction(outletId: string) {
	const ctx = await getServerContext();
	await wa.disconnectOutlet(ctx, outletId);
	revalidatePath("/whatsapp");
}

export async function getOutletQrAction(outletId: string) {
	const ctx = await getServerContext();
	return wa.getOutletQr(ctx, outletId);
}

export async function getOutletStatusAction(outletId: string) {
	const ctx = await getServerContext();
	return wa.getOutletStatus(ctx, outletId);
}

export async function sendTestMessageAction(
	outletId: string,
	to: string,
	text: string,
) {
	const ctx = await getServerContext();
	return wa.sendTestMessage(ctx, outletId, to, text);
}
