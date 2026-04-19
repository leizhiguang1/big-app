import { redirect } from "next/navigation";
import { getServerContext } from "@/lib/context/server";
import { NotFoundError } from "@/lib/errors";
import {
	CLINIC_HEADER,
	MC_FOOTER_NOTE,
} from "@/lib/medical-certificates/template";
import {
	getMedicalCertificate,
	type MedicalCertificateWithRefs,
} from "@/lib/services/medical-certificates";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

function formatDmy(iso: string): string {
	const [y, m, d] = iso.split("-");
	return `${d}/${m}/${y}`;
}

function formatDurationSentence(
	duration: number,
	hasHalf: boolean,
	period: string | null,
): string {
	const base = duration.toString().replace(/\.0$/, "");
	const suffix = hasHalf && period ? `(${period})` : "";
	const unit = duration === 1 ? "day" : "days";
	return `${base} ${unit}${suffix ? suffix : ""}`;
}

function formatHoursSentence(hours: number): string {
	const base = hours.toString().replace(/\.0$/, "");
	return `${base} hour${hours === 1 ? "" : "s"}`;
}

function formatTime(t: string): string {
	return t.slice(0, 5);
}

export default async function MedicalCertificatePrintPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const ctx = await getServerContext();
	if (!ctx.currentUser) redirect("/login");

	let mc: MedicalCertificateWithRefs;
	try {
		mc = await getMedicalCertificate(ctx, id);
	} catch (err) {
		if (err instanceof NotFoundError) {
			return (
				<div className="mx-auto max-w-xl p-12 text-center">
					<h1 className="font-semibold text-xl">
						Medical certificate not found
					</h1>
				</div>
			);
		}
		throw err;
	}

	const customerName = [mc.customer.first_name, mc.customer.last_name]
		.filter(Boolean)
		.join(" ")
		.toUpperCase();
	const issuerName = mc.issuing_employee
		? `${mc.issuing_employee.first_name} ${mc.issuing_employee.last_name}`.toUpperCase()
		: "—";
	const addressLine = [
		mc.outlet.address1,
		mc.outlet.address2,
		[mc.outlet.postcode, mc.outlet.city].filter(Boolean).join(" "),
		mc.outlet.state,
		mc.outlet.country,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<div className="min-h-screen bg-muted/30 print:bg-white">
			<style>{`
				@media print {
					.no-print { display: none !important; }
					@page { margin: 16mm; }
					body { background: white !important; }
				}
			`}</style>

			<div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm">
				<div className="text-sm">
					<span className="font-semibold">Medical Certificate</span>
					<span className="ml-2 text-muted-foreground">{mc.code}</span>
				</div>
				<PrintButton />
			</div>

			<div className="mx-auto my-8 max-w-3xl bg-white p-12 shadow-sm print:my-0 print:max-w-full print:p-0 print:shadow-none">
				<div className="flex items-start justify-between border-b pb-4">
					<div className="flex items-center gap-4">
						{/* biome-ignore lint/performance/noImgElement: print page, native img is fine */}
						<img
							src={CLINIC_HEADER.logoPath}
							alt="Clinic logo"
							className="size-20 object-contain"
						/>
						<div className="text-xs">
							<div className="font-bold text-sm uppercase">
								{mc.outlet.name}
							</div>
							<div className="font-semibold">
								{CLINIC_HEADER.groupName} {CLINIC_HEADER.registrationNumber}
							</div>
							<div className="mt-1 max-w-md text-muted-foreground">
								{addressLine}
							</div>
							{(mc.outlet.phone || mc.outlet.email) && (
								<div className="mt-1 text-muted-foreground">
									{mc.outlet.phone && <>TEL: {mc.outlet.phone}</>}
									{mc.outlet.phone && mc.outlet.email && " · "}
									{mc.outlet.email && <>EMAIL: {mc.outlet.email}</>}
								</div>
							)}
						</div>
					</div>
					<div className="text-right text-xs">
						<div className="text-muted-foreground">
							{formatDmy(mc.start_date)}
						</div>
					</div>
				</div>

				<div className="mt-6 text-center">
					<div className="inline-block border-y-2 border-foreground px-8 py-1 font-bold text-sm tracking-wider">
						MEDICAL CERTIFICATE
					</div>
					<div className="mt-1 text-right text-xs">REF NO: {mc.code}</div>
				</div>

				<div className="mt-8 space-y-4 text-sm leading-relaxed">
					<p>
						This is to certify that <strong>{customerName}</strong>
					</p>
					{mc.customer.id_number && (
						<p>
							Identification number: <strong>{mc.customer.id_number}</strong>
						</p>
					)}
					{mc.slip_type === "time_off" ? (
						<p>
							had undergo treatment in our dental clinic and is unfit for
							work/school for{" "}
							<strong>
								{formatHoursSentence(Number(mc.duration_hours ?? 0))}
							</strong>{" "}
							from <strong>{formatTime(mc.start_time ?? "")}</strong> to{" "}
							<strong>{formatTime(mc.end_time ?? "")}</strong> on{" "}
							<strong>{formatDmy(mc.start_date)}</strong>
						</p>
					) : (
						<p>
							had undergo treatment in our dental clinic and is unfit for
							work/school for{" "}
							<strong>
								{formatDurationSentence(
									Number(mc.duration_days ?? 0),
									mc.has_half_day,
									mc.half_day_period,
								)}
							</strong>{" "}
							from <strong>{formatDmy(mc.start_date)}</strong> to{" "}
							<strong>{formatDmy(mc.end_date)}</strong>
						</p>
					)}
					{mc.reason && (
						<p>
							Reason: <strong>{mc.reason}</strong>
						</p>
					)}
					<p className="text-muted-foreground text-xs italic">
						{MC_FOOTER_NOTE}
					</p>
				</div>

				<div className="mt-20 flex justify-end">
					<div className="w-56 text-center">
						<div className="border-foreground border-t pt-1 text-xs">
							Doctor Signature
						</div>
						<div className="mt-2 font-semibold text-sm">{issuerName}</div>
					</div>
				</div>
			</div>
		</div>
	);
}
