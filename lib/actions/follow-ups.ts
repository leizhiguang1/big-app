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
	revalidatePath(`/appointments/${appointmentId}`);
	return followUp;
}

export async function updateFollowUpAction(
	appointmentId: string,
	id: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const followUp = await followUpsService.updateFollowUp(ctx, id, input);
	revalidatePath(`/appointments/${appointmentId}`);
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
	revalidatePath(`/appointments/${appointmentId}`);
	return followUp;
}

export async function deleteFollowUpAction(appointmentId: string, id: string) {
	const ctx = await getServerContext();
	await followUpsService.deleteFollowUp(ctx, id);
	revalidatePath(`/appointments/${appointmentId}`);
}
