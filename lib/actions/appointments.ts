"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as appointmentsService from "@/lib/services/appointments";
import * as billingEntriesService from "@/lib/services/billing-entries";

export async function createAppointmentAction(input: unknown) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.createAppointment(ctx, input);
	revalidatePath("/appointments");
	return appointment;
}

export async function updateAppointmentAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.updateAppointment(
		ctx,
		id,
		input,
	);
	revalidatePath("/appointments");
	revalidatePath(`/appointments/${id}`);
	return appointment;
}

export async function rescheduleAppointmentAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.rescheduleAppointment(
		ctx,
		id,
		input,
	);
	revalidatePath("/appointments");
	return appointment;
}

export async function setAppointmentStatusAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.setAppointmentStatus(
		ctx,
		id,
		input,
	);
	revalidatePath("/appointments");
	revalidatePath(`/appointments/${id}`);
	return appointment;
}

export async function setAppointmentTagsAction(id: string, input: unknown) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.setAppointmentTags(
		ctx,
		id,
		input,
	);
	revalidatePath("/appointments");
	revalidatePath(`/appointments/${id}`);
	return appointment;
}

export async function collectAppointmentPaymentAction(
	id: string,
	paidVia: string,
) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.setAppointmentPayment(ctx, id, {
		payment_status: "paid",
		paid_via: paidVia,
	});
	revalidatePath("/appointments");
	revalidatePath(`/appointments/${id}`);
	return appointment;
}

export async function undoAppointmentPaymentAction(id: string) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.setAppointmentPayment(ctx, id, {
		payment_status: "unpaid",
		paid_via: null,
	});
	revalidatePath("/appointments");
	revalidatePath(`/appointments/${id}`);
	return appointment;
}

export async function setAppointmentPaymentRemarkAction(
	id: string,
	remark: string | null,
) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.setAppointmentPaymentRemark(
		ctx,
		id,
		{ payment_remark: remark },
	);
	revalidatePath(`/appointments/${id}`);
	return appointment;
}

export async function setAppointmentFollowUpAction(
	id: string,
	followUp: string | null,
) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.setAppointmentFollowUp(
		ctx,
		id,
		{ follow_up: followUp },
	);
	revalidatePath(`/appointments/${id}`);
	return appointment;
}

export async function deleteAppointmentAction(id: string) {
	const ctx = await getServerContext();
	await appointmentsService.deleteAppointment(ctx, id);
	revalidatePath("/appointments");
	revalidatePath(`/appointments/${id}`);
}

export async function convertLeadToCustomerAction(
	leadAppointmentId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const result = await appointmentsService.convertLeadToCustomer(
		ctx,
		leadAppointmentId,
		input,
	);
	revalidatePath("/appointments");
	revalidatePath("/customers");
	return result;
}

export async function listBillingEntriesAction(appointmentId: string) {
	const ctx = await getServerContext();
	return billingEntriesService.listBillingEntriesForAppointment(
		ctx,
		appointmentId,
	);
}

export async function createBillingEntryAction(
	appointmentId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const entry = await billingEntriesService.createBillingEntry(ctx, input);
	revalidatePath(`/appointments/${appointmentId}`);
	return entry;
}

export async function createBillingEntriesBulkAction(
	appointmentId: string,
	inputs: unknown[],
) {
	const ctx = await getServerContext();
	const entries = await billingEntriesService.createBillingEntriesBulk(
		ctx,
		inputs,
	);
	revalidatePath(`/appointments/${appointmentId}`);
	return entries;
}

export async function updateBillingEntryAction(
	appointmentId: string,
	id: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const entry = await billingEntriesService.updateBillingEntry(ctx, id, input);
	revalidatePath(`/appointments/${appointmentId}`);
	return entry;
}

export async function deleteBillingEntryAction(
	appointmentId: string,
	id: string,
) {
	const ctx = await getServerContext();
	await billingEntriesService.deleteBillingEntry(ctx, id);
	revalidatePath(`/appointments/${appointmentId}`);
}
