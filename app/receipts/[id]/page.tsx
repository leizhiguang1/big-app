import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AutoPrint, PrintButton } from "@/app/invoices/[id]/print-button";
import { PrintableReceipt } from "@/components/sales/PrintableReceipt";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import { getBrand } from "@/lib/services/brands";
import { getReceiptById } from "@/lib/services/receipts";

export const dynamic = "force-dynamic";

export default async function ReceiptPrintPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ autoPrint?: string }>;
}) {
	const { id } = await params;
	const { autoPrint } = await searchParams;
	const shouldAutoPrint = autoPrint === "1";

	return (
		<div className="min-h-screen bg-muted/30 print:bg-white">
			<style>{`
				@media print {
					.no-print { display: none !important; }
				}
			`}</style>

			<div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm">
				<div className="font-semibold text-sm">Receipt</div>
				<PrintButton />
			</div>

			<div className="mx-auto my-8 max-w-[700px] px-4 print:my-0 print:max-w-none print:px-0">
				<Suspense fallback={<ReceiptSkeleton />}>
					<ReceiptContent id={id} autoPrint={shouldAutoPrint} />
				</Suspense>
			</div>
		</div>
	);
}

async function ReceiptContent({
	id,
	autoPrint,
}: {
	id: string;
	autoPrint: boolean;
}) {
	const ctx = await getServerContext();
	if (!ctx.currentUser) redirect("/login");

	try {
		const [receipt, brand] = await Promise.all([
			getReceiptById(ctx, id),
			getBrand(ctx).catch(() => null),
		]);
		return (
			<>
				<PrintableReceipt receipt={receipt} brand={brand} />
				<AutoPrint enabled={autoPrint} />
			</>
		);
	} catch (err) {
		if (err instanceof NotFoundError) {
			return (
				<div className="mx-auto max-w-xl rounded-md border bg-white p-12 text-center">
					<div className="font-medium text-base">Receipt not found</div>
					<div className="mt-2 text-muted-foreground text-sm">
						This receipt has been removed or the link is invalid.
					</div>
				</div>
			);
		}
		throw err;
	}
}

function ReceiptSkeleton() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-12 w-full" />
			<Skeleton className="h-40 w-full" />
			<Skeleton className="h-60 w-full" />
		</div>
	);
}
