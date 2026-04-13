import Link from "next/link";
import { AppointmentDetailView } from "@/components/appointments/AppointmentDetailView";
import { Button } from "@/components/ui/button";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import {
	type AppointmentWithRelations,
	type CustomerAppointmentSummary,
	getAppointment,
	listCustomerAppointments,
} from "@/lib/services/appointments";
import {
	type CustomerBillingEntry,
	listBillingEntriesForAppointment,
	listBillingEntriesForCustomer,
} from "@/lib/services/billing-entries";
import {
	type CaseNoteWithAuthor,
	listCaseNotesForCustomer,
} from "@/lib/services/case-notes";
import { listCustomers } from "@/lib/services/customers";
import { listBookableEmployeesForOutlet } from "@/lib/services/employee-shifts";
import { listEmployees } from "@/lib/services/employees";
import { listOutlets, listRooms } from "@/lib/services/outlets";
import { listServices } from "@/lib/services/services";

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

	const caseNotesPromise: Promise<CaseNoteWithAuthor[]> =
		appointment.customer_id
			? listCaseNotesForCustomer(ctx, appointment.customer_id)
			: Promise.resolve([]);

	const customerBillingPromise: Promise<CustomerBillingEntry[]> =
		appointment.customer_id
			? listBillingEntriesForCustomer(ctx, appointment.customer_id)
			: Promise.resolve([]);

	const [
		billingEntries,
		customerHistory,
		caseNotes,
		customerBillingHistory,
		customers,
		employees,
		rooms,
		services,
		outlets,
		allEmployees,
	] = await Promise.all([
		listBillingEntriesForAppointment(ctx, id),
		customerHistoryPromise,
		caseNotesPromise,
		customerBillingPromise,
		listCustomers(ctx),
		listBookableEmployeesForOutlet(ctx, appointment.outlet_id),
		listRooms(ctx, appointment.outlet_id),
		listServices(ctx),
		listOutlets(ctx),
		listEmployees(ctx),
	]);

	const activeOutlets = outlets.filter((o) => o.is_active);
	const activeRooms = rooms.filter((r) => r.is_active);
	const activeServices = services.filter((s) => s.is_active);
	const activeAllEmployees = allEmployees.filter((e) => e.is_active);

	return (
		<AppointmentDetailView
			appointment={appointment}
			billingEntries={billingEntries}
			customerHistory={customerHistory}
			caseNotes={caseNotes}
			customerBillingHistory={customerBillingHistory}
			customers={customers}
			employees={employees}
			rooms={activeRooms}
			services={activeServices}
			allOutlets={activeOutlets}
			allEmployees={activeAllEmployees}
		/>
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
