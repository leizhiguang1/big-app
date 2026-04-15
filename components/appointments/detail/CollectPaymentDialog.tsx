"use client";

import {
	ChevronDown,
	ChevronUp,
	Loader2,
	Paperclip,
	Percent,
	Plus,
	Printer,
	RefreshCw,
	ShoppingCart,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { collectAppointmentPaymentAction } from "@/lib/actions/sales";
import {
	SALES_PAYMENT_MODE_LABEL,
	SALES_PAYMENT_MODES,
	type SalesPaymentMode,
} from "@/lib/schemas/sales";
import type { AppointmentLineItem } from "@/lib/services/appointment-line-items";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { Tax } from "@/lib/services/taxes";
import { cn } from "@/lib/utils";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appointment: AppointmentWithRelations;
	entries: AppointmentLineItem[];
	taxes: Tax[];
	onSuccess?: (result: { so_number: string; invoice_no: string }) => void;
	onError?: (message: string) => void;
};

type Line = {
	id: string;
	service_id: string | null;
	inventory_item_id: string | null;
	item_type: "service" | "product" | "charge";
	item_name: string;
	quantity: number;
	unit_price: number;
	tax_id: string | null;
};

function toLine(e: AppointmentLineItem): Line {
	return {
		id: e.id,
		service_id: e.service_id,
		inventory_item_id: e.product_id ?? null,
		item_type: (e.item_type as Line["item_type"]) ?? "service",
		item_name: e.description,
		quantity: Number(e.quantity),
		unit_price: Number(e.unit_price),
		tax_id: e.tax_id ?? null,
	};
}

function lineTaxAmount(line: Line, taxes: Tax[]): number {
	if (!line.tax_id) return 0;
	const tax = taxes.find((t) => t.id === line.tax_id);
	if (!tax) return 0;
	const base = Math.max(0, line.quantity * line.unit_price);
	return Math.round(base * Number(tax.rate_pct)) / 100;
}

function money(n: number) {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function customerDisplay(a: AppointmentWithRelations) {
	if (a.customer) {
		const name = [a.customer.first_name, a.customer.last_name]
			.filter(Boolean)
			.join(" ");
		return { name: name || "Customer", code: a.customer.code };
	}
	if (a.is_time_block) {
		return { name: a.block_title || "Time block", code: "" };
	}
	return { name: a.lead_name || "Walk-in lead", code: "LEAD" };
}

export function CollectPaymentDialog({
	open,
	onOpenChange,
	appointment,
	entries,
	taxes,
	onSuccess,
	onError,
}: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [lines, setLines] = useState<Line[]>(() => entries.map(toLine));
	useEffect(() => {
		setLines(entries.map(toLine));
	}, [entries]);
	const setLineTax = (id: string, taxId: string | null) =>
		setLines((rows) =>
			rows.map((r) => (r.id === id ? { ...r, tax_id: taxId } : r)),
		);
	const [discount, setDiscount] = useState(0);
	const [rounding, setRounding] = useState(0);
	const [requireRounding, setRequireRounding] = useState(false);
	const [paymentMode, setPaymentMode] = useState<SalesPaymentMode>("cash");
	const [amount, setAmount] = useState<string>("");
	const [remarks, setRemarks] = useState("");
	const [frontdeskMsg, setFrontdeskMsg] = useState("");
	const [attachmentsOpen, setAttachmentsOpen] = useState(true);
	const [itemized, setItemized] = useState(false);
	const [backdate, setBackdate] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const customer = customerDisplay(appointment);
	const assignedEmployee = appointment.employee
		? `${appointment.employee.first_name} ${appointment.employee.last_name}`.trim()
		: null;

	const subtotal = useMemo(
		() => lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0),
		[lines],
	);
	const totalTax = useMemo(
		() => lines.reduce((sum, l) => sum + lineTaxAmount(l, taxes), 0),
		[lines, taxes],
	);
	const total = Math.max(0, subtotal - discount + totalTax + rounding);

	const parsedAmount = Number(amount);
	const amountValid =
		amount !== "" && !Number.isNaN(parsedAmount) && parsedAmount > 0;
	const cashPaid = amountValid ? parsedAmount : 0;
	const balance = Math.max(0, total - cashPaid);

	const handleSubmit = () => {
		setFormError(null);
		if (lines.length === 0) {
			setFormError("Add at least one billing item before collecting payment.");
			return;
		}
		if (!amountValid) {
			setFormError("Enter the payment amount.");
			return;
		}
		startTransition(async () => {
			try {
				const result = await collectAppointmentPaymentAction(appointment.id, {
					items: lines.map((l) => ({
						service_id: l.service_id,
						inventory_item_id: l.inventory_item_id,
						sku: null,
						item_name: l.item_name,
						item_type: l.item_type,
						quantity: l.quantity,
						unit_price: l.unit_price,
						discount: 0,
						tax_id: l.tax_id,
					})),
					discount,
					tax: 0,
					rounding,
					payment_mode: paymentMode,
					amount: parsedAmount,
					remarks: remarks.trim() || null,
				});
				onSuccess?.({
					so_number: result.so_number,
					invoice_no: result.invoice_no,
				});
				onOpenChange(false);
				router.refresh();
			} catch (e) {
				const message =
					e instanceof Error ? e.message : "Failed to collect payment";
				setFormError(message);
				onError?.(message);
			}
		});
	};

	const disabled = isPending || lines.length === 0 || !amountValid;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="flex max-h-[92vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
			>
				<DialogTitle className="sr-only">Collect payment</DialogTitle>

				{/* Header bar */}
				<div className="flex items-start justify-between border-b bg-white px-6 py-3">
					<div className="flex flex-col">
						<div className="text-lg font-semibold tracking-wide text-blue-600">
							{customer.name.toUpperCase()}
						</div>
						{customer.code && (
							<div className="text-xs text-muted-foreground">
								{customer.code}
							</div>
						)}
						<div className="mt-1 text-sm font-medium text-amber-500">
							MYR {money(0)}
						</div>
						<div className="text-xs text-muted-foreground">Cash Wallet</div>
					</div>

					<div className="flex items-center gap-6">
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">
								Itemised Allocation?
							</span>
							<Toggle checked={itemized} onCheckedChange={setItemized} />
						</div>
						<div className="flex items-end gap-3">
							<StaffAvatar
								name={assignedEmployee ?? "Employee 1"}
								percent={100}
							/>
							<StaffAvatar name="Employee 2" percent={null} muted />
							<StaffAvatar name="Employee 3" percent={null} muted />
						</div>
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							className="ml-2 rounded p-1 text-muted-foreground hover:bg-muted"
							aria-label="Close"
						>
							<X className="size-5" />
						</button>
					</div>
				</div>

				{/* Body */}
				<div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_360px]">
					{/* LEFT COLUMN */}
					<div className="flex min-h-0 flex-col overflow-y-auto border-r bg-slate-50/40 px-5 py-4">
						{/* Custom fields placeholder card */}
						<div className="mb-3 rounded-md border bg-white p-3 shadow-sm">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-xs text-muted-foreground">
										Reference #
									</label>
									<Input placeholder="Optional" disabled className="mt-1 h-8" />
								</div>
								<div>
									<label className="text-xs text-muted-foreground">Tag</label>
									<Input
										placeholder="Type to search"
										disabled
										className="mt-1 h-8"
									/>
								</div>
							</div>
							<div className="mt-3">
								<div className="text-xs font-medium text-blue-600">Remarks</div>
								<textarea
									placeholder="Up to 100 words"
									className="mt-1 min-h-[44px] w-full resize-none rounded border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring"
									maxLength={500}
									value={remarks}
									onChange={(e) => setRemarks(e.target.value)}
								/>
							</div>
						</div>

						{/* Line items */}
						<div className="rounded-md border bg-white shadow-sm">
							{lines.length === 0 ? (
								<div className="px-3 py-8 text-center text-sm text-muted-foreground">
									No billing items. Add services in the Billing tab first.
								</div>
							) : (
								<ul className="divide-y">
									{lines.map((l) => {
										const taxAmt = lineTaxAmount(l, taxes);
										const activeTaxes = taxes.filter((t) => t.is_active);
										return (
											<li key={l.id} className="px-3 py-3">
												<div className="grid grid-cols-[1fr_60px_110px_110px_24px] items-center gap-2 text-sm">
													<div>
														<div className="font-medium text-blue-600">
															({l.item_type === "product" ? "PRD" : "SVC"}){" "}
															{l.item_name}
														</div>
														<div className="text-xs text-muted-foreground">
															{l.id.slice(0, 6).toUpperCase()}
														</div>
													</div>
													<div className="text-right tabular-nums">
														{l.quantity}
													</div>
													<div className="text-right tabular-nums">
														{money(l.unit_price)}
													</div>
													<div className="text-right font-medium tabular-nums">
														{money(l.quantity * l.unit_price)}
													</div>
													<ChevronDown className="size-4 text-muted-foreground" />
												</div>
												<div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
													<select
														value={l.tax_id ?? ""}
														onChange={(e) =>
															setLineTax(
																l.id,
																e.target.value === "" ? null : e.target.value,
															)
														}
														className="h-6 rounded-full border bg-background px-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
														aria-label="Tax for this line item"
													>
														<option value="">— No tax —</option>
														{activeTaxes.map((t) => (
															<option key={t.id} value={t.id}>
																({t.name.toUpperCase()}){" "}
																{Number(t.rate_pct).toFixed(2)}%
															</option>
														))}
													</select>
													<span className="text-muted-foreground tabular-nums">
														Tax Amount (MYR): {money(taxAmt)}
													</span>
												</div>
											</li>
										);
									})}
								</ul>
							)}
						</div>

						{/* Action row + totals */}
						<div className="mt-3 grid grid-cols-[1fr_1fr] gap-4">
							<div className="space-y-2 text-sm">
								<button
									type="button"
									disabled
									className="flex items-center gap-2 text-blue-600 disabled:opacity-60"
								>
									<ShoppingCart className="size-4" />
									Add Item to Cart
								</button>
								<button
									type="button"
									disabled
									className="flex items-center gap-2 text-blue-600 disabled:opacity-60"
								>
									<RefreshCw className="size-4" />
									Repeat Previous Items
								</button>
								<button
									type="button"
									disabled
									className="flex items-center gap-2 text-blue-600 disabled:opacity-60"
								>
									<Percent className="size-4" />
									Apply Auto Discount to Cart Items
								</button>
							</div>

							<div className="space-y-1 text-sm">
								<Row
									label="Subtotal (MYR)"
									value={
										<span className="tabular-nums">{money(subtotal)}</span>
									}
								/>
								<Row
									label="Discount"
									value={
										<Input
											type="number"
											min={0}
											step="0.01"
											value={discount}
											onChange={(e) => setDiscount(Number(e.target.value) || 0)}
											className="h-7 w-24 text-right"
										/>
									}
								/>
								<Row
									label="Tax (MYR)"
									value={
										<span className="tabular-nums">{money(totalTax)}</span>
									}
								/>
								<Row
									label="Total (MYR)"
									value={
										<span className="tabular-nums font-medium">
											{money(total)}
										</span>
									}
								/>
								<Row
									label="Cash (MYR)"
									value={
										<span className="tabular-nums">{money(cashPaid)}</span>
									}
								/>
								<Row
									label="Balance (MYR)"
									value={
										<span className="tabular-nums font-semibold">
											{money(balance)}
										</span>
									}
								/>
								<div className="flex items-center justify-end gap-2 pt-1 text-xs">
									<span className="text-blue-600">Require Rounding?</span>
									<Toggle
										checked={requireRounding}
										onCheckedChange={(v) => {
											setRequireRounding(v);
											if (!v) setRounding(0);
										}}
									/>
								</div>
							</div>
						</div>
					</div>

					{/* RIGHT COLUMN */}
					<div className="flex min-h-0 flex-col overflow-y-auto bg-white px-5 py-4">
						{/* Attachments / certificates placeholder */}
						<button
							type="button"
							onClick={() => setAttachmentsOpen((v) => !v)}
							className="flex w-full items-center justify-between text-sm font-semibold text-blue-600"
						>
							<span className="tracking-wide">ATTACHMENTS</span>
							{attachmentsOpen ? (
								<ChevronUp className="size-4" />
							) : (
								<ChevronDown className="size-4" />
							)}
						</button>
						{attachmentsOpen && (
							<div className="mt-2 rounded-md border p-3 shadow-sm">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-sm font-medium">
											ATTACH-{appointment.id.slice(0, 6).toUpperCase()}
										</div>
										<div className="text-xs text-muted-foreground">
											Placeholder · no files yet
										</div>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground">
										<Printer className="size-4" />
										<Paperclip className="size-4" />
									</div>
								</div>
							</div>
						)}

						{/* Payment */}
						<div className="mt-5 text-sm font-semibold tracking-wide text-blue-600">
							PAYMENT
						</div>

						<div className="mt-2 flex items-center justify-end gap-2 text-xs">
							<span className="text-blue-600">Backdate Invoice?</span>
							<Toggle checked={backdate} onCheckedChange={setBackdate} />
						</div>

						<div className="mt-3 space-y-2">
							<div className="grid grid-cols-[1fr_1fr] gap-2">
								<select
									className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
									value={paymentMode}
									onChange={(e) =>
										setPaymentMode(e.target.value as SalesPaymentMode)
									}
								>
									{SALES_PAYMENT_MODES.map((m) => (
										<option key={m} value={m}>
											{SALES_PAYMENT_MODE_LABEL[m]}
										</option>
									))}
								</select>
								<div className="flex h-9 items-center justify-end rounded-md border border-input px-2 text-sm tabular-nums text-muted-foreground">
									MYR {money(total)}
								</div>
							</div>

							<div className="grid grid-cols-[1fr_1fr] gap-2">
								<div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-2 text-xs uppercase tracking-wide text-muted-foreground">
									{SALES_PAYMENT_MODE_LABEL[paymentMode]}
								</div>
								<Input
									type="number"
									min={0}
									step="0.01"
									placeholder={money(total)}
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									className="h-9 text-right tabular-nums"
								/>
							</div>

							<div>
								<div className="text-xs text-muted-foreground">Remarks:</div>
								<Input
									placeholder="Add Remarks"
									value={remarks}
									onChange={(e) => setRemarks(e.target.value)}
									className="mt-1 h-9"
								/>
							</div>

							<button
								type="button"
								disabled
								className="flex items-center gap-1 text-xs text-blue-600 disabled:opacity-60"
							>
								<Plus className="size-3" />
								Add Payment Type
							</button>
						</div>

						<div className="mt-4 text-xs text-muted-foreground">
							This Sales will be created at{" "}
							<span className="font-semibold text-blue-600">
								BIG DENTAL · OUTLET
							</span>
						</div>

						<div className="mt-3 flex justify-end">
							<button
								type="button"
								onClick={handleSubmit}
								disabled={disabled}
								className={cn(
									"flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
								)}
								aria-label="Collect payment"
							>
								{isPending ? (
									<Loader2 className="size-5 animate-spin" />
								) : (
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="3"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="size-6"
										aria-hidden="true"
									>
										<polyline points="20 6 9 17 4 12" />
									</svg>
								)}
							</button>
						</div>

						<div className="mt-5">
							<div className="text-xs text-muted-foreground">
								Message to frontdesk
							</div>
							<textarea
								value={frontdeskMsg}
								onChange={(e) => setFrontdeskMsg(e.target.value)}
								className="mt-1 min-h-[60px] w-full resize-none rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring"
								placeholder="Optional"
							/>
						</div>

						{formError && (
							<div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
								{formError}
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-xs text-muted-foreground">{label}</span>
			<div className="flex items-center">{value}</div>
		</div>
	);
}

function Toggle({
	checked,
	onCheckedChange,
}: {
	checked: boolean;
	onCheckedChange: (v: boolean) => void;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onCheckedChange(!checked)}
			className={cn(
				"relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition",
				checked ? "bg-blue-600" : "bg-muted",
			)}
		>
			<span
				className={cn(
					"inline-block size-3 rounded-full bg-white transition",
					checked ? "translate-x-3.5" : "translate-x-0.5",
				)}
			/>
		</button>
	);
}

function StaffAvatar({
	name,
	percent,
	muted = false,
}: {
	name: string;
	percent: number | null;
	muted?: boolean;
}) {
	const initials = name
		.split(/\s+/)
		.map((w) => w[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();
	return (
		<div className="flex flex-col items-center gap-1">
			<div
				className={cn(
					"flex size-9 items-center justify-center rounded-full text-xs font-semibold",
					muted
						? "bg-muted text-muted-foreground"
						: "bg-blue-100 text-blue-700",
				)}
			>
				{initials || "?"}
			</div>
			<div
				className={cn(
					"max-w-[80px] truncate text-[10px]",
					muted ? "text-muted-foreground" : "font-medium text-blue-600",
				)}
				title={name}
			>
				{name}
			</div>
			{percent !== null && (
				<div className="text-[10px] text-muted-foreground">{percent}%</div>
			)}
		</div>
	);
}
