"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as caseNotesService from "@/lib/services/case-notes";

export async function createCaseNoteAction(
	appointmentId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const note = await caseNotesService.createCaseNote(ctx, input);
	revalidatePath(`/appointments/${appointmentId}`);
	return note;
}

export async function updateCaseNoteAction(
	appointmentId: string,
	id: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const note = await caseNotesService.updateCaseNote(ctx, id, input);
	revalidatePath(`/appointments/${appointmentId}`);
	return note;
}

export async function deleteCaseNoteAction(appointmentId: string, id: string) {
	const ctx = await getServerContext();
	await caseNotesService.deleteCaseNote(ctx, id);
	revalidatePath(`/appointments/${appointmentId}`);
}

// Customer-scoped variants — same service calls, revalidate customer path

export async function createCustomerCaseNoteAction(
	customerId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const note = await caseNotesService.createCaseNote(ctx, input);
	revalidatePath(`/customers/${customerId}`);
	return note;
}

export async function updateCustomerCaseNoteAction(
	customerId: string,
	id: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const note = await caseNotesService.updateCaseNote(ctx, id, input);
	revalidatePath(`/customers/${customerId}`);
	return note;
}

export async function deleteCustomerCaseNoteAction(
	customerId: string,
	id: string,
) {
	const ctx = await getServerContext();
	await caseNotesService.deleteCaseNote(ctx, id);
	revalidatePath(`/customers/${customerId}`);
}
