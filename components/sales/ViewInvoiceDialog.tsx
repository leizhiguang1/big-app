"use client";

import { Printer, X } from "lucide-react";
import { PrintableInvoice } from "@/components/sales/PrintableInvoice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Brand } from "@/lib/services/brands";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type { Outlet } from "@/lib/services/outlets";
import type {
	PaymentWithProcessedBy,
	SaleItem,
	SalesOrderWithRelations,
} from "@/lib/services/sales";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	order: SalesOrderWithRelations;
	items: SaleItem[];
	payments: PaymentWithProcessedBy[];
	outlet: Outlet | null;
	customer: CustomerWithRelations | null;
	brand: Brand | null;
};

export function ViewInvoiceDialog({
	open,
	onOpenChange,
	order,
	items,
	payments,
	outlet,
	customer,
	brand,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[860px] flex-col gap-0 overflow-hidden bg-zinc-100 p-0 print:max-h-none print:max-w-none print:overflow-visible print:bg-white"
			>
				<DialogTitle className="sr-only">Invoice {order.so_number}</DialogTitle>
				<div className="flex items-center justify-between gap-2 border-b bg-white px-4 py-2 print:hidden">
					<div className="text-sm">
						<span className="font-semibold">Invoice</span>
						<span className="ml-2 font-mono text-muted-foreground text-xs">
							{order.so_number}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Button type="button" size="sm" onClick={() => window.print()}>
							<Printer className="mr-2 size-4" />
							Print
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-8"
							onClick={() => onOpenChange(false)}
							aria-label="Close"
						>
							<X className="size-4" />
						</Button>
					</div>
				</div>
				<div className="overflow-y-auto px-4 py-6 print:overflow-visible print:p-0">
					<PrintableInvoice
						order={order}
						items={items}
						payments={payments}
						outlet={outlet}
						customer={customer}
						brand={brand}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
