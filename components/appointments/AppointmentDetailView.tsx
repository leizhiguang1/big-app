"use client";

import { PanelLeftOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import {
	AppointmentToastStack,
	type Toast,
} from "@/components/appointments/AppointmentToastStack";
import { AppointmentSummaryCard } from "@/components/appointments/detail/AppointmentSummaryCard";
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
import { FloatingActionBar } from "@/components/appointments/detail/FloatingActionBar";
import { FollowUpTab } from "@/components/appointments/detail/FollowUpTab";
import { HistoryPanel } from "@/components/appointments/detail/HistoryPanel";
import { PlaceholderPanel } from "@/components/appointments/detail/PlaceholderPanel";
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

	const outletName = useMemo(
		() => allOutlets.find((o) => o.id === appointment.outlet_id)?.name ?? null,
		[allOutlets, appointment.outlet_id],
	);

	return (
		<div className="flex flex-col gap-3">
			<DetailHeader
				appointment={appointment}
				onEdit={() => setEditOpen(true)}
				onToast={showToast}
			/>

			<div className="flex gap-3">
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
						className="flex h-9 shrink-0 items-center justify-center self-start rounded-lg border bg-card px-2 text-muted-foreground shadow-sm transition hover:text-foreground"
					>
						<PanelLeftOpen className="size-4" />
					</button>
				)}
				<div className="flex min-w-0 flex-1 flex-col gap-3">
					<div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
						<div className="flex min-h-0 min-w-0 xl:min-w-[240px] xl:max-w-md xl:flex-1">
							<CustomerCard
								appointment={appointment}
								stats={stats}
								allOutlets={allOutlets}
								allEmployees={allEmployees}
							/>
						</div>
						<div className="flex min-h-0 min-w-0 flex-1 xl:min-w-0">
							<AppointmentSummaryCard
								appointment={appointment}
								outletName={outletName}
								onToast={showToast}
							/>
						</div>
					</div>

					<DetailTabs activeTab={activeTab} onChange={setActiveTab} />

					{activeTab === "overview" && (
						<div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,26%)_1fr] lg:items-start">
							<div className="flex flex-col gap-3">
								<BookingInfoCard appointment={appointment} />
								<PlaceholderPanel title="Status change log" />
							</div>
							<div className="flex min-w-0 flex-col gap-3">
								<PlaceholderPanel title="Consumables" />
								<PlaceholderPanel title="Hands-on incentives" />
							</div>
						</div>
					)}

					{activeTab === "casenotes" && (
						<CaseNotesTab
							appointment={appointment}
							caseNotes={caseNotes}
							onToast={showToast}
						/>
					)}

					{activeTab === "billing" && (
						<BillingTab
							appointmentId={appointment.id}
							entries={billingEntries}
							services={services}
						/>
					)}

					{activeTab === "dental-assessment" && (
						<PlaceholderPanel title="Dental assessment" variant="tab" />
					)}

					{activeTab === "periodontal-charting" && (
						<PlaceholderPanel title="Periodontal charting" variant="tab" />
					)}

					{activeTab === "followup" && (
						<FollowUpTab appointment={appointment} onToast={showToast} />
					)}

					{activeTab === "camera" && (
						<PlaceholderPanel title="Camera" variant="tab" />
					)}

					{activeTab === "documents" && <DocumentsTab />}
				</div>
			</div>

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

			<FloatingActionBar
				appointment={appointment}
				billingEntries={billingEntries}
				onToast={showToast}
			/>

			<AppointmentToastStack toasts={toasts} onDismiss={dismissToast} />
		</div>
	);
}
