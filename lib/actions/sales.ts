"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import { listCustomers } from "@/lib/services/customers";
import { listEmployees } from "@/lib/services/employees";
import { listSellableProducts } from "@/lib/services/inventory";
import { listOutlets } from "@/lib/services/outlets";
import { listActivePaymentMethods } from "@/lib/services/payment-methods";
import type {
	PaymentAllocationForOrder,
	PaymentWithProcessedBy,
	RefundNoteWithRefs,
	SaleItem,
	SalesOrderWithRelations,
} from "@/lib/services/sales";
import * as salesService from "@/lib/services/sales";
import { listServices } from "@/lib/services/services";
import { listTaxes } from "@/lib/services/taxes";

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
	revalidatePath("/appointments/[ref]", "page");
	return result;
}

export async function collectWalkInSaleAction(input: unknown) {
	const ctx = await getServerContext();
	const result = await salesService.collectWalkInSale(ctx, input);
	revalidatePath("/sales");
	revalidatePath("/inventory");
	return result;
}

export async function getNewSaleDataAction() {
	const ctx = await getServerContext();
	const [
		customers,
		outlets,
		allEmployees,
		services,
		products,
		taxes,
		paymentMethods,
	] = await Promise.all([
		listCustomers(ctx),
		listOutlets(ctx),
		listEmployees(ctx),
		listServices(ctx),
		listSellableProducts(ctx),
		listTaxes(ctx),
		listActivePaymentMethods(ctx),
	]);
	return {
		customers,
		outlets: outlets.filter((o) => o.is_active),
		employees: allEmployees.filter((e) => e.is_active),
		services: services.filter((s) => s.is_active),
		products,
		taxes,
		paymentMethods,
		currentEmployeeId: ctx.currentUser?.employeeId ?? null,
	};
}

export type SalesOrderDetailResult =
	| {
			ok: true;
			order: SalesOrderWithRelations;
			items: SaleItem[];
			payments: PaymentWithProcessedBy[];
			refundNotes: RefundNoteWithRefs[];
			allocations: PaymentAllocationForOrder[];
	  }
	| { ok: false; reason: "not_found" };

export async function getSalesOrderDetailAction(
	id: string,
): Promise<SalesOrderDetailResult> {
	const ctx = await getServerContext();
	try {
		const [order, items, payments, refundNotes, allocations] =
			await Promise.all([
				salesService.getSalesOrder(ctx, id),
				salesService.listSaleItems(ctx, id),
				salesService.listPaymentsForOrder(ctx, id),
				salesService.listRefundNotesForOrder(ctx, id),
				salesService.listPaymentAllocationsForOrder(ctx, id),
			]);
		return { ok: true, order, items, payments, refundNotes, allocations };
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

export async function issueRefundAction(salesOrderId: string, input: unknown) {
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

function revalidateSalesOrder(
	salesOrderId: string,
	appointmentRef?: string | null,
) {
	revalidatePath("/sales");
	revalidatePath(`/sales/${salesOrderId}`);
	revalidatePath("/appointments");
	if (appointmentRef) revalidatePath(`/appointments/${appointmentRef}`);
}

export async function revertLastPaymentAction(
	salesOrderId: string,
	appointmentRef?: string | null,
) {
	const ctx = await getServerContext();
	const result = await salesService.revertLastPayment(ctx, salesOrderId);
	revalidateSalesOrder(salesOrderId, appointmentRef);
	return {
		invoiceNo: result.invoice_no,
		amount: Number(result.amount),
		newStatus: result.new_status,
	};
}

export async function updatePaymentMethodAction(
	paymentId: string,
	salesOrderId: string,
	input: unknown,
	appointmentRef?: string | null,
) {
	const ctx = await getServerContext();
	await salesService.updatePaymentMethod(ctx, paymentId, input);
	revalidateSalesOrder(salesOrderId, appointmentRef);
}

export async function updatePaymentAllocationsAction(
	salesOrderId: string,
	input: unknown,
	appointmentRef?: string | null,
) {
	const ctx = await getServerContext();
	await salesService.updatePaymentAllocations(ctx, salesOrderId, input);
	revalidateSalesOrder(salesOrderId, appointmentRef);
}

export async function replaceSaleItemIncentivesAction(
	salesOrderId: string,
	input: unknown,
	appointmentRef?: string | null,
) {
	const ctx = await getServerContext();
	await salesService.replaceSaleItemIncentives(ctx, input);
	revalidateSalesOrder(salesOrderId, appointmentRef);
}
