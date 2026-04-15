"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BillingSection } from "@/components/appointments/BillingSection";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";

type Props = {
	appointmentId: string;
	entries: AppointmentLineItem[];
	services: ServiceWithCategory[];
	products: InventoryItemWithRefs[];
	taxes: Tax[];
};

export function BillingTab({
	appointmentId,
	entries,
	services,
	products,
	taxes,
}: Props) {
	const router = useRouter();
	const [, startTransition] = useTransition();

	return (
		<BillingSection
			appointmentId={appointmentId}
			entries={entries}
			services={services}
			products={products}
			taxes={taxes}
			onChange={() => startTransition(() => router.refresh())}
		/>
	);
}
