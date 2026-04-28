import type { Brand } from "@/lib/services/brands";
import {
	defaultBeingPaymentOf,
	defaultCustomerName,
	type ReceiptDetail,
} from "@/lib/services/receipts";
import { publicMediaUrl } from "@/lib/services/storage";

type Props = {
	receipt: ReceiptDetail;
	brand: Brand | null;
	customerNameOverride?: string;
	remarksOverride?: string;
	bare?: boolean;
};

function money(n: number | string | null | undefined): string {
	const v = typeof n === "string" ? Number(n) : (n ?? 0);
	return Number.isFinite(v)
		? v.toLocaleString("en-MY", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})
		: "0.00";
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function fullName(
	first: string | null | undefined,
	last: string | null | undefined,
	salutation?: string | null,
): string {
	return [salutation, first, last]
		.filter(Boolean)
		.map((p) => String(p).trim())
		.join(" ")
		.toUpperCase();
}

function customerAddressLine(
	c: ReceiptDetail["salesOrder"]["customer"],
): string {
	if (!c) return "";
	const parts = [
		c.address1,
		c.address2,
		[c.postcode, c.city, c.state].filter(Boolean).join(" ").trim(),
		c.address_country,
	]
		.filter(Boolean)
		.map((p) => String(p).trim())
		.filter(Boolean);
	return parts.join(", ").toUpperCase();
}

function outletAddressLines(outlet: ReceiptDetail["outlet"]): string[] {
	const lines: string[] = [];
	if (outlet.address1) lines.push(outlet.address1.toUpperCase());
	if (outlet.address2) lines.push(outlet.address2.toUpperCase());
	const cityLine = [outlet.postcode, outlet.city, outlet.state]
		.filter(Boolean)
		.join(", ")
		.trim();
	if (cityLine) lines.push(`${cityLine}.`.toUpperCase());
	return lines;
}

export function PrintableReceipt({
	receipt,
	brand,
	customerNameOverride,
	remarksOverride,
	bare,
}: Props) {
	const logoSrc =
		publicMediaUrl(receipt.outlet.logo_url) ?? publicMediaUrl(brand?.logo_url);
	const showRegNumber = receipt.outlet.show_reg_number_on_invoice;
	const regName =
		receipt.outlet.company_reg_name ??
		brand?.registered_name ??
		brand?.name ??
		null;
	const regNumber =
		(showRegNumber ? receipt.outlet.company_reg_number : null) ??
		brand?.registration_number ??
		null;
	const customerName =
		customerNameOverride ??
		receipt.customer_name_override ??
		defaultCustomerName(receipt.salesOrder.customer);

	const beingPaymentOf =
		remarksOverride ??
		receipt.remarks_override ??
		defaultBeingPaymentOf(receipt.salesOrder.items);

	const consultant = receipt.salesOrder.consultant
		? fullName(
				receipt.salesOrder.consultant.first_name,
				receipt.salesOrder.consultant.last_name,
			)
		: "—";

	const servedBy = receipt.payment.processed_by
		? fullName(
				receipt.payment.processed_by.first_name,
				receipt.payment.processed_by.last_name,
			)
		: "—";

	const paymentMode =
		receipt.payment.method?.name ?? receipt.payment.payment_mode;

	const balance = receipt.salesOrder.outstanding;
	const ordinalSuffix = ordinal(receipt.payment.ordinal);

	const customerAddress = customerAddressLine(receipt.salesOrder.customer);

	const sheet = (
		<div className="receipt-sheet mx-auto max-w-[640px] bg-white p-8 text-[11px] text-zinc-900 print:p-0 print:text-[10px]">
			<header className="rounded-md bg-sky-50/40 p-4 text-center">
				<div className="flex items-start justify-between">
					<div className="size-10 shrink-0">
						{logoSrc ? (
							// biome-ignore lint/performance/noImgElement: print page, native img is fine
							<img
								src={logoSrc}
								alt={receipt.outlet.name ?? brand?.name ?? "Logo"}
								className="size-10 object-contain"
							/>
						) : (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								className="size-10 text-sky-300"
								aria-hidden
							>
								<title>Logo placeholder</title>
								<rect x="3" y="3" width="18" height="18" rx="2" />
								<path d="m3 16 5-5 4 4 3-3 6 6" />
								<circle cx="9" cy="9" r="1.5" />
							</svg>
						)}
					</div>
					<div className="flex-1">
						<div className="font-semibold text-[13px] uppercase tracking-wide">
							{receipt.outlet.name}
						</div>
						{regName && (
							<div className="font-semibold uppercase">
								{regName}
								{regNumber ? ` (${regNumber})` : ""}
							</div>
						)}
						<div className="mt-1 space-y-0.5 text-[10px] text-zinc-700">
							{outletAddressLines(receipt.outlet).map((line) => (
								<div key={line}>{line}</div>
							))}
							{receipt.outlet.email && (
								<div>EMAIL: {receipt.outlet.email.toUpperCase()}</div>
							)}
							{receipt.outlet.phone && <div>TEL: {receipt.outlet.phone}</div>}
						</div>
					</div>
					<div className="w-12 text-right text-[10px] text-zinc-700">
						DATE:
						<br />
						{formatDate(receipt.payment.paid_at)}
					</div>
				</div>
				<div className="mt-3 flex items-end justify-between border-zinc-300 border-t pt-2">
					<div className="font-semibold text-[13px] underline">
						Official Receipt
					</div>
					<div className="text-[11px] text-zinc-700">
						RECEIPT #: {receipt.receipt_no}
					</div>
				</div>
			</header>

			<table className="mt-2 w-full border-collapse text-[11px]">
				<tbody>
					<tr className="border-zinc-200 border-b align-top">
						<td className="w-[140px] py-1.5 pl-1 text-zinc-700">
							Received From
						</td>
						<td className="py-1.5">
							<div>{customerName}</div>
							{customerAddress && <div>{customerAddress}</div>}
						</td>
					</tr>
					<tr className="border-zinc-200 border-b align-top">
						<td className="py-1.5 pl-1 text-zinc-700">The Sum of</td>
						<td className="py-1.5">
							MYR {money(receipt.payment.amount)} No.{receipt.payment.ordinal}
							{ordinalSuffix} Payment. (Balance: MYR {money(balance)})
						</td>
					</tr>
					<tr className="border-zinc-200 border-b align-top">
						<td className="py-1.5 pl-1 text-zinc-700">Being Payment of</td>
						<td className="whitespace-pre-wrap py-1.5">{beingPaymentOf}</td>
					</tr>
					<tr className="border-zinc-200 border-b align-top">
						<td className="py-1.5 pl-1 text-zinc-700">Payment Mode</td>
						<td className="py-1.5">{paymentMode}</td>
					</tr>
					<tr className="border-zinc-200 border-b align-top">
						<td className="py-1.5 pl-1 text-zinc-700">Served By</td>
						<td className="py-1.5">{servedBy}</td>
					</tr>
					<tr className="border-zinc-200 border-b align-top">
						<td className="py-1.5 pl-1 text-zinc-700">Consultant</td>
						<td className="py-1.5">{consultant}</td>
					</tr>
					<tr className="align-top">
						<td className="py-3 pl-1 text-zinc-700">Terms &amp; Conditions</td>
						<td className="py-3">Goods sold are not refundable.</td>
					</tr>
				</tbody>
			</table>
		</div>
	);

	if (bare) return sheet;

	return (
		<>
			{sheet}
			<style>{`
				@media print {
					@page { size: A5; margin: 10mm; }
					html, body { background: white !important; }
					body * { visibility: hidden !important; }
					.receipt-sheet, .receipt-sheet * { visibility: visible !important; }
					.receipt-sheet {
						position: absolute; top: 0; left: 0; width: 100%;
						box-shadow: none !important; margin: 0 !important; max-width: none !important; padding: 0 !important;
					}
				}
			`}</style>
		</>
	);
}

function ordinal(n: number): string {
	const v = n % 100;
	if (v >= 11 && v <= 13) return "th";
	switch (n % 10) {
		case 1:
			return "st";
		case 2:
			return "nd";
		case 3:
			return "rd";
		default:
			return "th";
	}
}
