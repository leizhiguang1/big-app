"use client";

import { Check } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
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
import { createMedicalCertificateAction } from "@/lib/actions/medical-certificates";

type Props = {
	open: boolean;
	onClose: () => void;
	appointmentId: string;
	customerId: string;
	outletId: string;
	issuingEmployeeId: string | null;
	defaultStartDate: string;
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

function deriveEnd(startISO: string, duration: number, halfDay: boolean) {
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

export function AddMcDialog({
	open,
	onClose,
	appointmentId,
	customerId,
	outletId,
	issuingEmployeeId,
	defaultStartDate,
	onCreated,
}: Props) {
	const [slipType, setSlipType] = useState<"day_off" | "time_off">("day_off");
	const [startDate, setStartDate] = useState(defaultStartDate);
	const [duration, setDuration] = useState<number>(1);
	const [halfDayVisible, setHalfDayVisible] = useState(false);
	const [halfDay, setHalfDay] = useState(false);
	const [reason, setReason] = useState("");
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	const derived = useMemo(
		() => deriveEnd(startDate, duration, halfDay),
		[startDate, duration, halfDay],
	);

	const endLabel = derived.period
		? `${formatDmy(derived.endISO)} (${derived.period})`
		: formatDmy(derived.endISO);

	const durationLabel = useMemo(() => {
		const total = derived.totalDays;
		if (total === 0.5) return "Half day";
		const whole = Math.floor(total);
		const hasHalf = total - whole >= 0.5;
		const parts: string[] = [`${whole} day${whole === 1 ? "" : "s"}`];
		if (hasHalf) parts.push("and a half");
		return parts.join(" ");
	}, [derived.totalDays]);

	const submit = () => {
		setError(null);
		if (!startDate) return setError("Start date is required");
		if (!duration || duration <= 0) return setError("Duration is required");
		startTransition(async () => {
			try {
				const result = await createMedicalCertificateAction({
					appointment_id: appointmentId,
					customer_id: customerId,
					outlet_id: outletId,
					issuing_employee_id: issuingEmployeeId,
					slip_type: slipType,
					start_date: startDate,
					duration_days: halfDay ? duration + 0.5 : duration,
					has_half_day: halfDay,
					reason: reason.trim() || undefined,
				});
				onCreated(result);
				onClose();
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Could not save certificate",
				);
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
				<DialogHeader className="border-b px-5 py-3">
					<DialogTitle className="text-base">
						Add New Medical Certificate (MC)
					</DialogTitle>
					<DialogDescription className="text-xs">
						The certificate is linked to this appointment and customer.
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
								{endLabel}
							</div>
						</Field>
					</div>

					<Field label={`Duration (${durationLabel})`}>
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

					{!halfDayVisible ? (
						<button
							type="button"
							onClick={() => setHalfDayVisible(true)}
							className="self-start text-primary text-xs underline-offset-2 hover:underline"
						>
							Add on half day?
						</button>
					) : (
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={halfDay}
								onChange={(e) => setHalfDay(e.target.checked)}
								className="size-4"
							/>
							<span>Half Day</span>
						</label>
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
						{pending ? "Saving…" : "Save"}
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
