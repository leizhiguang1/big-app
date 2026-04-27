import Link from "next/link";
import { AppointmentConfigProvider } from "@/components/brand-config/AppointmentConfigProvider";
import { CustomerDetailView } from "@/components/customers/CustomerDetailView";
import { Button } from "@/components/ui/button";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import { addDays, fmtDate } from "@/lib/roster/week";
import { listLineItemsForCustomer } from "@/lib/services/appointment-line-items";
import { listCustomerTimeline } from "@/lib/services/appointments";
import { listAppointmentTags } from "@/lib/services/brand-config";
import { listCaseNotesWithContext } from "@/lib/services/case-notes";
import { listCustomerDocuments } from "@/lib/services/customer-documents";
import {
	listCustomerServiceBalances,
	listCustomerServiceRedemptions,
} from "@/lib/services/customer-services";
import { getCustomer } from "@/lib/services/customers";
import {
	listBookableEmployeesForOutlet,
	listShiftsForRange,
} from "@/lib/services/employee-shifts";
import { listEmployees } from "@/lib/services/employees";
import { listFollowUpsForCustomer } from "@/lib/services/follow-ups";
import { listMedicalCertificatesForCustomer } from "@/lib/services/medical-certificates";
import { listOutlets, listRooms } from "@/lib/services/outlets";
import {
	listCancellations,
	listPayments,
	listRefundNotes,
	listSalesOrders,
} from "@/lib/services/sales";
import {
	getWalletByCustomer,
	listWalletTransactions,
} from "@/lib/services/wallet";

export async function CustomerDetailContent({ id }: { id: string }) {
	const ctx = await getServerContext();

	try {
		const customer = await getCustomer(ctx, id);
		const homeOutletId = customer.home_outlet_id;
		const today = new Date();
		const fromStr = fmtDate(addDays(today, -1));
		const toStr = fmtDate(addDays(today, 14));
		const [
			timeline,
			lineItems,
			caseNotes,
			salesOrders,
			cancellations,
			payments,
			refundNotes,
			followUps,
			documents,
			medicalCertificates,
			outlets,
			employees,
			rosterEmployees,
			rooms,
			shifts,
			brandTags,
			wallet,
			walletTransactions,
			serviceRedemptions,
			serviceBalances,
		] = await Promise.all([
			listCustomerTimeline(ctx, id),
			listLineItemsForCustomer(ctx, id),
			listCaseNotesWithContext(ctx, id),
			listSalesOrders(ctx, { customerId: id }),
			listCancellations(ctx, { customerId: id }),
			listPayments(ctx, { customerId: id }),
			listRefundNotes(ctx, { customerId: id }),
			listFollowUpsForCustomer(ctx, id),
			listCustomerDocuments(ctx, id),
			listMedicalCertificatesForCustomer(ctx, id),
			listOutlets(ctx),
			listEmployees(ctx),
			listBookableEmployeesForOutlet(ctx, homeOutletId),
			listRooms(ctx, homeOutletId),
			listShiftsForRange(ctx, {
				outletId: homeOutletId,
				from: fromStr,
				to: toStr,
			}),
			listAppointmentTags(ctx),
			getWalletByCustomer(ctx, id),
			listWalletTransactions(ctx, id),
			listCustomerServiceRedemptions(ctx, id),
			listCustomerServiceBalances(ctx, id),
		]);
		const defaultConsultantId = ctx.currentUser?.employeeId ?? null;
		const activeOutlets = outlets.filter((o) => o.is_active);
		const activeRooms = rooms.filter((r) => r.is_active);
		const activeAllEmployees = employees.filter((e) => e.is_active);
		return (
			<AppointmentConfigProvider tags={brandTags}>
				<CustomerDetailView
					customer={customer}
					timeline={timeline}
					lineItems={lineItems}
					caseNotes={caseNotes}
					salesOrders={salesOrders}
					cancellations={cancellations}
					payments={payments}
					refundNotes={refundNotes}
					followUps={followUps}
					documents={documents}
					medicalCertificates={medicalCertificates}
					outlets={outlets}
					employees={employees}
					defaultConsultantId={defaultConsultantId}
					wallet={wallet}
					walletTransactions={walletTransactions}
					serviceRedemptions={serviceRedemptions}
					serviceBalances={serviceBalances}
					homeOutletId={homeOutletId}
					rosterEmployees={rosterEmployees}
					rooms={activeRooms}
					shifts={shifts}
					allOutlets={activeOutlets}
					allEmployees={activeAllEmployees}
				/>
			</AppointmentConfigProvider>
		);
	} catch (err) {
		if (err instanceof NotFoundError) {
			return <NotFoundPanel />;
		}
		throw err;
	}
}

function NotFoundPanel() {
	return (
		<div className="flex flex-col items-center gap-4 rounded-md border bg-muted/30 p-12 text-center">
			<div className="font-medium text-base">Customer not found</div>
			<div className="max-w-md text-muted-foreground text-sm">
				The customer you're looking for has been deleted, or the link is no
				longer valid.
			</div>
			<Button asChild size="sm">
				<Link href="/customers">Back to customers</Link>
			</Button>
		</div>
	);
}
