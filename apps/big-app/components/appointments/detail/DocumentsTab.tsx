"use client";

import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { CustomerDocumentsPanel } from "@/components/customer-documents/CustomerDocumentsPanel";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { CustomerDocumentWithRefs } from "@/lib/services/customer-documents";

type Props = {
	appointment: AppointmentWithRelations;
	documents: CustomerDocumentWithRefs[];
	onToast: (message: string, variant?: Toast["variant"]) => void;
};

export function DocumentsTab({ appointment, documents, onToast }: Props) {
	if (appointment.is_time_block) {
		return (
			<div className="rounded-md border bg-muted/20 p-6 text-center text-muted-foreground text-sm">
				Documents don't apply to time blocks.
			</div>
		);
	}

	if (!appointment.customer_id) {
		return (
			<div className="rounded-md border bg-amber-50 p-6 text-center text-amber-900 text-sm">
				Register this walk-in lead as a customer to attach documents.
			</div>
		);
	}

	return (
		<CustomerDocumentsPanel
			customerId={appointment.customer_id}
			appointmentId={appointment.id}
			defaultUploaderId={appointment.employee_id ?? null}
			documents={documents}
			onToast={onToast}
		/>
	);
}
