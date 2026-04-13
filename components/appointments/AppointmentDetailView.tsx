"use client";

import { PanelLeftOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import {
	AppointmentToastStack,
	type Toast,
} from "@/components/appointments/AppointmentToastStack";
import { BillingTab } from "@/components/appointments/detail/BillingTab";
import { BookingInfoCard } from "@/components/appointments/detail/BookingInfoCard";
import { CaseNotesTab } from "@/components/appointments/detail/CaseNotesTab";
import { CustomerCard } from "@/components/appointments/detail/CustomerCard";
import { DetailHeader } from "@/components/appointments/detail/DetailHeader";
import {
	type DetailTabKey,
	DetailTabs,
} from "@/components/appointments/detail/DetailTabs";
import { DocumentsTab } from "@/components/appointments/detail/DocumentsTab";
import { FollowUpTab } from "@/components/appointments/detail/FollowUpTab";
import { HistoryPanel } from "@/components/appointments/detail/HistoryPanel";
import { NotesCard } from "@/components/appointments/detail/NotesCard";
import { PaymentSection } from "@/components/appointments/detail/PaymentSection";
import { StatusProgressionRow } from "@/components/appointments/detail/StatusProgressionRow";
import { TagPickerRow } from "@/components/appointments/detail/TagPickerRow";
import type {
	AppointmentWithRelations,
	CustomerAppointmentSummary,
} from "@/lib/services/appointments";
import type {
	BillingEntry,
	CustomerBillingEntry,
} from "@/lib/services/billing-entries";
import type { CaseNoteWithAuthor } from "@/lib/services/case-notes";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type { RosterEmployee } from "@/lib/services/employee-shifts";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount, Room } from "@/lib/services/outlets";
import type { ServiceWithCategory } from "@/lib/services/services";

type Props = {
	appointment: AppointmentWithRelations;
	billingEntries: BillingEntry[];
	customerHistory: CustomerAppointmentSummary[];
	caseNotes: CaseNoteWithAuthor[];
	customerBillingHistory: CustomerBillingEntry[];
	customers: CustomerWithRelations[];
	employees: RosterEmployee[];
	rooms: Room[];
	services: ServiceWithCategory[];
	allOutlets: OutletWithRoomCount[];
	allEmployees: EmployeeWithRelations[];
};

export function AppointmentDetailView({
	appointment,
	billingEntries,
	customerHistory,
	caseNotes,
	customerBillingHistory,
	customers,
	employees,
	rooms,
	services,
	allOutlets,
	allEmployees,
}: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<DetailTabKey>("overview");
	const [toasts, setToasts] = useState<Toast[]>([]);
	const [historyOpen, setHistoryOpen] = useState(false);

	const isHistoryTab = activeTab === "casenotes" || activeTab === "billing";
	const canShowHistory =
		isHistoryTab && !appointment.is_time_block && !!appointment.customer_id;

	useEffect(() => {
		setHistoryOpen(isHistoryTab);
	}, [isHistoryTab]);

	const showToast = useCallback(
		(message: string, variant: Toast["variant"] = "default") => {
			const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			setToasts((prev) => [...prev, { id, message, variant }]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, 3000);
		},
		[],
	);

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const billingTotal = useMemo(
		() =>
			billingEntries.reduce(
				(sum, e) => sum + (e.total ?? e.quantity * e.unit_price),
				0,
			),
		[billingEntries],
	);

	const stats = useMemo(() => {
		if (!appointment.customer_id) return { noShows: 0, outstanding: 0 };
		let noShows = 0;
		let outstanding = 0;
		for (const a of customerHistory) {
			if (a.status === "noshow") noShows++;
			if (a.id !== appointment.id && a.payment_status !== "paid") outstanding++;
		}
		return { noShows, outstanding };
	}, [customerHistory, appointment.customer_id, appointment.id]);

	const nextAppointment = useMemo(() => {
		if (!appointment.customer_id) return null;
		const now = Date.now();
		return (
			customerHistory
				.filter(
					(a) =>
						a.id !== appointment.id && new Date(a.start_at).getTime() > now,
				)
				.sort(
					(a, b) =>
						new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
				)[0] ?? null
		);
	}, [customerHistory, appointment.customer_id, appointment.id]);

	return (
		<div className="flex flex-col gap-4">
			<DetailHeader
				appointment={appointment}
				onEdit={() => setEditOpen(true)}
				onToast={showToast}
			/>

			<DetailTabs activeTab={activeTab} onChange={setActiveTab} />

			{activeTab === "overview" && (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
					<CustomerCard
						appointment={appointment}
						stats={stats}
						nextAppointment={nextAppointment}
						allOutlets={allOutlets}
						allEmployees={allEmployees}
					/>

					<div className="flex flex-col gap-4">
						<BookingInfoCard appointment={appointment} />
						<StatusProgressionRow
							appointment={appointment}
							onToast={showToast}
						/>
						<TagPickerRow appointment={appointment} onToast={showToast} />
						<NotesCard appointment={appointment} />
						<PaymentSection
							appointment={appointment}
							billingTotal={billingTotal}
							onToast={showToast}
						/>
					</div>
				</div>
			)}

			{isHistoryTab && (
				<div className="flex gap-4">
					{canShowHistory && historyOpen && (
						<HistoryPanel
							currentAppointmentId={appointment.id}
							caseNotes={caseNotes}
							customerBillingHistory={customerBillingHistory}
							customerHistory={customerHistory}
							onClose={() => setHistoryOpen(false)}
							onToast={showToast}
						/>
					)}
					{canShowHistory && !historyOpen && (
						<button
							type="button"
							onClick={() => setHistoryOpen(true)}
							aria-label="Open history panel"
							title="Open history"
							className="flex h-10 shrink-0 items-center justify-center rounded-md border bg-card px-2 text-muted-foreground transition hover:text-foreground"
						>
							<PanelLeftOpen className="size-4" />
						</button>
					)}
					<div className="min-w-0 flex-1">
						{activeTab === "billing" && (
							<BillingTab
								appointmentId={appointment.id}
								entries={billingEntries}
								services={services}
							/>
						)}
						{activeTab === "casenotes" && (
							<CaseNotesTab
								appointment={appointment}
								caseNotes={caseNotes}
								onToast={showToast}
							/>
						)}
					</div>
				</div>
			)}

			{activeTab === "followup" && (
				<FollowUpTab appointment={appointment} onToast={showToast} />
			)}

			{activeTab === "documents" && <DocumentsTab />}

			{editOpen && (
				<AppointmentDialog
					open
					onClose={() => setEditOpen(false)}
					outletId={appointment.outlet_id}
					appointment={appointment}
					prefill={null}
					customers={customers}
					employees={employees}
					rooms={rooms}
					allOutlets={allOutlets}
					allEmployees={allEmployees}
				/>
			)}

			<AppointmentToastStack toasts={toasts} onDismiss={dismissToast} />
		</div>
	);
}
