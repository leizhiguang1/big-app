"use client";

import { Ban, ExternalLink, Pencil, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
	AppointmentToastStack,
	type Toast,
} from "@/components/appointments/AppointmentToastStack";
import { AddMcDialog } from "@/components/medical-certificates/AddMcDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cancelMedicalCertificateAction } from "@/lib/actions/medical-certificates";
import type { MedicalCertificateWithRefs } from "@/lib/services/medical-certificates";
import { cn } from "@/lib/utils";

type Props = {
	customerId: string;
	outletId: string;
	issuingEmployeeId: string | null;
	medicalCertificates: MedicalCertificateWithRefs[];
};

function formatDateTime(iso: string): string {
	const d = new Date(iso);
	const date = d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
	const time = d.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});
	return `${date} ${time}`;
}

function formatDate(iso: string): string {
	const [y, m, d] = iso.split("-");
	return `${d}/${m}/${y}`;
}

function formatTime(t: string | null): string {
	if (!t) return "";
	const [h, m] = t.split(":");
	const hh = Number(h);
	const period = hh >= 12 ? "PM" : "AM";
	const display = hh % 12 === 0 ? 12 : hh % 12;
	return `${String(display).padStart(2, "0")}:${m} ${period}`;
}

function startCellLabel(mc: MedicalCertificateWithRefs): {
	primary: string;
	secondary: string | null;
} {
	if (mc.slip_type === "time_off") {
		return {
			primary: formatDate(mc.start_date),
			secondary: formatTime(mc.start_time),
		};
	}
	return { primary: formatDate(mc.start_date), secondary: "12:00 AM" };
}

function endCellLabel(mc: MedicalCertificateWithRefs): {
	primary: string;
	secondary: string | null;
} {
	if (mc.slip_type === "time_off") {
		return {
			primary: formatDate(mc.start_date),
			secondary: formatTime(mc.end_time),
		};
	}
	const period = mc.half_day_period
		? mc.half_day_period === "AM"
			? " (AM)"
			: " (PM)"
		: "";
	return {
		primary: `${formatDate(mc.end_date)}${period}`,
		secondary: "12:00 PM",
	};
}

export function CustomerMedicalCertificatesTab({
	customerId,
	outletId,
	issuingEmployeeId,
	medicalCertificates,
}: Props) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [addOpen, setAddOpen] = useState(false);
	const [editing, setEditing] = useState<MedicalCertificateWithRefs | null>(
		null,
	);
	const [cancelTarget, setCancelTarget] =
		useState<MedicalCertificateWithRefs | null>(null);
	const [toasts, setToasts] = useState<Toast[]>([]);

	const showToast = useCallback(
		(message: string, variant: Toast["variant"] = "default") => {
			const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			setToasts((prev) => [...prev, { id, message, variant }]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, 2200);
		},
		[],
	);

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const refresh = () => startTransition(() => router.refresh());

	const confirmCancel = () => {
		if (!cancelTarget) return;
		const id = cancelTarget.id;
		const code = cancelTarget.code;
		startTransition(async () => {
			try {
				await cancelMedicalCertificateAction(id);
				setCancelTarget(null);
				showToast(`Medical certificate ${code} cancelled`, "success");
				refresh();
			} catch (err) {
				showToast(
					err instanceof Error ? err.message : "Could not cancel certificate",
					"error",
				);
			}
		});
	};

	const columns: DataTableColumn<MedicalCertificateWithRefs>[] = [
		{
			key: "actions_left",
			header: "",
			align: "center",
			headerClassName: "w-12",
			className: "w-12",
			cell: (mc) => (
				<Tooltip>
					<TooltipTrigger asChild>
						<Link
							href={`/medical-certificates/${mc.id}?print=1`}
							target="_blank"
							rel="noopener"
							aria-label="Print certificate"
							className={cn(
								"inline-flex size-7 items-center justify-center rounded-md transition",
								mc.cancelled_at
									? "bg-muted text-muted-foreground hover:bg-muted/80"
									: "bg-sky-600 text-white shadow-sm hover:bg-sky-700",
							)}
						>
							<Printer className="size-3.5" />
						</Link>
					</TooltipTrigger>
					<TooltipContent>Print</TooltipContent>
				</Tooltip>
			),
		},
		{
			key: "date",
			header: "Date",
			sortable: true,
			sortValue: (mc) => mc.created_at,
			cell: (mc) => (
				<span className="whitespace-nowrap text-xs">
					{formatDateTime(mc.created_at)}
				</span>
			),
		},
		{
			key: "code",
			header: "Reference",
			sortable: true,
			sortValue: (mc) => mc.code,
			cell: (mc) => (
				<Link
					href={`/medical-certificates/${mc.id}`}
					target="_blank"
					rel="noopener"
					className="font-mono font-semibold text-sky-600 text-xs hover:underline"
				>
					{mc.code}
				</Link>
			),
		},
		{
			key: "appointment",
			header: "Appointment",
			sortable: true,
			sortValue: (mc) => mc.appointment?.booking_ref ?? "",
			cell: (mc) =>
				mc.appointment ? (
					<Link
						href={`/appointments/${mc.appointment.booking_ref}`}
						target="_blank"
						rel="noopener"
						className="inline-flex items-center gap-1 font-mono font-semibold text-sky-600 text-xs hover:underline"
					>
						{mc.appointment.booking_ref}
						<ExternalLink className="size-3" />
					</Link>
				) : (
					<span className="text-muted-foreground">—</span>
				),
		},
		{
			key: "start",
			header: "Start Date",
			sortable: true,
			sortValue: (mc) => `${mc.start_date} ${mc.start_time ?? "00:00"}`,
			cell: (mc) => {
				const { primary, secondary } = startCellLabel(mc);
				return (
					<div className="flex flex-col text-xs leading-tight">
						<span>{primary}</span>
						{secondary && (
							<span className="text-muted-foreground">{secondary}</span>
						)}
					</div>
				);
			},
		},
		{
			key: "end",
			header: "End Date",
			sortable: true,
			sortValue: (mc) => `${mc.end_date} ${mc.end_time ?? "00:00"}`,
			cell: (mc) => {
				const { primary, secondary } = endCellLabel(mc);
				return (
					<div className="flex flex-col text-xs leading-tight">
						<span>{primary}</span>
						{secondary && (
							<span className="text-muted-foreground">{secondary}</span>
						)}
					</div>
				);
			},
		},
		{
			key: "processed_by",
			header: "Processed By",
			cell: (mc) => {
				const issuer = mc.issuing_employee
					? `${mc.issuing_employee.first_name} ${mc.issuing_employee.last_name}`.toUpperCase()
					: "—";
				const cancelledBy = mc.cancelled_by_employee
					? `${mc.cancelled_by_employee.first_name} ${mc.cancelled_by_employee.last_name}`.toUpperCase()
					: null;
				return (
					<div className="flex flex-col gap-0.5 text-xs leading-tight">
						<span className="font-semibold">{issuer}</span>
						{mc.cancelled_at && (
							<span className="text-[11px] text-rose-600">
								Cancelled
								{cancelledBy ? (
									<>
										{" "}
										by <span className="font-semibold">{cancelledBy}</span>
									</>
								) : null}{" "}
								on {formatDateTime(mc.cancelled_at)}
							</span>
						)}
					</div>
				);
			},
		},
		{
			key: "actions_right",
			header: "",
			align: "right",
			headerClassName: "w-24",
			className: "w-24",
			cell: (mc) => {
				const isCancelled = !!mc.cancelled_at;
				return (
					<div className="flex items-center justify-end gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="Edit certificate"
									onClick={() => setEditing(mc)}
									disabled={isCancelled}
									className="inline-flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-background"
								>
									<Pencil className="size-3.5" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								{isCancelled ? "Cancelled — cannot edit" : "Edit"}
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="Cancel certificate"
									onClick={() => setCancelTarget(mc)}
									disabled={isCancelled}
									className="inline-flex size-7 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-rose-50"
								>
									<Ban className="size-3.5" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								{isCancelled ? "Already cancelled" : "Cancel"}
							</TooltipContent>
						</Tooltip>
					</div>
				);
			},
		},
	];

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3">
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							aria-label="New medical certificate"
							onClick={() => setAddOpen(true)}
							className="flex size-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600"
						>
							<Plus className="size-5" />
						</button>
					</TooltipTrigger>
					<TooltipContent>New medical certificate</TooltipContent>
				</Tooltip>
			</div>

			<DataTable<MedicalCertificateWithRefs>
				data={medicalCertificates}
				columns={columns}
				getRowKey={(mc) => mc.id}
				searchKeys={["code"]}
				searchPlaceholder="Search reference…"
				emptyMessage="No medical certificates issued."
				rowClassName={(mc) => (mc.cancelled_at ? "bg-rose-50/40" : undefined)}
				defaultPageSize={10}
				minWidth={840}
			/>

			<AddMcDialog
				open={addOpen || !!editing}
				onClose={() => {
					setAddOpen(false);
					setEditing(null);
				}}
				appointmentId={editing?.appointment_id ?? null}
				customerId={customerId}
				outletId={outletId}
				issuingEmployeeId={issuingEmployeeId}
				defaultStartDate={new Date().toISOString().slice(0, 10)}
				editing={editing}
				onCreated={(result) => {
					showToast(
						editing
							? `Medical certificate ${result.code} updated`
							: `Medical certificate ${result.code} saved`,
						"success",
					);
					refresh();
				}}
			/>

			<ConfirmDialog
				open={!!cancelTarget}
				onOpenChange={(o) => !o && setCancelTarget(null)}
				title="Cancel medical certificate?"
				description={
					cancelTarget
						? `Cancelling ${cancelTarget.code} cannot be undone. The certificate will remain on record but marked as cancelled.`
						: undefined
				}
				confirmLabel="Cancel certificate"
				cancelLabel="Keep"
				pending={pending}
				onConfirm={confirmCancel}
			/>

			<AppointmentToastStack toasts={toasts} onDismiss={dismissToast} />
		</div>
	);
}
