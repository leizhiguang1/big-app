import { FileCheck } from "lucide-react";
import type { MedicalCertificateWithRefs } from "@/lib/services/medical-certificates";

type Props = {
	medicalCertificates: MedicalCertificateWithRefs[];
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatDuration(days: number, halfDayPeriod: string | null): string {
	const whole = Math.floor(days);
	const hasHalf = Math.abs(days - whole) > 0.01;
	const base = `${whole} day${whole === 1 ? "" : "s"}`;
	if (!hasHalf) return base;
	return `${whole + 0.5} days${halfDayPeriod ? ` (${halfDayPeriod})` : ""}`;
}

export function CustomerMedicalCertificatesTab({ medicalCertificates }: Props) {
	if (medicalCertificates.length === 0) {
		return (
			<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
				No medical certificates issued.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{medicalCertificates.map((mc) => (
				<div
					key={mc.id}
					className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm"
				>
					<div className="flex items-start justify-between gap-3">
						<div className="flex items-center gap-2">
							<FileCheck className="size-4 text-sky-600" />
							<span className="font-mono font-semibold text-sm">{mc.code}</span>
							<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
								{mc.slip_type}
							</span>
						</div>
						<span className="font-semibold text-[11px] text-muted-foreground">
							{formatDuration(mc.duration_days, mc.half_day_period)}
						</span>
					</div>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
						<span>
							<span className="text-muted-foreground">From: </span>
							<span className="font-medium">{formatDate(mc.start_date)}</span>
						</span>
						<span>
							<span className="text-muted-foreground">To: </span>
							<span className="font-medium">{formatDate(mc.end_date)}</span>
						</span>
						{mc.issuing_employee && (
							<span className="text-muted-foreground">
								Issued by {mc.issuing_employee.first_name}{" "}
								{mc.issuing_employee.last_name}
							</span>
						)}
					</div>
					{mc.reason && (
						<div className="rounded-md bg-muted/50 px-3 py-2 text-[12px] leading-snug text-muted-foreground">
							{mc.reason}
						</div>
					)}
				</div>
			))}
		</div>
	);
}
