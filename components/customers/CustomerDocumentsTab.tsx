"use client";

import { useCallback, useState } from "react";
import {
	AppointmentToastStack,
	type Toast,
} from "@/components/appointments/AppointmentToastStack";
import { CustomerDocumentsPanel } from "@/components/customer-documents/CustomerDocumentsPanel";
import type { CustomerDocumentWithRefs } from "@/lib/services/customer-documents";

type Props = {
	customerId: string;
	defaultUploaderId: string | null;
	documents: CustomerDocumentWithRefs[];
};

export function CustomerDocumentsTab({
	customerId,
	defaultUploaderId,
	documents,
}: Props) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const showToast = useCallback(
		(message: string, variant: Toast["variant"] = "default") => {
			const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			setToasts((prev) => [...prev, { id, message, variant }]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, 2000);
		},
		[],
	);

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	return (
		<>
			<CustomerDocumentsPanel
				customerId={customerId}
				appointmentId={null}
				defaultUploaderId={defaultUploaderId}
				documents={documents}
				onToast={showToast}
			/>
			<AppointmentToastStack toasts={toasts} onDismiss={dismissToast} />
		</>
	);
}
