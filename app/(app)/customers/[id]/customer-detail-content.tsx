import Link from "next/link";
import { CustomerDetailView } from "@/components/customers/CustomerDetailView";
import { Button } from "@/components/ui/button";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import { listLineItemsForCustomer } from "@/lib/services/appointment-line-items";
import { listCustomerTimeline } from "@/lib/services/appointments";
import { listCaseNotesWithContext } from "@/lib/services/case-notes";
import { listCustomerDocuments } from "@/lib/services/customer-documents";
import { getCustomer } from "@/lib/services/customers";
import { listEmployees } from "@/lib/services/employees";
import { listFollowUpsForCustomer } from "@/lib/services/follow-ups";
import { listMedicalCertificatesForCustomer } from "@/lib/services/medical-certificates";
import { listOutlets } from "@/lib/services/outlets";
import { listPayments, listSalesOrders } from "@/lib/services/sales";
import {
	getWalletByCustomer,
	listWalletTransactions,
} from "@/lib/services/wallet";

export async function CustomerDetailContent({ id }: { id: string }) {
	const ctx = await getServerContext();

	try {
		const customer = await getCustomer(ctx, id);
		const [
			timeline,
			lineItems,
			caseNotes,
			salesOrders,
			payments,
			followUps,
			documents,
			medicalCertificates,
			outlets,
			employees,
			wallet,
			walletTransactions,
		] = await Promise.all([
			listCustomerTimeline(ctx, id),
			listLineItemsForCustomer(ctx, id),
			listCaseNotesWithContext(ctx, id),
			listSalesOrders(ctx, { customerId: id }),
			listPayments(ctx, { customerId: id }),
			listFollowUpsForCustomer(ctx, id),
			listCustomerDocuments(ctx, id),
			listMedicalCertificatesForCustomer(ctx, id),
			listOutlets(ctx),
			listEmployees(ctx),
			getWalletByCustomer(ctx, id),
			listWalletTransactions(ctx, id),
		]);
		const defaultConsultantId = ctx.currentUser?.employeeId ?? null;
		return (
			<CustomerDetailView
				customer={customer}
				timeline={timeline}
				lineItems={lineItems}
				caseNotes={caseNotes}
				salesOrders={salesOrders}
				payments={payments}
				followUps={followUps}
				documents={documents}
				medicalCertificates={medicalCertificates}
				outlets={outlets}
				employees={employees}
				defaultConsultantId={defaultConsultantId}
				wallet={wallet}
				walletTransactions={walletTransactions}
			/>
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
