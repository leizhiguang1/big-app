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
	revalidatePath("/o/[outlet]/appointments/[ref]", "page");
	return note;
}

export async function updateCaseNoteAction(
	appointmentId: string,
	id: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const note = await caseNotesService.updateCaseNote(ctx, id, input);
	revalidatePath("/o/[outlet]/appointments/[ref]", "page");
	return note;
}

export async function deleteCaseNoteAction(appointmentId: string, id: string) {
	const ctx = await getServerContext();
	await caseNotesService.deleteCaseNote(ctx, id);
	revalidatePath("/o/[outlet]/appointments/[ref]", "page");
}

// Customer-scoped variants — same service calls, revalidate customer path

export async function createCustomerCaseNoteAction(
	customerId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const note = await caseNotesService.createCaseNote(ctx, input);
	revalidatePath(`/o/[outlet]/customers/${customerId}`, "page");
	return note;
}

export async function updateCustomerCaseNoteAction(
	customerId: string,
	id: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const note = await caseNotesService.updateCaseNote(ctx, id, input);
	revalidatePath(`/o/[outlet]/customers/${customerId}`, "page");
	return note;
}

export async function cancelCaseNoteAction(appointmentId: string, id: string) {
	const ctx = await getServerContext();
	await caseNotesService.cancelCaseNote(ctx, id);
	revalidatePath("/o/[outlet]/appointments/[ref]", "page");
}

export async function revertCaseNoteAction(appointmentId: string, id: string) {
	const ctx = await getServerContext();
	await caseNotesService.revertCaseNote(ctx, id);
	revalidatePath("/o/[outlet]/appointments/[ref]", "page");
}

export async function setCaseNotePinAction(
	appointmentId: string,
	id: string,
	pinned: boolean,
) {
	const ctx = await getServerContext();
	await caseNotesService.setCaseNotePin(ctx, id, pinned);
	revalidatePath("/o/[outlet]/appointments/[ref]", "page");
}

export async function deleteCustomerCaseNoteAction(
	customerId: string,
	id: string,
) {
	const ctx = await getServerContext();
	await caseNotesService.deleteCaseNote(ctx, id);
	revalidatePath(`/o/[outlet]/customers/${customerId}`, "page");
}

export async function cancelCustomerCaseNoteAction(
	customerId: string,
	id: string,
) {
	const ctx = await getServerContext();
	await caseNotesService.cancelCaseNote(ctx, id);
	revalidatePath(`/o/[outlet]/customers/${customerId}`, "page");
}

export async function revertCustomerCaseNoteAction(
	customerId: string,
	id: string,
) {
	const ctx = await getServerContext();
	await caseNotesService.revertCaseNote(ctx, id);
	revalidatePath(`/o/[outlet]/customers/${customerId}`, "page");
}

export async function setCustomerCaseNotePinAction(
	customerId: string,
	id: string,
	pinned: boolean,
) {
	const ctx = await getServerContext();
	await caseNotesService.setCaseNotePin(ctx, id, pinned);
	revalidatePath(`/o/[outlet]/customers/${customerId}`, "page");
}
