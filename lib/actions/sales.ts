"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import type {
	PaymentWithProcessedBy,
	RefundNoteWithRefs,
	SaleItem,
	SalesOrderWithRelations,
} from "@/lib/services/sales";
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

export type SalesOrderDetailResult =
	| {
			ok: true;
			order: SalesOrderWithRelations;
			items: SaleItem[];
			payments: PaymentWithProcessedBy[];
			refundNotes: RefundNoteWithRefs[];
	  }
	| { ok: false; reason: "not_found" };

export async function getSalesOrderDetailAction(
	id: string,
): Promise<SalesOrderDetailResult> {
	const ctx = await getServerContext();
	try {
		const [order, items, payments, refundNotes] = await Promise.all([
			salesService.getSalesOrder(ctx, id),
			salesService.listSaleItems(ctx, id),
			salesService.listPaymentsForOrder(ctx, id),
			salesService.listRefundNotesForOrder(ctx, id),
		]);
		return { ok: true, order, items, payments, refundNotes };
	} catch (err) {
		if (err instanceof NotFoundError) return { ok: false, reason: "not_found" };
		throw err;
	}
}

export async function voidSalesOrderAction(
	salesOrderId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const result = await salesService.voidSalesOrder(ctx, salesOrderId, input);
	revalidatePath("/sales");
	revalidatePath(`/sales/${salesOrderId}`);
	revalidatePath("/appointments");
	revalidatePath("/inventory");
	revalidatePath("/passcode");
	return {
		cnNumber: result.cn_number,
		rnNumber: result.rn_number,
		refundAmount: result.refund_amount,
	};
}

export async function issueRefundAction(
	salesOrderId: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const result = await salesService.issueRefund(ctx, salesOrderId, input);
	revalidatePath("/sales");
	revalidatePath(`/sales/${salesOrderId}`);
	revalidatePath("/appointments");
	return {
		rnNumber: result.rn_number,
		amount: result.amount,
	};
}
