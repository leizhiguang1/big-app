"use client";

import { Mail, Pencil, Printer, Save, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { PrintableReceipt } from "@/components/sales/PrintableReceipt";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	loadReceiptForPaymentAction,
	saveReceiptAction,
} from "@/lib/actions/receipts";
import type { Brand } from "@/lib/services/brands";
import {
	defaultBeingPaymentOf,
	defaultCustomerName,
	type ReceiptDetail,
	type ReceiptEditWithRefs,
} from "@/lib/services/receipts";
import { cn } from "@/lib/utils";

type Props = {
	open: boolean;
	paymentId: string | null;
	onOpenChange: (open: boolean) => void;
};

function formatDateTime(iso: string): string {
	const d = new Date(iso);
	return d
		.toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		})
		.concat(
			`, ${d.toLocaleTimeString("en-US", {
				hour: "numeric",
				minute: "2-digit",
				second: "2-digit",
				hour12: true,
			})}`,
		);
}

export function PrintReceiptDialog({ open, paymentId, onOpenChange }: Props) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<{
		receipt: ReceiptDetail;
		edits: ReceiptEditWithRefs[];
		brand: Brand | null;
	} | null>(null);

	const [customerName, setCustomerName] = useState("");
	const [beingPaymentOf, setBeingPaymentOf] = useState("");
	const [editing, setEditing] = useState(false);
	const [saving, startSaving] = useTransition();
	const [saveError, setSaveError] = useState<string | null>(null);

	function applyDataToForm(res: {
		receipt: ReceiptDetail;
		edits: ReceiptEditWithRefs[];
		brand: Brand | null;
	}) {
		setCustomerName(
			res.receipt.customer_name_override ??
				defaultCustomerName(res.receipt.salesOrder.customer),
		);
		setBeingPaymentOf(
			res.receipt.remarks_override ??
				defaultBeingPaymentOf(res.receipt.salesOrder.items),
		);
	}

	useEffect(() => {
		if (!open || !paymentId) return;
		let cancelled = false;
		setLoading(true);
		setError(null);
		setData(null);
		setEditing(false);
		setSaveError(null);
		loadReceiptForPaymentAction(paymentId)
			.then((res) => {
				if (cancelled) return;
				setData(res);
				applyDataToForm(res);
			})
			.catch((e: unknown) => {
				if (cancelled) return;
				setError(e instanceof Error ? e.message : "Failed to load receipt");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [open, paymentId]);

	const dirty = useMemo(() => {
		if (!data) return false;
		const original =
			data.receipt.customer_name_override ??
			defaultCustomerName(data.receipt.salesOrder.customer);
		const originalRemarks =
			data.receipt.remarks_override ??
			defaultBeingPaymentOf(data.receipt.salesOrder.items);
		return customerName !== original || beingPaymentOf !== originalRemarks;
	}, [data, customerName, beingPaymentOf]);

	function handleClose(next: boolean) {
		if (!next && saving) return;
		onOpenChange(next);
	}

	function handleEnterEdit() {
		setSaveError(null);
		setEditing(true);
	}

	function handleCancelEdit() {
		if (saving) return;
		if (data) applyDataToForm(data);
		setSaveError(null);
		setEditing(false);
	}

	function handleSave() {
		if (!data) return;
		setSaveError(null);
		startSaving(async () => {
			try {
				const updated = await saveReceiptAction(data.receipt.id, {
					customer_name: customerName,
					remarks: beingPaymentOf,
				});
				setData(updated);
				applyDataToForm(updated);
				setEditing(false);
			} catch (e: unknown) {
				setSaveError(e instanceof Error ? e.message : "Failed to save");
			}
		});
	}

	function handlePrint() {
		if (!data) return;
		window.open(
			`/receipts/${data.receipt.id}?autoPrint=1`,
			"_blank",
			"noopener",
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent
				className="flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
				preventOutsideClose
			>
				<DialogHeader className="border-b">
					<DialogTitle>Print Receipt</DialogTitle>
				</DialogHeader>

				{loading && (
					<div className="p-12 text-center text-muted-foreground text-sm">
						Loading receipt…
					</div>
				)}

				{error && (
					<div className="p-12 text-center text-rose-600 text-sm">{error}</div>
				)}

				{data && !loading && !error && (
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
						<TopBanner
							receipt={data.receipt}
							editing={editing}
							onEnterEdit={handleEnterEdit}
							onCancelEdit={handleCancelEdit}
							onSave={handleSave}
							onPrint={handlePrint}
							dirty={dirty}
							saving={saving}
						/>

						{saveError && (
							<div className="border-rose-200 border-y bg-rose-50 px-6 py-2 text-rose-700 text-xs">
								{saveError}
							</div>
						)}

						<div className="grid grid-cols-1 gap-4 px-6 pb-4 lg:grid-cols-[minmax(0,1fr)_320px]">
							<div className="rounded border bg-zinc-50/50 p-2">
								<PrintableReceipt
									receipt={data.receipt}
									brand={data.brand}
									customerNameOverride={customerName}
									remarksOverride={beingPaymentOf}
									bare
								/>
							</div>
							<EditForm
								customerName={customerName}
								setCustomerName={setCustomerName}
								beingPaymentOf={beingPaymentOf}
								setBeingPaymentOf={setBeingPaymentOf}
								disabled={!editing}
							/>
						</div>

						<EditLog edits={data.edits} />
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function TopBanner({
	receipt,
	editing,
	onEnterEdit,
	onCancelEdit,
	onSave,
	onPrint,
	dirty,
	saving,
}: {
	receipt: ReceiptDetail;
	editing: boolean;
	onEnterEdit: () => void;
	onCancelEdit: () => void;
	onSave: () => void;
	onPrint: () => void;
	dirty: boolean;
	saving: boolean;
}) {
	const customer = receipt.salesOrder.customer;
	const customerLabel = customer
		? `${[customer.first_name, customer.last_name]
				.filter(Boolean)
				.join(" ")
				.trim()
				.toUpperCase()}${customer.id_number ? ` (${customer.id_number})` : ""}`
		: "WALK-IN";

	return (
		<div className="flex flex-wrap items-center gap-4 border-b px-6 py-4">
			<div className="size-12 shrink-0 rounded-full bg-zinc-200" aria-hidden />
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="text-zinc-500 text-xs">{receipt.receipt_no}</div>
				<div className="truncate font-semibold text-sky-600 text-sm">
					{customerLabel}
				</div>
				{customer?.code && (
					<div className="text-zinc-500 text-xs">{customer.code}</div>
				)}
			</div>
			<div className="text-right text-zinc-500 text-xs uppercase">
				{formatDateTime(receipt.payment.paid_at)}
			</div>
			<div className="flex items-center gap-2">
				{editing && (
					<RoundButton
						tone="rose"
						label="Cancel edit"
						onClick={onCancelEdit}
						disabled={saving}
					>
						<X className="size-4" />
					</RoundButton>
				)}
				{editing ? (
					<RoundButton
						tone="amber"
						label="Save"
						onClick={onSave}
						disabled={!dirty || saving}
						loading={saving}
					>
						<Save className="size-4" />
					</RoundButton>
				) : (
					<RoundButton tone="amber" label="Edit" onClick={onEnterEdit}>
						<Pencil className="size-4" />
					</RoundButton>
				)}
				<RoundButton tone="sky" label="Email" disabled>
					<Mail className="size-4" />
				</RoundButton>
				<RoundButton
					tone="emerald"
					label="Print"
					onClick={onPrint}
					disabled={editing}
				>
					<Printer className="size-4" />
				</RoundButton>
			</div>
		</div>
	);
}

function RoundButton({
	tone,
	label,
	onClick,
	disabled,
	loading,
	children,
}: {
	tone: "rose" | "amber" | "sky" | "emerald";
	label: string;
	onClick?: () => void;
	disabled?: boolean;
	loading?: boolean;
	children: React.ReactNode;
}) {
	const palette =
		tone === "rose"
			? "bg-rose-500 text-white hover:bg-rose-600"
			: tone === "amber"
				? "bg-amber-500 text-white hover:bg-amber-600"
				: tone === "sky"
					? "border-sky-300 bg-white text-sky-600 hover:bg-sky-50"
					: "bg-emerald-500 text-white hover:bg-emerald-600";
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					disabled={disabled}
					aria-label={label}
					className={cn(
						"inline-flex size-9 items-center justify-center rounded-full border shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40",
						palette,
					)}
				>
					{loading ? (
						<span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
					) : (
						children
					)}
				</button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

function EditForm({
	customerName,
	setCustomerName,
	beingPaymentOf,
	setBeingPaymentOf,
	disabled,
}: {
	customerName: string;
	setCustomerName: (v: string) => void;
	beingPaymentOf: string;
	setBeingPaymentOf: (v: string) => void;
	disabled: boolean;
}) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="receipt-customer-name">
					Customer Name<span className="text-rose-500">*</span>
				</Label>
				<Input
					id="receipt-customer-name"
					value={customerName}
					onChange={(e) => setCustomerName(e.target.value)}
					disabled={disabled}
					readOnly={disabled}
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="receipt-remark-template">Receipt Remark</Label>
				<Select value="custom" disabled={disabled}>
					<SelectTrigger id="receipt-remark-template">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="custom">CUSTOM REMARK</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="receipt-being-payment-of">
					Being Payment of<span className="text-rose-500">*</span>
				</Label>
				<Textarea
					id="receipt-being-payment-of"
					value={beingPaymentOf}
					onChange={(e) => setBeingPaymentOf(e.target.value)}
					disabled={disabled}
					readOnly={disabled}
					rows={10}
					className="resize-y font-mono text-[12px]"
				/>
			</div>
		</div>
	);
}

function EditLog({ edits }: { edits: ReceiptEditWithRefs[] }) {
	const columns: DataTableColumn<ReceiptEditWithRefs>[] = [
		{
			key: "created_at",
			header: "Date",
			sortable: true,
			sortValue: (r) => r.created_at,
			cell: (r) => (
				<span className="text-xs">{formatDateTime(r.created_at)}</span>
			),
		},
		{
			key: "customer_name",
			header: "Customer Name",
			sortable: true,
			sortValue: (r) => r.customer_name ?? "",
			cell: (r) => <span className="text-xs">{r.customer_name ?? "—"}</span>,
		},
		{
			key: "edited_by",
			header: "Updated By",
			sortable: true,
			sortValue: (r) =>
				r.editor
					? `${r.editor.first_name} ${r.editor.last_name ?? ""}`.trim()
					: "",
			cell: (r) => (
				<span className="text-xs">
					{r.editor
						? `${r.editor.first_name} ${r.editor.last_name ?? ""}`.trim()
						: "—"}
				</span>
			),
		},
		{
			key: "outlet",
			header: "Outlet",
			sortable: true,
			sortValue: (r) => r.outlet?.name ?? "",
			cell: (r) => <span className="text-xs">{r.outlet?.name ?? "—"}</span>,
		},
	];

	return (
		<div className="border-t px-6 py-4">
			<div className="mb-2 font-medium text-sm">Print Receipt Log</div>
			<DataTable<ReceiptEditWithRefs>
				data={edits}
				columns={columns}
				getRowKey={(r) => r.id}
				searchKeys={["customer_name"]}
				searchPlaceholder="Search…"
				emptyMessage="There are no items at present."
				defaultPageSize={10}
				minWidth={640}
			/>
		</div>
	);
}
