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

// Customer-scoped variants — same service calls, revalidate customer path

export async function createCustomerFollowUpAction(
	customerId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const followUp = await followUpsService.createFollowUp(ctx, input);
	revalidatePath(`/customers/${customerId}`);
	return followUp;
}

export async function updateCustomerFollowUpAction(
	customerId: string,
	id: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const followUp = await followUpsService.updateFollowUp(ctx, id, input);
	revalidatePath(`/customers/${customerId}`);
	return followUp;
}

export async function setCustomerFollowUpReminderDoneAction(
	customerId: string,
	id: string,
	reminderDone: boolean,
) {
	const ctx = await getServerContext();
	const followUp = await followUpsService.setFollowUpReminderDone(ctx, id, {
		reminder_done: reminderDone,
	});
	revalidatePath(`/customers/${customerId}`);
	return followUp;
}

export async function setCustomerFollowUpPinAction(
	customerId: string,
	id: string,
	pinned: boolean,
) {
	const ctx = await getServerContext();
	await followUpsService.setFollowUpPin(ctx, id, pinned);
	revalidatePath(`/customers/${customerId}`);
}

export async function deleteCustomerFollowUpAction(
	customerId: string,
	id: string,
) {
	const ctx = await getServerContext();
	await followUpsService.deleteFollowUp(ctx, id);
	revalidatePath(`/customers/${customerId}`);
}

export async function setDashboardFollowUpReminderDoneAction(
	id: string,
	reminderDone: boolean,
) {
	const ctx = await getServerContext();
	const followUp = await followUpsService.setFollowUpReminderDone(ctx, id, {
		reminder_done: reminderDone,
	});
	revalidatePath("/dashboard");
	return followUp;
}
