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
	revalidatePath("/appointments/[ref]", "page");
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
	revalidatePath("/appointments/[ref]", "page");
	return appointment;
}

export async function markAppointmentCompletedAction(id: string) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.markAppointmentCompleted(
		ctx,
		id,
	);
	revalidatePath("/appointments");
	revalidatePath("/appointments/[ref]", "page");
	return appointment;
}

export async function revertCompletedAppointmentAction(id: string) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.revertCompletedAppointment(
		ctx,
		id,
	);
	revalidatePath("/appointments");
	revalidatePath("/appointments/[ref]", "page");
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
	revalidatePath("/appointments/[ref]", "page");
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
	revalidatePath("/appointments/[ref]", "page");
	return appointment;
}

export async function undoAppointmentPaymentAction(id: string) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.setAppointmentPayment(ctx, id, {
		payment_status: "unpaid",
		paid_via: null,
	});
	revalidatePath("/appointments");
	revalidatePath("/appointments/[ref]", "page");
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
	revalidatePath("/appointments/[ref]", "page");
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
	revalidatePath("/appointments/[ref]", "page");
	return appointment;
}

export async function cancelAppointmentAction(id: string, reason: string) {
	const ctx = await getServerContext();
	const appointment = await appointmentsService.cancelAppointment(ctx, id, {
		reason,
	});
	revalidatePath("/appointments");
	revalidatePath("/appointments/[ref]", "page");
	if (appointment.customer_id)
		revalidatePath(`/customers/${appointment.customer_id}`);
	return appointment;
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

// Saves the shared "Message to frontdesk" shown in BOTH the Billing tab
// (BillingSection) and the bottom-right of CollectPaymentDialog. Distinct
// from `appointments.notes` (the appointment-level notes edited in the
// create/edit dialog) and from per-line `appointment_line_items.notes`.
export async function saveFrontdeskMessageAction(
	id: string,
	message: string | null,
) {
	const ctx = await getServerContext();
	const { error } = await ctx.db
		.from("appointments")
		.update({ frontdesk_message: message })
		.eq("id", id);
	if (error) throw new Error(error.message);
	revalidatePath("/appointments/[ref]", "page");
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
	revalidatePath("/appointments/[ref]", "page");
	return entry;
}

export async function createLineItemsBulkAction(
	appointmentId: string,
	inputs: unknown[],
) {
	const ctx = await getServerContext();
	const entries = await lineItemsService.createLineItemsBulk(ctx, inputs);
	revalidatePath("/appointments/[ref]", "page");
	return entries;
}

export async function updateLineItemAction(
	appointmentId: string,
	id: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const entry = await lineItemsService.updateLineItem(ctx, id, input);
	revalidatePath("/appointments/[ref]", "page");
	return entry;
}

export async function deleteLineItemAction(appointmentId: string, id: string) {
	const ctx = await getServerContext();
	await lineItemsService.deleteLineItem(ctx, id);
	revalidatePath("/appointments/[ref]", "page");
}

export async function cancelBillingForAppointmentAction(
	currentAppointmentId: string,
	targetAppointmentId: string,
) {
	const ctx = await getServerContext();
	await lineItemsService.cancelLineItemsForAppointment(
		ctx,
		targetAppointmentId,
	);
	revalidatePath("/appointments/[ref]", "page");
}

export async function revertBillingForAppointmentAction(
	currentAppointmentId: string,
	targetAppointmentId: string,
) {
	const ctx = await getServerContext();
	await lineItemsService.revertLineItemsForAppointment(
		ctx,
		targetAppointmentId,
	);
	revalidatePath("/appointments/[ref]", "page");
}

export async function cancelBillingForCustomerAction(
	customerId: string,
	targetAppointmentId: string,
) {
	const ctx = await getServerContext();
	await lineItemsService.cancelLineItemsForAppointment(
		ctx,
		targetAppointmentId,
	);
	revalidatePath(`/customers/${customerId}`);
}

export async function revertBillingForCustomerAction(
	customerId: string,
	targetAppointmentId: string,
) {
	const ctx = await getServerContext();
	await lineItemsService.revertLineItemsForAppointment(
		ctx,
		targetAppointmentId,
	);
	revalidatePath(`/customers/${customerId}`);
}

export async function listPastLineItemsForCustomerAction(customerId: string) {
	const ctx = await getServerContext();
	return lineItemsService.listLineItemsForCustomer(ctx, customerId);
}

// ─── Incentives (hands-on attribution) ──────────────────────────────────────

export async function createLineItemIncentiveAction(
	appointmentId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const row = await lineItemsService.createIncentive(ctx, input);
	revalidatePath("/appointments/[ref]", "page");
	return row;
}

export async function deleteLineItemIncentiveAction(
	appointmentId: string,
	id: string,
) {
	const ctx = await getServerContext();
	await lineItemsService.deleteIncentive(ctx, id);
	revalidatePath("/appointments/[ref]", "page");
}

export async function saveAllocationsForAppointmentAction(
	appointmentId: string,
	allocations: {
		lineItemId: string;
		employees: { employee_id: string; percent: number }[];
	}[],
) {
	const ctx = await getServerContext();
	for (const a of allocations) {
		await lineItemsService.replaceIncentivesForLineItem(
			ctx,
			a.lineItemId,
			a.employees,
		);
	}
	revalidatePath("/appointments/[ref]", "page");
}
