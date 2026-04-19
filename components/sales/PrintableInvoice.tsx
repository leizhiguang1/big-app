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
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return "—";
	const d = new Date(iso);
	return `${d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})} ${d.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	})}`;
}

function prettyCode(code: string): string {
	return code
		.split("_")
		.map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
		.join(" ");
}

function outletAddressLines(outlet: Outlet | null): string[] {
	if (!outlet) return [];
	const lines: string[] = [];
	if (outlet.address1) lines.push(outlet.address1);
	if (outlet.address2) lines.push(outlet.address2);
	const cityLine = [outlet.postcode, outlet.city, outlet.state]
		.filter(Boolean)
		.join(" ")
		.trim();
	if (cityLine) lines.push(cityLine);
	if (outlet.country) lines.push(outlet.country);
	return lines;
}

function customerAddressLines(c: CustomerWithRelations | null): string[] {
	if (!c) return [];
	const lines: string[] = [];
	if (c.address1) lines.push(c.address1);
	if (c.address2) lines.push(c.address2);
	const cityLine = [c.postcode, c.city, c.state]
		.filter(Boolean)
		.join(" ")
		.trim();
	if (cityLine) lines.push(cityLine);
	return lines;
}

export function PrintableInvoice({
	order,
	items,
	payments,
	outlet,
	customer,
}: Props) {
	const customerName = customer
		? [customer.salutation, customer.first_name, customer.last_name]
				.filter(Boolean)
				.join(" ")
				.trim()
		: order.customer
			? [order.customer.first_name, order.customer.last_name]
					.filter(Boolean)
					.join(" ")
					.trim()
			: "Walk-in";

	const subtotal = Number(order.subtotal ?? 0);
	const discount = Number(order.discount ?? 0);
	const tax = Number(order.tax ?? 0);
	const rounding = Number(order.rounding ?? 0);
	const total = Number(order.total ?? 0);
	const amountPaid = Number(order.amount_paid ?? 0);
	const outstanding = Number(order.outstanding ?? 0);
	const paidInFull = outstanding <= 0.005;

	return (
		<div className="invoice-sheet mx-auto max-w-[780px] bg-white p-10 text-[12px] text-zinc-900 print:p-0 print:text-[11px]">
			<header className="flex items-start justify-between gap-6 border-zinc-300 border-b pb-4">
				<div>
					<div className="font-semibold text-lg tracking-tight">
						{outlet?.name ?? "BIG"}
					</div>
					<div className="mt-1 space-y-0.5 text-[11px] text-zinc-600">
						{outletAddressLines(outlet).map((line) => (
							<div key={line}>{line}</div>
						))}
						{outlet?.phone && <div>Tel: {outlet.phone}</div>}
						{outlet?.email && <div>{outlet.email}</div>}
					</div>
				</div>
				<div className="text-right">
					<div className="font-semibold text-xl uppercase tracking-[0.12em]">
						Invoice
					</div>
					<div className="mt-1 text-[11px] text-zinc-600">
						<div>
							<span className="inline-block w-20 text-left">SO No.</span>
							<span className="font-medium text-zinc-900">{order.so_number}</span>
						</div>
						<div>
							<span className="inline-block w-20 text-left">Date</span>
							<span>{formatDateTime(order.sold_at)}</span>
						</div>
						<div>
							<span className="inline-block w-20 text-left">Status</span>
							<span className="capitalize">{order.status}</span>
						</div>
					</div>
				</div>
			</header>

			<section className="grid grid-cols-2 gap-6 pt-4 pb-2">
				<div>
					<div className="font-medium text-[10px] text-zinc-500 uppercase tracking-wide">
						Bill To
					</div>
					<div className="mt-1 font-semibold text-sm">{customerName}</div>
					{customer?.code && (
						<div className="text-[11px] text-zinc-600">{customer.code}</div>
					)}
					<div className="mt-1 space-y-0.5 text-[11px] text-zinc-600">
						{customerAddressLines(customer).map((line) => (
							<div key={line}>{line}</div>
						))}
						{customer?.phone && <div>Tel: {customer.phone}</div>}
						{customer?.email && <div>{customer.email}</div>}
					</div>
				</div>
				<div>
					<div className="font-medium text-[10px] text-zinc-500 uppercase tracking-wide">
						Consultant
					</div>
					<div className="mt-1 text-sm">
						{order.consultant
							? [order.consultant.first_name, order.consultant.last_name]
									.filter(Boolean)
									.join(" ")
							: "—"}
					</div>
					<div className="mt-3 font-medium text-[10px] text-zinc-500 uppercase tracking-wide">
						Prepared By
					</div>
					<div className="mt-1 text-sm">
						{order.created_by_employee
							? [
									order.created_by_employee.first_name,
									order.created_by_employee.last_name,
								]
									.filter(Boolean)
									.join(" ")
							: "—"}
					</div>
				</div>
			</section>

			<section className="mt-4">
				<table className="w-full border-collapse text-[11px]">
					<thead>
						<tr className="border-zinc-400 border-y bg-zinc-50 text-left">
							<th className="w-10 py-2 pl-1 font-semibold">#</th>
							<th className="py-2 font-semibold">Description</th>
							<th className="w-16 py-2 text-right font-semibold">Qty</th>
							<th className="w-24 py-2 text-right font-semibold">Unit</th>
							<th className="w-24 py-2 text-right font-semibold">Discount</th>
							<th className="w-24 py-2 pr-1 text-right font-semibold">Total</th>
						</tr>
					</thead>
					<tbody>
						{items.map((item, idx) => (
							<tr
								key={item.id}
								className="border-zinc-200 border-b align-top"
							>
								<td className="py-2 pl-1 text-zinc-500">{idx + 1}</td>
								<td className="py-2">
									<div className="font-medium">{item.item_name}</div>
									{item.sku && (
										<div className="text-[10px] text-zinc-500">
											SKU: {item.sku}
										</div>
									)}
									<div className="text-[10px] text-zinc-500 capitalize">
										{item.item_type}
										{item.tax_name
											? ` · ${item.tax_name} ${item.tax_rate_pct}%`
											: ""}
									</div>
								</td>
								<td className="py-2 text-right tabular-nums">{item.quantity}</td>
								<td className="py-2 text-right tabular-nums">
									{money(item.unit_price)}
								</td>
								<td className="py-2 text-right tabular-nums">
									{Number(item.discount) > 0 ? money(item.discount) : "—"}
								</td>
								<td className="py-2 pr-1 text-right tabular-nums font-medium">
									{money(item.total)}
								</td>
							</tr>
						))}
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
					</tbody>
				</table>
			</section>

			<section className="mt-4 flex justify-end">
				<dl className="w-72 text-[11px]">
					<Row label="Subtotal" value={money(subtotal)} />
					{discount > 0 && <Row label="Discount" value={`-${money(discount)}`} />}
					{tax > 0 && <Row label="Tax" value={money(tax)} />}
					{Math.abs(rounding) > 0.005 && (
						<Row label="Rounding" value={money(rounding)} />
					)}
					<Row label="Total" value={money(total)} emphasize />
					<Row label="Amount Paid" value={money(amountPaid)} />
					<Row
						label="Outstanding"
						value={money(outstanding)}
						emphasize={!paidInFull}
					/>
				</dl>
			</section>

			{payments.length > 0 && (
				<section className="mt-6 border-zinc-300 border-t pt-3">
					<div className="font-semibold text-[10px] text-zinc-500 uppercase tracking-wide">
						Payments
					</div>
					<table className="mt-2 w-full border-collapse text-[11px]">
						<thead>
							<tr className="text-left text-zinc-500">
								<th className="w-28 py-1 font-medium">Date</th>
								<th className="py-1 font-medium">Method</th>
								<th className="py-1 font-medium">Reference</th>
								<th className="w-24 py-1 text-right font-medium">Amount</th>
							</tr>
						</thead>
						<tbody>
							{payments.map((p) => (
								<tr key={p.id} className="border-zinc-100 border-t align-top">
									<td className="py-1 tabular-nums">{formatDate(p.paid_at)}</td>
									<td className="py-1">
										{p.method?.name ?? prettyCode(p.payment_mode)}
									</td>
									<td className="py-1 text-[10px] text-zinc-600">
										{[p.bank, p.card_type, p.trace_no, p.approval_code, p.reference_no]
											.filter(Boolean)
											.join(" · ") || "—"}
									</td>
									<td className="py-1 text-right tabular-nums">
										{money(p.amount)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>
			)}

			{order.remarks && (
				<section className="mt-6 border-zinc-300 border-t pt-3">
					<div className="font-semibold text-[10px] text-zinc-500 uppercase tracking-wide">
						Remarks
					</div>
					<div className="mt-1 whitespace-pre-line text-[11px]">
						{order.remarks}
					</div>
				</section>
			)}

			<footer className="mt-10 border-zinc-300 border-t pt-3 text-center text-[10px] text-zinc-500">
				Thank you for choosing {outlet?.name ?? "us"}.
			</footer>

			<style>{`
				@media print {
					@page { size: A4; margin: 14mm; }
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

function Row({
	label,
	value,
	emphasize,
}: {
	label: string;
	value: string;
	emphasize?: boolean;
}) {
	return (
		<div
			className={`flex justify-between border-zinc-200 border-b py-1 ${
				emphasize ? "font-semibold text-zinc-900" : "text-zinc-700"
			}`}
		>
			<dt>{label}</dt>
			<dd className="tabular-nums">{value}</dd>
		</div>
	);
}
