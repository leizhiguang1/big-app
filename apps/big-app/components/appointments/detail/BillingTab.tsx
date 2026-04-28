"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BillingSection } from "@/components/appointments/BillingSection";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { BillingSettings } from "@/lib/services/billing-settings";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";

type Props = {
	appointmentId: string;
	entries: AppointmentLineItem[];
	services: ServiceWithCategory[];
	products: InventoryItemWithRefs[];
	taxes: Tax[];
	frontdeskMessage: string | null;
	isLead: boolean;
	isBlock: boolean;
	customer: AppointmentWithRelations["customer"];
	billingSettings: BillingSettings;
};

export function BillingTab({
	appointmentId,
	entries,
	services,
	products,
	taxes,
	frontdeskMessage,
	isLead,
	isBlock,
	customer,
	billingSettings,
}: Props) {
	const router = useRouter();
	const [, startTransition] = useTransition();

	if (isBlock) {
		return (
			<div className="rounded-md border bg-muted/20 p-6 text-center text-muted-foreground text-sm">
				Billing doesn't apply to time blocks.
			</div>
		);
	}

	if (isLead) {
		return (
			<div className="rounded-md border bg-amber-50 p-6 text-center text-amber-900 text-sm">
				Register this walk-in lead as a customer to start billing.
			</div>
		);
	}

	return (
		<BillingSection
			appointmentId={appointmentId}
			entries={entries}
			services={services}
			products={products}
			taxes={taxes}
			frontdeskMessage={frontdeskMessage}
			customer={customer}
			billingSettings={billingSettings}
			onChange={() => startTransition(() => router.refresh())}
		/>
	);
}
