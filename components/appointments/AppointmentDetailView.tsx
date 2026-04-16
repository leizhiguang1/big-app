"use client";

import { PanelLeftOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import {
	AppointmentToastStack,
	type Toast,
} from "@/components/appointments/AppointmentToastStack";
import { playGeneralToastSound } from "@/lib/appointments/play-status-sound";
import { AppointmentSummaryCard } from "@/components/appointments/detail/AppointmentSummaryCard";
import { BillingTab } from "@/components/appointments/detail/BillingTab";
import { BookingInfoCard } from "@/components/appointments/detail/BookingInfoCard";
import { CaseNotesTab } from "@/components/appointments/detail/CaseNotesTab";
import { ConsumablesCard } from "@/components/appointments/detail/ConsumablesCard";
import { CustomerCard } from "@/components/appointments/detail/CustomerCard";
import { DetailHeader } from "@/components/appointments/detail/DetailHeader";
import {
	type DetailTabKey,
	DetailTabs,
} from "@/components/appointments/detail/DetailTabs";
import { DocumentsTab } from "@/components/appointments/detail/DocumentsTab";
import { FloatingActionBar } from "@/components/appointments/detail/FloatingActionBar";
import { FollowUpTab } from "@/components/appointments/detail/FollowUpTab";
import { HandsOnIncentivesCard } from "@/components/appointments/detail/HandsOnIncentivesCard";
import {
	FollowUpHistoryPanel,
	HistoryPanel,
} from "@/components/appointments/detail/HistoryPanel";
import { PlaceholderPanel } from "@/components/appointments/detail/PlaceholderPanel";
import { StatusChangeLogCard } from "@/components/appointments/detail/StatusChangeLogCard";
import type {
	AppointmentLineItem,
	CustomerLineItem,
	IncentiveWithEmployee,
} from "@/lib/services/appointment-line-items";
import type {
	AppointmentStatusLogEntry,
	AppointmentWithRelations,
	CustomerAppointmentSummary,
} from "@/lib/services/appointments";
import type { CaseNoteWithContext } from "@/lib/services/case-notes";
import type { CustomerDocumentWithRefs } from "@/lib/services/customer-documents";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { FollowUpWithRefs } from "@/lib/services/follow-ups";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
import type { OutletWithRoomCount, Room } from "@/lib/services/outlets";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";

type Props = {
	appointment: AppointmentWithRelations;
	lineItems: AppointmentLineItem[];
	incentives: IncentiveWithEmployee[];
	customerHistory: CustomerAppointmentSummary[];
	caseNotes: CaseNoteWithContext[];
	followUps: FollowUpWithRefs[];
	customerDocuments: CustomerDocumentWithRefs[];
	customerLineItemsHistory: CustomerLineItem[];
	customers: CustomerWithRelations[];
	employees: RosterEmployee[];
	rooms: Room[];
	services: ServiceWithCategory[];
	products: InventoryItemWithRefs[];
	taxes: Tax[];
	allOutlets: OutletWithRoomCount[];
	allEmployees: EmployeeWithRelations[];
	statusLog: AppointmentStatusLogEntry[];
	shifts: EmployeeShift[];
	salesOrderId: string | null;
};

export function AppointmentDetailView({
	appointment,
	lineItems,
	incentives,
	customerHistory,
	caseNotes,
	followUps,
	customerDocuments,
	customerLineItemsHistory,
	customers,
	employees,
	rooms,
	services,
	products,
	taxes,
	allOutlets,
	allEmployees,
	statusLog,
	shifts,
	salesOrderId,
}: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<DetailTabKey>("overview");
	const [toasts, setToasts] = useState<Toast[]>([]);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [headerCollapsed, setHeaderCollapsed] = useState(false);
	const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(
		null,
	);

	const isCaseBillingTab = activeTab === "casenotes" || activeTab === "billing";
	const isFollowUpTab = activeTab === "followup";
	const isHistoryTab = isCaseBillingTab || isFollowUpTab;
	const canShowHistory =
		isHistoryTab && !appointment.is_time_block && !!appointment.customer_id;

	useEffect(() => {
		setHistoryOpen(isHistoryTab);
	}, [isHistoryTab]);

	const showToast = useCallback(
		(message: string, variant: Toast["variant"] = "default") => {
			const sound = variant === "success" ? "success" : variant === "error" ? "error" : "info";
			playGeneralToastSound(sound);
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

	const nextAppointmentAt = useMemo(() => {
		if (!appointment.customer_id) return null;
		const now = Date.now();
		const upcoming = customerHistory
			.filter(
				(a) =>
					a.id !== appointment.id &&
					new Date(a.start_at).getTime() > now &&
					a.status !== "cancelled" &&
					a.status !== "noshow",
			)
			.sort(
				(a, b) =>
					new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
			);
		return upcoming[0]?.start_at ?? null;
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
				summaryCollapsed={headerCollapsed}
				onToggleSummaryCollapse={
					appointment.is_time_block
						? undefined
						: () => setHeaderCollapsed((v) => !v)
				}
			/>

			<div className="flex gap-3">
				{canShowHistory && historyOpen && isCaseBillingTab && (
					<HistoryPanel
						currentAppointmentId={appointment.id}
						caseNotes={caseNotes}
						customerBillingHistory={customerLineItemsHistory}
						customerHistory={customerHistory}
						onClose={() => setHistoryOpen(false)}
						onToast={showToast}
					/>
				)}
				{canShowHistory && historyOpen && isFollowUpTab && (
					<FollowUpHistoryPanel
						currentAppointmentId={appointment.id}
						followUps={followUps}
						customerHistory={customerHistory}
						onClose={() => setHistoryOpen(false)}
						onToast={showToast}
						onEdit={(f) => setEditingFollowUpId(f.id)}
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
					<div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
						<div
							className={
								headerCollapsed
									? "flex min-h-0 min-w-0 flex-1"
									: "flex min-h-0 min-w-0 lg:w-[380px] lg:shrink-0"
							}
						>
							<CustomerCard
								appointment={appointment}
								stats={stats}
								nextAppointmentAt={nextAppointmentAt}
								allOutlets={allOutlets}
								allEmployees={allEmployees}
								collapsed={headerCollapsed}
							/>
						</div>
						{!headerCollapsed && (
							<div className="flex min-h-0 min-w-0 flex-1">
								<AppointmentSummaryCard
									appointment={appointment}
									outletName={outletName}
									onToast={showToast}
								/>
							</div>
						)}
					</div>

					<DetailTabs activeTab={activeTab} onChange={setActiveTab} />

					{activeTab === "overview" && (
						<div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,26%)_1fr] lg:items-start">
							<div className="flex flex-col gap-3">
								<BookingInfoCard
									appointment={appointment}
									lineItems={lineItems}
									salesOrderId={salesOrderId}
								/>
								<StatusChangeLogCard entries={statusLog} />
							</div>
							<div className="flex min-w-0 flex-col gap-3">
								<ConsumablesCard lineItems={lineItems} services={services} />
								<HandsOnIncentivesCard
									appointmentId={appointment.id}
									lineItems={lineItems}
									incentives={incentives}
									allEmployees={allEmployees}
									onToast={showToast}
								/>
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
							entries={lineItems}
							services={services}
							products={products}
							taxes={taxes}
						/>
					)}

					{activeTab === "dental-assessment" && (
						<PlaceholderPanel title="Dental assessment" variant="tab" />
					)}

					{activeTab === "periodontal-charting" && (
						<PlaceholderPanel title="Periodontal charting" variant="tab" />
					)}

					{activeTab === "followup" && (
						<FollowUpTab
							appointment={appointment}
							followUps={followUps}
							allEmployees={allEmployees}
							editingFollowUpId={editingFollowUpId}
							onStartEdit={setEditingFollowUpId}
							onToast={showToast}
						/>
					)}

					{activeTab === "camera" && (
						<PlaceholderPanel title="Camera" variant="tab" />
					)}

					{activeTab === "documents" && (
						<DocumentsTab
							appointment={appointment}
							documents={customerDocuments}
							onToast={showToast}
						/>
					)}
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
					shifts={shifts}
				/>
			)}

			{activeTab === "overview" && (
				<FloatingActionBar
					appointment={appointment}
					lineItems={lineItems}
					services={services}
					taxes={taxes}
					onToast={showToast}
				/>
			)}

			<AppointmentToastStack toasts={toasts} onDismiss={dismissToast} />
		</div>
	);
}
