import Link from "next/link";
import { AppointmentDetailView } from "@/components/appointments/AppointmentDetailView";
import { AppointmentConfigProvider } from "@/components/brand-config/AppointmentConfigProvider";
import { Button } from "@/components/ui/button";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import { addDays, fmtDate } from "@/lib/roster/week";
import {
	type CustomerLineItem,
	listIncentivesForAppointment,
	listLineItemsForAppointment,
	listLineItemsForCustomer,
} from "@/lib/services/appointment-line-items";
import {
	type AppointmentWithRelations,
	type CustomerAppointmentSummary,
	getAppointment,
	listAppointmentStatusLog,
	listCustomerAppointments,
} from "@/lib/services/appointments";
import { getBillingSettings } from "@/lib/services/billing-settings";
import { listAppointmentTags } from "@/lib/services/brand-config";
import { getBrandSetting } from "@/lib/services/brand-settings";
import {
	type CaseNoteWithContext,
	listCaseNotesWithContext,
} from "@/lib/services/case-notes";
import {
	type CustomerDocumentWithRefs,
	listCustomerDocuments,
} from "@/lib/services/customer-documents";
import { listCustomers } from "@/lib/services/customers";
import {
	listBookableEmployeesForOutlet,
	listShiftsForRange,
} from "@/lib/services/employee-shifts";
import { listEmployees } from "@/lib/services/employees";
import {
	type FollowUpWithRefs,
	listFollowUpsForCustomer,
} from "@/lib/services/follow-ups";
import { listSellableProducts } from "@/lib/services/inventory";
import { listMedicalCertificatesForAppointment } from "@/lib/services/medical-certificates";
import { listOutlets, listRooms } from "@/lib/services/outlets";
import { listActivePaymentMethods } from "@/lib/services/payment-methods";
import { getSalesOrderForAppointment } from "@/lib/services/sales";
import { listServices } from "@/lib/services/services";
import { listTaxes } from "@/lib/services/taxes";

export async function AppointmentDetailContent({ id }: { id: string }) {
	const ctx = await getServerContext();

	let appointment: AppointmentWithRelations;
	try {
		appointment = await getAppointment(ctx, id);
	} catch (err) {
		if (err instanceof NotFoundError) {
			return <NotFoundPanel />;
		}
		throw err;
	}

	const customerHistoryPromise: Promise<CustomerAppointmentSummary[]> =
		appointment.customer_id
			? listCustomerAppointments(ctx, appointment.customer_id)
			: Promise.resolve([]);

	const caseNotesPromise: Promise<CaseNoteWithContext[]> =
		appointment.customer_id
			? listCaseNotesWithContext(ctx, appointment.customer_id)
			: Promise.resolve([]);

	const followUpsPromise: Promise<FollowUpWithRefs[]> = appointment.customer_id
		? listFollowUpsForCustomer(ctx, appointment.customer_id)
		: Promise.resolve([]);

	const customerDocumentsPromise: Promise<CustomerDocumentWithRefs[]> =
		appointment.customer_id
			? listCustomerDocuments(ctx, appointment.customer_id)
			: Promise.resolve([]);

	const customerLineItemsPromise: Promise<CustomerLineItem[]> =
		appointment.customer_id
			? listLineItemsForCustomer(ctx, appointment.customer_id)
			: Promise.resolve([]);

	const apptLocal = new Date(appointment.start_at);
	const prevDateStr = fmtDate(addDays(apptLocal, -1));
	const nextDateStr = fmtDate(addDays(apptLocal, 1));

	const [
		lineItems,
		incentives,
		customerHistory,
		caseNotes,
		followUps,
		customerDocuments,
		customerLineItemsHistory,
		customers,
		employees,
		rooms,
		services,
		products,
		outlets,
		allEmployees,
		statusLog,
		shifts,
		taxes,
		salesOrder,
		paymentMethods,
		medicalCertificates,
		billingSettings,
		brandTags,
		staffDiscountPercent,
	] = await Promise.all([
		listLineItemsForAppointment(ctx, id),
		listIncentivesForAppointment(ctx, id),
		customerHistoryPromise,
		caseNotesPromise,
		followUpsPromise,
		customerDocumentsPromise,
		customerLineItemsPromise,
		listCustomers(ctx),
		listBookableEmployeesForOutlet(ctx, appointment.outlet_id),
		listRooms(ctx, appointment.outlet_id),
		listServices(ctx),
		listSellableProducts(ctx),
		listOutlets(ctx),
		listEmployees(ctx),
		listAppointmentStatusLog(ctx, id),
		listShiftsForRange(ctx, {
			outletId: appointment.outlet_id,
			from: prevDateStr,
			to: nextDateStr,
		}),
		listTaxes(ctx),
		getSalesOrderForAppointment(ctx, id),
		listActivePaymentMethods(ctx),
		listMedicalCertificatesForAppointment(ctx, id),
		getBillingSettings(ctx),
		listAppointmentTags(ctx),
		getBrandSetting(ctx, "billing.staff_discount_percent"),
	]);

	const activeOutlets = outlets.filter((o) => o.is_active);
	const activeRooms = rooms.filter((r) => r.is_active);
	const activeServices = services.filter((s) => s.is_active);
	const activeAllEmployees = allEmployees.filter((e) => e.is_active);

	return (
		<AppointmentConfigProvider tags={brandTags}>
			<AppointmentDetailView
				appointment={appointment}
				lineItems={lineItems}
				incentives={incentives}
				customerHistory={customerHistory}
				caseNotes={caseNotes}
				followUps={followUps}
				customerDocuments={customerDocuments}
				customerLineItemsHistory={customerLineItemsHistory}
				customers={customers}
				employees={employees}
				rooms={activeRooms}
				services={activeServices}
				products={products}
				taxes={taxes}
				allOutlets={activeOutlets}
				allEmployees={activeAllEmployees}
				statusLog={statusLog}
				shifts={shifts}
				salesOrderId={salesOrder?.id ?? null}
				paymentMethods={paymentMethods}
				medicalCertificates={medicalCertificates}
				billingSettings={billingSettings}
				staffDiscountPercent={staffDiscountPercent}
			/>
		</AppointmentConfigProvider>
	);
}

function NotFoundPanel() {
	return (
		<div className="flex flex-col items-center gap-4 rounded-md border bg-muted/30 p-12 text-center">
			<div className="font-medium text-base">Appointment not found</div>
			<div className="max-w-md text-muted-foreground text-sm">
				The appointment you're looking for has been deleted, or the link is no
				longer valid.
			</div>
			<Button asChild size="sm">
				<Link href="/appointments">Back to calendar</Link>
			</Button>
		</div>
	);
}
