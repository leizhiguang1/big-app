"use client";

import { useCallback, useMemo, useState } from "react";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import {
	AppointmentToastStack,
	type Toast,
} from "@/components/appointments/AppointmentToastStack";
import { AppointmentActionBar } from "@/components/appointments/detail/AppointmentActionBar";
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
import type { BillingSettings } from "@/lib/services/billing-settings";
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
import type { MedicalCertificateWithRefs } from "@/lib/services/medical-certificates";
import type { OutletWithRoomCount, Room } from "@/lib/services/outlets";
import type { PaymentMethod } from "@/lib/services/payment-methods";
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
	paymentMethods: PaymentMethod[];
	medicalCertificates: MedicalCertificateWithRefs[];
	billingSettings: BillingSettings;
	staffDiscountPercent: number;
	fullCustomer: CustomerWithRelations | null;
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
	paymentMethods,
	medicalCertificates,
	billingSettings,
	staffDiscountPercent,
	fullCustomer,
}: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<DetailTabKey>("overview");
	const [toasts, setToasts] = useState<Toast[]>([]);
	const [headerCollapsed, setHeaderCollapsed] = useState(false);
	const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(
		null,
	);
	const [pendingEdit, setPendingEdit] = useState<{
		noteId: string;
		content: string;
	} | null>(null);

	const hasCustomer = !appointment.is_time_block && !!appointment.customer_id;
	const isCaseBillingTab = activeTab === "casenotes" || activeTab === "billing";
	const isFollowUpTab = activeTab === "followup";
	const showHistoryPanel = isCaseBillingTab && hasCustomer;
	const showFollowUpPanel = isFollowUpTab && hasCustomer;

	const showToast = useCallback(
		(
			message: string,
			variant: Toast["variant"] = "default",
			durationMs = 2000,
		) => {
			const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			setToasts((prev) => [...prev, { id, message, variant }]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, durationMs);
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
			<div className="flex items-center justify-between gap-3">
				<DetailHeader
					appointment={appointment}
					summaryCollapsed={headerCollapsed}
					onToggleSummaryCollapse={
						appointment.is_time_block
							? undefined
							: () => setHeaderCollapsed((v) => !v)
					}
				/>
				<AppointmentActionBar
					appointment={appointment}
					lineItems={lineItems}
					services={services}
					products={products}
					taxes={taxes}
					outletName={outletName}
					allEmployees={allEmployees}
					paymentMethods={paymentMethods}
					customers={customers}
					rosterEmployees={employees}
					rooms={rooms}
					allOutlets={allOutlets}
					shifts={shifts}
					medicalCertificates={medicalCertificates}
					billingSettings={billingSettings}
					staffDiscountPercent={staffDiscountPercent}
					onEdit={() => setEditOpen(true)}
					onToast={showToast}
				/>
			</div>

			<div className="flex gap-3">
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
								fullCustomer={fullCustomer}
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
									onReschedule={() => setEditOpen(true)}
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
							medicalCertificates={medicalCertificates}
							onToast={showToast}
							pendingEdit={pendingEdit}
							onPendingEditHandled={() => setPendingEdit(null)}
						/>
					)}

					{activeTab === "billing" && (
						<BillingTab
							appointmentId={appointment.id}
							entries={lineItems}
							services={services}
							products={products}
							taxes={taxes}
							frontdeskMessage={appointment.frontdesk_message}
							isLead={!appointment.is_time_block && !appointment.customer_id}
							isBlock={appointment.is_time_block}
							customer={appointment.customer}
							billingSettings={billingSettings}
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

				{(showHistoryPanel || showFollowUpPanel) && (
					<aside className="sticky top-4 hidden h-[calc(100vh-8rem)] w-[340px] shrink-0 lg:block">
						{showHistoryPanel ? (
							<HistoryPanel
								currentAppointmentId={appointment.id}
								caseNotes={caseNotes}
								customerBillingHistory={customerLineItemsHistory}
								customerHistory={customerHistory}
								onToast={showToast}
								onEditNote={(noteId, content) => {
									setActiveTab("casenotes");
									setPendingEdit({ noteId, content });
								}}
							/>
						) : (
							<FollowUpHistoryPanel
								currentAppointmentId={appointment.id}
								followUps={followUps}
								customerHistory={customerHistory}
								onToast={showToast}
								onEdit={(f) => setEditingFollowUpId(f.id)}
							/>
						)}
					</aside>
				)}
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

			<AppointmentToastStack toasts={toasts} onDismiss={dismissToast} />
		</div>
	);
}
