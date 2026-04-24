"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as followUpsService from "@/lib/services/follow-ups";

export async function createFollowUpAction(
	appointmentId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const followUp = await followUpsService.createFollowUp(ctx, input);
	revalidatePath("/appointments/[ref]", "page");
	return followUp;
}

export async function updateFollowUpAction(
	appointmentId: string,
	id: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const followUp = await followUpsService.updateFollowUp(ctx, id, input);
	revalidatePath("/appointments/[ref]", "page");
	return followUp;
}

export async function setFollowUpReminderDoneAction(
	appointmentId: string,
	id: string,
	reminderDone: boolean,
) {
	const ctx = await getServerContext();
	const followUp = await followUpsService.setFollowUpReminderDone(ctx, id, {
		reminder_done: reminderDone,
	});
	revalidatePath("/appointments/[ref]", "page");
	return followUp;
}

export async function setFollowUpPinAction(
	appointmentId: string,
	id: string,
	pinned: boolean,
) {
	const ctx = await getServerContext();
	await followUpsService.setFollowUpPin(ctx, id, pinned);
	revalidatePath("/appointments/[ref]", "page");
}

export async function deleteFollowUpAction(appointmentId: string, id: string) {
	const ctx = await getServerContext();
	await followUpsService.deleteFollowUp(ctx, id);
	revalidatePath("/appointments/[ref]", "page");
}
