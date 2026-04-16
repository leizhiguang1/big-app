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

export async function cancelSalesOrderAction(
	salesOrderId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const cn = await salesService.cancelSalesOrder(ctx, salesOrderId, input);
	revalidatePath("/sales");
	revalidatePath(`/sales/${salesOrderId}`);
	return { cnNumber: cn.cn_number };
}
