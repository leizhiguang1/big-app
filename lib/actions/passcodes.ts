"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as passcodesService from "@/lib/services/passcodes";

export async function createPasscodeAction(input: unknown) {
	const ctx = await getServerContext();
	const passcode = await passcodesService.createPasscode(ctx, input);
	revalidatePath("/passcode");
	return passcode;
}

export async function updatePasscodeAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const passcode = await passcodesService.updatePasscode(ctx, id, input);
	revalidatePath("/passcode");
	return passcode;
}

export async function deletePasscodeAction(id: string) {
	const ctx = await getServerContext();
	await passcodesService.deletePasscode(ctx, id);
	revalidatePath("/passcode");
}
