"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as salesService from "@/lib/services/sales";

export async function collectAppointmentPaymentAction(
	appointmentId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const result = await salesService.collectAppointmentPayment(
		ctx,
		appointmentId,
		input,
	);
	revalidatePath("/appointments");
	revalidatePath(`/appointments/${appointmentId}`);
	return result;
}
