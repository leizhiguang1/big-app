"use client";

import { useState } from "react";
import { SalesOrderDetailDialog } from "@/components/sales/SalesOrderDetailDialog";
import { SalesOrdersTable } from "@/components/sales/SalesOrdersTable";
import type { SalesOrderWithRelations } from "@/lib/services/sales";

type Props = {
	orders: SalesOrderWithRelations[];
};

export function SalesOrdersTableWithDetail({ orders }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);

	return (
		<>
			<SalesOrdersTable orders={orders} onOpen={setOpenId} />
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
