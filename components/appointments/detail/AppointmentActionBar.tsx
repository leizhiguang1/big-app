"use client";

import {
	Ban,
	Check,
	ListOrdered,
	Loader2,
	Pencil,
	Plus,
	Ticket,
	Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import { CancelAppointmentDialog } from "@/components/appointments/CancelAppointmentDialog";
import { CollectPaymentDialog } from "@/components/appointments/detail/CollectPaymentDialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	markAppointmentCompletedAction,
	revertCompletedAppointmentAction,
} from "@/lib/actions/appointments";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { BillingSettings } from "@/lib/services/billing-settings";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
import type { MedicalCertificateWithRefs } from "@/lib/services/medical-certificates";
import type { OutletWithRoomCount, Room } from "@/lib/services/outlets";
import type { PaymentMethod } from "@/lib/services/payment-methods";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";

type Props = {
	appointment: AppointmentWithRelations;
	lineItems: AppointmentLineItem[];
	services: ServiceWithCategory[];
	products: InventoryItemWithRefs[];
	taxes: Tax[];
	outletName: string | null;
	allEmployees: EmployeeWithRelations[];
	paymentMethods: PaymentMethod[];
	customers: CustomerWithRelations[];
	rosterEmployees: RosterEmployee[];
	rooms: Room[];
	allOutlets: OutletWithRoomCount[];
	shifts: EmployeeShift[];
	medicalCertificates: MedicalCertificateWithRefs[];
	billingSettings: BillingSettings;
	staffDiscountPercent: number;
	onEdit: () => void;
	onToast?: (
		message: string,
		variant?: "default" | "success" | "error",
	) => void;
};

// Mark Complete branches on line items + payment state. See
// docs/modules/02-appointments.md §Complete appointment workflow.
type CompletionPath = "direct" | "collect-payment";

function pickCompletionPath(
	appointment: AppointmentWithRelations,
	lineItems: AppointmentLineItem[],
): CompletionPath {
	if (lineItems.length === 0) return "direct";
	if (appointment.payment_status === "paid") return "direct";
	return "collect-payment";
}

function showDomToast(message: string, durationMs = 2000) {
	let container = document.getElementById("dom-toast-container");
	if (!container) {
		container = document.createElement("div");
		container.id = "dom-toast-container";
		container.className =
			"pointer-events-none fixed right-4 bottom-4 z-[10100] flex flex-col gap-1.5";
		document.body.appendChild(container);
	}
	const el = document.createElement("div");
	el.className =
		"pointer-events-auto flex max-w-[320px] items-center gap-2 rounded-md border bg-white px-2.5 py-1.5 text-left shadow-sm animate-in slide-in-from-bottom-2 fade-in";
	el.innerHTML = `<svg class="size-3.5 shrink-0 text-emerald-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span class="min-w-0 flex-1 text-xs">${message}</span>`;
	container.appendChild(el);
	setTimeout(() => {
		el.remove();
		if (container && container.children.length === 0) container.remove();
	}, durationMs);
}

const colorClass = {
	blue: "border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900",
	green:
		"border-green-300 bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900",
	sky: "border-sky-300 bg-sky-100 text-sky-800 hover:bg-sky-200 hover:text-sky-900",
	amber:
		"border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 hover:text-amber-900",
	red: "border-red-300 bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800",
	emerald:
		"border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 hover:text-emerald-900",
	slate:
		"border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-800",
} as const;

export function AppointmentActionBar({
	appointment,
	lineItems,
	services,
	products,
	taxes,
	outletName,
	allEmployees,
	paymentMethods,
	customers,
	rosterEmployees,
	rooms,
	allOutlets,
	shifts,
	medicalCertificates,
	billingSettings,
	staffDiscountPercent,
	onEdit,
	onToast,
}: Props) {
	const router = useRouter();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [collectOpen, setCollectOpen] = useState(false);
	const [revertOpen, setRevertOpen] = useState(false);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [newApptOpen, setNewApptOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	const isCompleted = appointment.status === "completed";
	const path = pickCompletionPath(appointment, lineItems);

	const handleCompleteConfirm = () => {
		setConfirmOpen(false);
		if (path === "collect-payment") {
			setCollectOpen(true);
			return;
		}
		startTransition(async () => {
			try {
				await markAppointmentCompletedAction(appointment.id);
				onToast?.("Appointment marked completed", "success");
				router.refresh();
			} catch (e) {
				const message = e instanceof Error ? e.message : "Failed to complete";
				onToast?.(message, "error");
			}
		});
	};

	const handleRevertConfirm = () => {
		setRevertOpen(false);
		startTransition(async () => {
			try {
				await revertCompletedAppointmentAction(appointment.id);
				onToast?.("Appointment reverted to pending", "success");
				router.refresh();
			} catch (e) {
				const message = e instanceof Error ? e.message : "Failed to revert";
				onToast?.(message, "error");
			}
		});
	};


	return (
		<>
			<div className="flex shrink-0 items-center gap-1.5">
				{isCompleted ? (
					<>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									className={colorClass.green}
									aria-label="Schedule next appointment for this customer"
									onClick={() => setNewApptOpen(true)}
								>
									<Plus />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								Schedule next appointment
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									className={colorClass.slate}
									onClick={() => setRevertOpen(true)}
									disabled={isPending}
									aria-label="Revert to pending"
								>
									{isPending ? <Loader2 className="animate-spin" /> : <Undo2 />}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">Revert to pending</TooltipContent>
						</Tooltip>
					</>
				) : (
					<>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									disabled
									className={colorClass.blue}
									aria-label="Print queue ticket — in development"
								>
									<span className="relative inline-flex">
										<Ticket />
										<span
											aria-hidden
											className="absolute -right-1 -top-1 size-1.5 rounded-full bg-amber-500 ring-1 ring-background"
										/>
									</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								Print queue ticket — in development
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									className={colorClass.green}
									aria-label="Create new appointment for this customer"
									onClick={() => setNewApptOpen(true)}
								>
									<Plus />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">New appointment</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									disabled
									className={colorClass.sky}
									aria-label="Add to queue — in development"
								>
									<span className="relative inline-flex">
										<ListOrdered />
										<span
											aria-hidden
											className="absolute -right-1 -top-1 size-1.5 rounded-full bg-amber-500 ring-1 ring-background"
										/>
									</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								Add to queue — in development
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									className={colorClass.amber}
									onClick={onEdit}
									aria-label="Edit appointment"
								>
									<Pencil />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">Edit appointment</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									className={colorClass.red}
									onClick={() => setCancelOpen(true)}
									disabled={isPending}
									aria-label="Cancel appointment"
								>
									<Ban />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">Cancel appointment</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									className={colorClass.emerald}
									onClick={() => setConfirmOpen(true)}
									disabled={isPending}
									aria-label="Complete appointment"
								>
									{isPending ? <Loader2 className="animate-spin" /> : <Check />}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								Complete appointment
							</TooltipContent>
						</Tooltip>
					</>
				)}
			</div>

			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Complete appointment?"
				description={
					path === "collect-payment"
						? "There are billing items on this appointment. You'll collect payment next."
						: lineItems.length === 0
							? "No billing items on this appointment. It will be marked complete directly."
							: "This appointment is already paid. It will be marked complete directly."
				}
				confirmLabel="Proceed"
				cancelLabel="Cancel"
				variant="default"
				onConfirm={handleCompleteConfirm}
			/>

			<ConfirmDialog
				open={revertOpen}
				onOpenChange={setRevertOpen}
				title="Revert appointment?"
				description="This will reopen the appointment for edits. Payment, sales order, and inventory movements are not affected — revert is about unlocking the chart, not refunding."
				confirmLabel="Revert"
				cancelLabel="Cancel"
				variant="default"
				onConfirm={handleRevertConfirm}
			/>

			<CancelAppointmentDialog
				open={cancelOpen}
				onOpenChange={setCancelOpen}
				appointmentId={appointment.id}
				bookingRef={appointment.booking_ref ?? undefined}
				onSuccess={() => {
					onToast?.("Appointment cancelled", "success");
					router.push("/appointments");
				}}
				onError={(message) => onToast?.(message, "error")}
				onReschedule={onEdit}
			/>

			<CollectPaymentDialog
				open={collectOpen}
				onOpenChange={setCollectOpen}
				appointment={appointment}
				entries={lineItems}
				services={services}
				products={products}
				taxes={taxes}
				outletName={outletName}
				allEmployees={allEmployees}
				paymentMethods={paymentMethods}
				customers={customers}
				rosterEmployees={rosterEmployees}
				rooms={rooms}
				allOutlets={allOutlets}
				shifts={shifts}
				medicalCertificates={medicalCertificates}
				billingSettings={billingSettings}
				staffDiscountPercent={staffDiscountPercent}
				onSuccess={(r) =>
					onToast?.(
						`Payment collected · ${r.so_number} / ${r.invoice_no}`,
						"success",
					)
				}
				onError={(m) => onToast?.(m, "error")}
			/>

			<AppointmentDialog
				open={newApptOpen}
				onClose={() => setNewApptOpen(false)}
				outletId={appointment.outlet_id}
				appointment={null}
				prefill={{
					startAt: new Date().toISOString(),
					endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
					employeeId: appointment.employee_id ?? null,
					roomId: null,
					customerId: appointment.customer_id ?? null,
				}}
				customers={customers}
				employees={rosterEmployees}
				rooms={rooms}
				allOutlets={allOutlets}
				allEmployees={allEmployees}
				shifts={shifts}
				hideBlockTab
				onSuccess={() => showDomToast("Appointment created")}
			/>
		</>
	);
}
