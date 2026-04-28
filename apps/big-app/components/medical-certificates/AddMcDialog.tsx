"use client";

import { Check } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	createMedicalCertificateAction,
	updateMedicalCertificateAction,
} from "@/lib/actions/medical-certificates";
import type { MedicalCertificateWithRefs } from "@/lib/services/medical-certificates";

type Props = {
	open: boolean;
	onClose: () => void;
	appointmentId: string | null;
	customerId: string;
	outletId: string;
	issuingEmployeeId: string | null;
	defaultStartDate: string;
	editing?: MedicalCertificateWithRefs | null;
	onCreated: (result: { id: string; code: string }) => void;
};

function addDaysISO(startISO: string, wholeDays: number): string {
	const [y, m, d] = startISO.split("-").map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	dt.setUTCDate(dt.getUTCDate() + wholeDays);
	return dt.toISOString().slice(0, 10);
}

function formatDmy(iso: string): string {
	const [y, m, d] = iso.split("-");
	return `${d}/${m}/${y}`;
}

function deriveDayOffEnd(startISO: string, duration: number, halfDay: boolean) {
	const total = halfDay ? duration + 0.5 : duration;
	const frac = Math.abs(total - Math.floor(total)) > 0.01;
	const offset = frac ? Math.floor(total) : Math.floor(total) - 1;
	const endISO = addDaysISO(startISO, Math.max(0, offset));
	return {
		endISO,
		period: frac ? ("AM" as const) : null,
		totalDays: total,
	};
}

function addMinutesToTime(hhmm: string, minutes: number): string {
	const [h, m] = hhmm.split(":").map(Number);
	const total = h * 60 + m + minutes;
	const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
	const hh = Math.floor(wrapped / 60);
	const mm = wrapped % 60;
	return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function deriveDayOffDuration(mc: MedicalCertificateWithRefs): {
	whole: number;
	halfDay: boolean;
} {
	const total = Number(mc.duration_days ?? 0);
	const halfDay = Math.abs(total - Math.floor(total)) > 0.01;
	const whole = halfDay ? Math.floor(total) : total;
	return { whole, halfDay };
}

export function AddMcDialog({
	open,
	onClose,
	appointmentId,
	customerId,
	outletId,
	issuingEmployeeId,
	defaultStartDate,
	editing,
	onCreated,
}: Props) {
	const isEdit = !!editing;

	const [slipType, setSlipType] = useState<"day_off" | "time_off">("day_off");
	const [startDate, setStartDate] = useState(defaultStartDate);

	const [duration, setDuration] = useState<number>(1);
	const [halfDay, setHalfDay] = useState(false);

	const [startDateTime, setStartDateTime] = useState(
		`${defaultStartDate}T09:00`,
	);
	const [durationHours, setDurationHours] = useState<number>(1);

	const [reason, setReason] = useState("");
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setError(null);
		if (editing) {
			setSlipType(editing.slip_type as "day_off" | "time_off");
			setStartDate(editing.start_date);
			setReason(editing.reason ?? "");
			if (editing.slip_type === "day_off") {
				const { whole, halfDay: hd } = deriveDayOffDuration(editing);
				setDuration(whole > 0 ? whole : 1);
				setHalfDay(hd);
			} else {
				const t = (editing.start_time ?? "09:00").slice(0, 5);
				setStartDateTime(`${editing.start_date}T${t}`);
				setDurationHours(Number(editing.duration_hours ?? 1));
			}
			return;
		}
		setSlipType("day_off");
		setStartDate(defaultStartDate);
		setDuration(1);
		setHalfDay(false);
		setStartDateTime(`${defaultStartDate}T09:00`);
		setDurationHours(1);
		setReason("");
	}, [open, editing, defaultStartDate]);

	const dayOffDerived = useMemo(
		() => deriveDayOffEnd(startDate, duration, halfDay),
		[startDate, duration, halfDay],
	);

	const dayOffEndLabel = dayOffDerived.period
		? `${formatDmy(dayOffDerived.endISO)} (${dayOffDerived.period})`
		: formatDmy(dayOffDerived.endISO);

	const dayOffDurationLabel = useMemo(() => {
		const total = dayOffDerived.totalDays;
		if (total === 0.5) return "Half day";
		const whole = Math.floor(total);
		const hasHalf = total - whole >= 0.5;
		const parts: string[] = [`${whole} day${whole === 1 ? "" : "s"}`];
		if (hasHalf) parts.push("and a half");
		return parts.join(" ");
	}, [dayOffDerived.totalDays]);

	const timeOffParts = useMemo(() => {
		const [datePart, timePart] = startDateTime.split("T");
		if (!datePart || !timePart) return null;
		const normalizedTime = timePart.slice(0, 5);
		if (!/^\d{2}:\d{2}$/.test(normalizedTime)) return null;
		if (!durationHours || durationHours <= 0) return null;
		const endTime = addMinutesToTime(
			normalizedTime,
			Math.round(durationHours * 60),
		);
		return { date: datePart, startTime: normalizedTime, endTime };
	}, [startDateTime, durationHours]);

	const timeOffEndLabel = timeOffParts
		? `Ends at ${timeOffParts.endTime}`
		: "—";

	const submit = () => {
		setError(null);

		if (slipType === "day_off") {
			if (!startDate) return setError("Start date is required");
			if (!duration || duration <= 0) return setError("Duration is required");
			startTransition(async () => {
				try {
					if (isEdit && editing) {
						const result = await updateMedicalCertificateAction(editing.id, {
							issuing_employee_id:
								editing.issuing_employee_id ?? issuingEmployeeId,
							slip_type: "day_off",
							start_date: startDate,
							duration_days: halfDay ? duration + 0.5 : duration,
							has_half_day: halfDay,
							reason: reason.trim() || undefined,
						});
						onCreated(result);
					} else {
						const result = await createMedicalCertificateAction({
							appointment_id: appointmentId,
							customer_id: customerId,
							outlet_id: outletId,
							issuing_employee_id: issuingEmployeeId,
							slip_type: "day_off",
							start_date: startDate,
							duration_days: halfDay ? duration + 0.5 : duration,
							has_half_day: halfDay,
							reason: reason.trim() || undefined,
						});
						onCreated(result);
					}
					onClose();
				} catch (err) {
					setError(
						err instanceof Error ? err.message : "Could not save certificate",
					);
				}
			});
			return;
		}

		if (!timeOffParts)
			return setError("Start date/time and a positive duration are required");

		startTransition(async () => {
			try {
				if (isEdit && editing) {
					const result = await updateMedicalCertificateAction(editing.id, {
						issuing_employee_id:
							editing.issuing_employee_id ?? issuingEmployeeId,
						slip_type: "time_off",
						start_date: timeOffParts.date,
						start_time: timeOffParts.startTime,
						end_time: timeOffParts.endTime,
						duration_hours: durationHours,
						reason: reason.trim() || undefined,
					});
					onCreated(result);
				} else {
					const result = await createMedicalCertificateAction({
						appointment_id: appointmentId,
						customer_id: customerId,
						outlet_id: outletId,
						issuing_employee_id: issuingEmployeeId,
						slip_type: "time_off",
						start_date: timeOffParts.date,
						start_time: timeOffParts.startTime,
						end_time: timeOffParts.endTime,
						duration_hours: durationHours,
						reason: reason.trim() || undefined,
					});
					onCreated(result);
				}
				onClose();
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Could not save certificate",
				);
			}
		});
	};

	const title = isEdit
		? "Edit Medical Certificate (MC)"
		: "Add New Medical Certificate (MC)";
	const description = appointmentId
		? "The certificate is linked to this appointment and customer."
		: "The certificate is linked to this customer.";

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent
				preventOutsideClose
				className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
			>
				<DialogHeader className="border-b px-5 py-3">
					<DialogTitle className="text-base">{title}</DialogTitle>
					<DialogDescription className="text-xs">
						{description}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 p-5">
					<div className="flex items-center gap-6">
						<SlipTypeOption
							active={slipType === "day_off"}
							onClick={() => setSlipType("day_off")}
							label="Day-Off Slip"
						/>
						<SlipTypeOption
							active={slipType === "time_off"}
							onClick={() => setSlipType("time_off")}
							label="Time-Off Slip"
						/>
					</div>

					{slipType === "day_off" ? (
						<>
							<div className="grid grid-cols-2 gap-3">
								<Field label="Start (Date)">
									<Input
										type="date"
										value={startDate}
										onChange={(e) => setStartDate(e.target.value)}
									/>
								</Field>
								<Field label="End">
									<div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-muted-foreground text-sm">
										{dayOffEndLabel}
									</div>
								</Field>
							</div>

							<Field label={`Duration (${dayOffDurationLabel})`}>
								<Input
									type="number"
									min={0.5}
									step={0.5}
									value={duration}
									onChange={(e) =>
										setDuration(Number.parseFloat(e.target.value || "0"))
									}
								/>
							</Field>

							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={halfDay}
									onChange={(e) => setHalfDay(e.target.checked)}
									className="size-4"
								/>
								<span>Add a half day</span>
							</label>
						</>
					) : (
						<>
							<div className="grid grid-cols-2 gap-3">
								<Field label="Start Date & Time">
									<Input
										type="datetime-local"
										value={startDateTime}
										onChange={(e) => setStartDateTime(e.target.value)}
									/>
								</Field>
								<Field label="Duration (hours)">
									<Input
										type="number"
										min={0.5}
										step={0.5}
										value={durationHours}
										onChange={(e) =>
											setDurationHours(Number.parseFloat(e.target.value || "0"))
										}
									/>
								</Field>
							</div>

							<div className="text-muted-foreground text-xs">
								{timeOffEndLabel}
							</div>
						</>
					)}

					<Field label="Reason">
						<textarea
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							rows={4}
							placeholder="Add Reason"
							className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						/>
					</Field>

					{error && <p className="text-destructive text-sm">{error}</p>}
				</div>

				<DialogFooter className="flex items-center justify-end gap-2 border-t bg-muted/20 px-4 py-3">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onClose}
						disabled={pending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={submit}
						disabled={pending}
						className="gap-1"
					>
						<Check className="size-4" />
						{pending ? "Saving…" : isEdit ? "Update" : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function SlipTypeOption({
	active,
	onClick,
	label,
}: {
	active: boolean;
	onClick: () => void;
	label: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-2 text-sm"
		>
			<span
				className={`flex size-5 items-center justify-center rounded-full border-2 ${active ? "border-primary" : "border-muted-foreground/40"}`}
			>
				{active && <span className="size-2.5 rounded-full bg-primary" />}
			</span>
			{label}
		</button>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</span>
			{children}
		</div>
	);
}
