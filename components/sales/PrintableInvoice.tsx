import { Mail, MapPin, Phone } from "lucide-react";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type { Outlet } from "@/lib/services/outlets";
import type {
	PaymentWithProcessedBy,
	SaleItem,
	SalesOrderWithRelations,
} from "@/lib/services/sales";

type Props = {
	order: SalesOrderWithRelations;
	items: SaleItem[];
	payments: PaymentWithProcessedBy[];
	outlet: Outlet | null;
	customer: CustomerWithRelations | null;
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

function formatDate(iso: string | null | undefined): string {
	if (!iso) return "—";
	const d = new Date(iso);
	return d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function customerAddressLine(c: CustomerWithRelations | null): string {
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

function outletAddressLine(outlet: Outlet | null): string {
	if (!outlet) return "";
	const parts = [
		outlet.address1,
		outlet.address2,
		[outlet.postcode, outlet.city, outlet.state]
			.filter(Boolean)
			.join(" ")
			.trim(),
		outlet.country,
	]
		.filter(Boolean)
		.map((p) => String(p).trim())
		.filter(Boolean);
	return parts.join(", ").toUpperCase();
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

export function PrintableInvoice({
	order,
	items,
	payments,
	outlet,
	customer,
}: Props) {
	const customerName = customer
		? fullName(customer.first_name, customer.last_name, customer.salutation)
		: order.customer
			? fullName(order.customer.first_name, order.customer.last_name)
			: "WALK-IN";

	const subtotal = Number(order.subtotal ?? 0);
	const discount = Number(order.discount ?? 0);
	const total = Number(order.total ?? 0);
	const amountPaid = Number(order.amount_paid ?? 0);
	const outstanding = Number(order.outstanding ?? 0);

	const latestPayment = payments[payments.length - 1] ?? null;
	const headerInvoiceNo = latestPayment?.invoice_no ?? "—";

	const tendered = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);

	const servedBy = latestPayment?.processed_by_employee
		? fullName(
				latestPayment.processed_by_employee.first_name,
				latestPayment.processed_by_employee.last_name,
			)
		: order.consultant
			? fullName(order.consultant.first_name, order.consultant.last_name)
			: "—";

	const showRegNumber = outlet?.show_reg_number_on_invoice ?? true;
	const showTaxNumber = outlet?.show_tax_number_on_invoice ?? true;

	return (
		<div className="invoice-sheet mx-auto max-w-[820px] bg-white p-8 text-[11px] text-zinc-900 print:p-0 print:text-[10px]">
			<div className="flex items-end gap-3">
				<div
					className="h-[18px] flex-1 border-zinc-500 border-b"
					aria-hidden
				/>
				<div className="font-semibold text-[18px] leading-none tracking-wide">
					INVOICE
				</div>
			</div>

			<header className="flex items-start gap-6 border-zinc-400 border-b py-4">
				<OutletLogo outlet={outlet} />
				<div className="flex flex-1 flex-col gap-2">
					<div className="grid grid-cols-2 gap-x-8 gap-y-1">
						<HeaderField label="Customer Name" value={customerName} />
						<HeaderField label="Invoice #" value={headerInvoiceNo} />
						<HeaderField
							label="Identification #"
							value={customer?.id_number ?? "—"}
						/>
						<HeaderField label="Sales Order #" value={order.so_number} />
						<HeaderField
							label="Membership #"
							value={customer?.code ?? "—"}
						/>
						<HeaderField label="Date" value={formatDate(order.sold_at)} />
						<HeaderField label="Phone #" value={customer?.phone ?? "—"} />
						<HeaderField label="Served By" value={servedBy} />
					</div>
					<HeaderField
						label="Customer Address"
						value={customerAddressLine(customer) || "—"}
						labelWidth="146px"
						multiline
					/>
				</div>
			</header>

			<section className="mt-2">
				<table className="w-full border-collapse text-[11px]">
					<thead>
						<tr className="border-zinc-300 border-y bg-zinc-50 text-left">
							<th className="py-2 pl-2 font-semibold">Description</th>
							<th className="w-[110px] py-2 font-semibold">Item Code</th>
							<th className="w-[60px] py-2 text-center font-semibold">Qty</th>
							<th className="w-[110px] py-2 text-right font-semibold">
								U/Price (MYR)
							</th>
							<th className="w-[110px] py-2 text-right font-semibold">
								Discount (MYR)
							</th>
							<th className="w-[120px] py-2 pr-2 text-right font-semibold">
								Amount (MYR)
							</th>
						</tr>
					</thead>
					<tbody>
						{items.map((item) => {
							const qty = Number(item.quantity ?? 0);
							const unitPrice = Number(item.unit_price ?? 0);
							const itemDiscount = Number(item.discount ?? 0);
							const lineAmount = Number(item.total ?? 0);
							const grossLine = qty * unitPrice;
							const taxRate = Number(item.tax_rate_pct ?? 0);
							const taxLineAmount =
								taxRate > 0
									? ((grossLine - itemDiscount) * taxRate) / 100
									: 0;
							const isFoc = lineAmount === 0 && qty > 0;
							return (
								<tr key={item.id} className="border-zinc-200 border-b align-top">
									<td className="py-1.5 pl-2">
										<div>{item.item_name}</div>
										{isFoc && (
											<div className="text-zinc-700">FOC</div>
										)}
									</td>
									<td className="py-1.5">{item.sku ?? "—"}</td>
									<td className="py-1.5 text-center tabular-nums">{qty}</td>
									<td className="py-1.5 text-right tabular-nums">
										{money(unitPrice)}
									</td>
									<td className="py-1.5 text-right tabular-nums">
										{money(itemDiscount)}
									</td>
									<td className="py-1.5 pr-2 text-right tabular-nums">
										<div>{money(lineAmount)}</div>
										<div className="text-[10px] text-zinc-500">
											(LOCAL) ({taxRate}%): {money(taxLineAmount)}
										</div>
									</td>
								</tr>
							);
						})}
						{items.length === 0 && (
							<tr>
								<td
									colSpan={6}
									className="py-6 text-center text-zinc-500 italic"
								>
									No line items
								</td>
							</tr>
						)}
						<tr className="border-zinc-300 border-t-2">
							<td colSpan={3} className="py-2 pl-2 font-semibold">
								Sub Total (MYR)
							</td>
							<td className="py-2 text-right font-semibold tabular-nums">
								{money(subtotal)}
							</td>
							<td className="py-2 text-right font-semibold tabular-nums">
								{money(discount)}
							</td>
							<td className="py-2 pr-2 text-right font-semibold tabular-nums">
								{money(total)}
							</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section className="mt-4 flex items-center justify-between border-zinc-300 border-y py-2">
				<span className="font-semibold">Gross Total (MYR)</span>
				<span className="font-semibold tabular-nums">{money(total)}</span>
			</section>

			<section className="mt-4">
				<div className="font-semibold underline">Payment Details</div>
				<div className="mt-1 flex items-center justify-between">
					<span>Tendered Amount (MYR)</span>
					<span className="tabular-nums">{money(tendered)}</span>
				</div>
				<div className="mt-2 flex items-center justify-between border-zinc-300 border-b font-semibold">
					<span className="underline">Payment Type</span>
					<span className="underline">Amount(MYR)</span>
				</div>
				{payments.length === 0 ? (
					<div className="py-2 text-zinc-500 italic">No payments collected.</div>
				) : (
					payments.map((p) => {
						const methodLabel = formatMethodLabel(p);
						const trace = p.trace_no?.trim();
						const approval = p.approval_code?.trim();
						const reference = p.reference_no?.trim();
						return (
							<div key={p.id} className="border-zinc-200 border-b py-1.5">
								<div className="flex items-center justify-between">
									<span>{methodLabel}</span>
									<span className="tabular-nums">{money(p.amount)}</span>
								</div>
								{(trace || approval || reference) && (
									<div className="mt-0.5 flex gap-4 text-[10px] text-zinc-500">
										{trace && <span>Trace No: {trace}</span>}
										{approval && <span>Approval Code: {approval}</span>}
										{reference && <span>Ref: {reference}</span>}
									</div>
								)}
							</div>
						);
					})
				)}
			</section>

			<section className="mt-4">
				<div className="font-semibold underline">Payment Summary</div>
				<div className="mt-1 flex items-center justify-between">
					<span>Total Paid to date (MYR)</span>
					<span className="tabular-nums">{money(amountPaid)}</span>
				</div>
				<div className="flex items-center justify-between">
					<span>Outstanding (MYR)</span>
					<span className="tabular-nums">{money(outstanding)}</span>
				</div>
			</section>

			<section className="mt-4">
				<div className="font-semibold underline">Terms & Conditions</div>
				<div className="mt-1">Goods sold are not refundable.</div>
			</section>

			<footer className="mt-12 border-zinc-400 border-t pt-3">
				<div className="grid grid-cols-[16px_1fr] items-start gap-x-3 gap-y-2 text-[10px]">
					<MapPin className="mt-0.5 size-3.5 text-zinc-500" aria-hidden />
					<div>
						<div className="font-semibold">
							{outlet?.name?.toUpperCase() ?? ""}
							{outlet?.company_reg_name
								? ` ${outlet.company_reg_name.toUpperCase()}`
								: ""}
							{showRegNumber && outlet?.company_reg_number
								? ` (${outlet.company_reg_number})`
								: ""}
						</div>
						<div>{outletAddressLine(outlet) || "—"}</div>
					</div>
					{outlet?.phone && (
						<>
							<Phone
								className="mt-0.5 size-3.5 text-zinc-500"
								aria-hidden
							/>
							<div>{outlet.phone}</div>
						</>
					)}
					{outlet?.email && (
						<>
							<Mail
								className="mt-0.5 size-3.5 text-zinc-500"
								aria-hidden
							/>
							<div>{outlet.email.toUpperCase()}</div>
						</>
					)}
					{showTaxNumber && outlet?.tax_number && (
						<>
							<span aria-hidden />
							<div className="font-semibold">
								Tax No.{outlet.tax_number}
							</div>
						</>
					)}
				</div>
			</footer>

			<style>{`
				@media print {
					@page { size: A4; margin: 12mm; }
					html, body { background: white !important; }
					body * { visibility: hidden !important; }
					.invoice-sheet, .invoice-sheet * { visibility: visible !important; }
					.invoice-sheet {
						position: absolute; top: 0; left: 0; width: 100%;
						box-shadow: none !important; margin: 0 !important; max-width: none !important; padding: 0 !important;
					}
				}
			`}</style>
		</div>
	);
}

function HeaderField({
	label,
	value,
	labelWidth = "120px",
	multiline,
}: {
	label: string;
	value: string;
	labelWidth?: string;
	multiline?: boolean;
}) {
	return (
		<div
			className="grid items-baseline gap-x-2"
			style={{ gridTemplateColumns: `${labelWidth} 8px 1fr` }}
		>
			<span className="font-semibold">{label}</span>
			<span className="text-zinc-700">:</span>
			<span className={multiline ? "whitespace-pre-wrap" : ""}>{value}</span>
		</div>
	);
}

function OutletLogo({ outlet }: { outlet: Outlet | null }) {
	if (outlet?.logo_url) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={outlet.logo_url}
				alt={outlet.name ?? "Outlet logo"}
				className="size-20 shrink-0 object-contain"
			/>
		);
	}
	return (
		<div className="flex size-20 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-zinc-300">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				aria-hidden
				className="size-10"
			>
				<title>Outlet logo placeholder</title>
				<rect x="3" y="3" width="18" height="18" rx="2" />
				<path d="m3 16 5-5 4 4 3-3 6 6" />
				<circle cx="9" cy="9" r="1.5" />
			</svg>
		</div>
	);
}

function formatMethodLabel(p: PaymentWithProcessedBy): string {
	const base = p.method?.name ?? p.payment_mode;
	const meta: string[] = [];
	if (p.card_type) meta.push(p.card_type);
	if (p.bank) meta.push(p.bank);
	if (meta.length > 0) return `${base} (${meta.join(",")})`;
	return base;
}
