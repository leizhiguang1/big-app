import { Printer } from "lucide-react";
import type { MedicalCertificateWithRefs } from "@/lib/services/medical-certificates";

function formatMcDate(iso: string): string {
	const [y, m, d] = iso.split("-");
	return `${d}/${m}/${y}`;
}

function formatMcTime(t: string): string {
	return t.slice(0, 5);
}

function formatMcSummary(mc: MedicalCertificateWithRefs): string {
	if (mc.slip_type === "time_off") {
		const hours = Number(mc.duration_hours ?? 0);
		const hoursLabel = `${hours} hour${hours === 1 ? "" : "s"}`;
		if (mc.start_time && mc.end_time) {
			return `${hoursLabel} · ${formatMcDate(mc.start_date)} ${formatMcTime(
				mc.start_time,
			)}–${formatMcTime(mc.end_time)}`;
		}
		return `${hoursLabel} · ${formatMcDate(mc.start_date)}`;
	}
	const days = Number(mc.duration_days ?? 0);
	const whole = Math.floor(days);
	const hasHalf = Math.abs(days - whole) > 0.01;
	const dayLabel = hasHalf
		? `${whole + 0.5} days${mc.half_day_period ? ` (${mc.half_day_period})` : ""}`
		: `${whole} day${whole === 1 ? "" : "s"}`;
	const range = `${formatMcDate(mc.start_date)} → ${formatMcDate(mc.end_date)}`;
	return `${dayLabel} · ${range}`;
}

function McRow({ mc }: { mc: MedicalCertificateWithRefs }) {
	const summary = formatMcSummary(mc);
	return (
		<div className="flex items-center justify-between gap-2 py-2">
			<div className="flex min-w-0 flex-1 flex-col text-left">
				<div className="flex items-center gap-1.5">
					<span className="font-mono text-xs font-semibold">{mc.code}</span>
					<span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted-foreground">
						{mc.slip_type === "day_off" ? "Day off" : "Time off"}
					</span>
				</div>
				<span className="truncate text-[11px] text-muted-foreground">
					{summary}
				</span>
			</div>
			<a
				href={`/medical-certificates/${mc.id}`}
				target="_blank"
				rel="noreferrer"
				className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted"
				aria-label={`Print MC ${mc.code}`}
			>
				<Printer className="size-3" />
				Print
			</a>
		</div>
	);
}

export function McCard({
	medicalCertificates,
}: {
	medicalCertificates?: MedicalCertificateWithRefs[];
}) {
	if (!medicalCertificates || medicalCertificates.length === 0) return null;
	return (
		<>
			<div className="flex items-center justify-between">
				<div className="text-sm font-semibold tracking-wide text-blue-600">
					MEDICAL CERTIFICATE
				</div>
				<span className="text-[10px] font-medium tabular-nums text-muted-foreground">
					×{medicalCertificates.length}
				</span>
			</div>
			<div className="mt-2 divide-y divide-border/60 rounded-md border bg-white px-3">
				{medicalCertificates.map((mc) => (
					<McRow key={mc.id} mc={mc} />
				))}
			</div>
		</>
	);
}
