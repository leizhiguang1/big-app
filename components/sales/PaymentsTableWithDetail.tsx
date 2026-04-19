"use client";

import { useState } from "react";
import { PaymentsTable } from "@/components/sales/PaymentsTable";
import { SalesOrderDetailDialog } from "@/components/sales/SalesOrderDetailDialog";
import type { PaymentWithRelations } from "@/lib/services/sales";

type Props = {
	payments: PaymentWithRelations[];
};

export function PaymentsTableWithDetail({ payments }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);

	return (
		<>
			<PaymentsTable payments={payments} onOpen={setOpenId} />
			<SalesOrderDetailDialog
				open={openId !== null}
				onOpenChange={(open) => {
					if (!open) setOpenId(null);
				}}
				salesOrderId={openId}
			/>
		</>
	);
}
