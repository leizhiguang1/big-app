"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as lineItemsService from "@/lib/services/appointment-line-items";
import * as appointmentsService from "@/lib/services/appointments";

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

// ─── Appointment line items ─────────────────────────────────────────────────

export async function listLineItemsAction(appointmentId: string) {
	const ctx = await getServerContext();
	return lineItemsService.listLineItemsForAppointment(ctx, appointmentId);
}

export async function createLineItemAction(
	appointmentId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const entry = await lineItemsService.createLineItem(ctx, input);
	revalidatePath(`/appointments/${appointmentId}`);
	return entry;
}

export async function createLineItemsBulkAction(
	appointmentId: string,
	inputs: unknown[],
) {
	const ctx = await getServerContext();
	const entries = await lineItemsService.createLineItemsBulk(ctx, inputs);
	revalidatePath(`/appointments/${appointmentId}`);
	return entries;
}

export async function updateLineItemAction(
	appointmentId: string,
	id: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const entry = await lineItemsService.updateLineItem(ctx, id, input);
	revalidatePath(`/appointments/${appointmentId}`);
	return entry;
}

export async function deleteLineItemAction(appointmentId: string, id: string) {
	const ctx = await getServerContext();
	await lineItemsService.deleteLineItem(ctx, id);
	revalidatePath(`/appointments/${appointmentId}`);
}

// ─── Incentives (hands-on attribution) ──────────────────────────────────────

export async function createLineItemIncentiveAction(
	appointmentId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const row = await lineItemsService.createIncentive(ctx, input);
	revalidatePath(`/appointments/${appointmentId}`);
	return row;
}

export async function deleteLineItemIncentiveAction(
	appointmentId: string,
	id: string,
) {
	const ctx = await getServerContext();
	await lineItemsService.deleteIncentive(ctx, id);
	revalidatePath(`/appointments/${appointmentId}`);
}
