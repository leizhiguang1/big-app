"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BillingSection } from "@/components/appointments/BillingSection";
import type { BillingEntry } from "@/lib/services/billing-entries";
import type { ServiceWithCategory } from "@/lib/services/services";

type Props = {
	appointmentId: string;
	entries: BillingEntry[];
	services: ServiceWithCategory[];
};

export function BillingTab({ appointmentId, entries, services }: Props) {
	const router = useRouter();
	const [, startTransition] = useTransition();

	return (
		<BillingSection
			appointmentId={appointmentId}
			entries={entries}
			services={services}
			onChange={() => startTransition(() => router.refresh())}
		/>
	);
}
