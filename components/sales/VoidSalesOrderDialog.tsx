"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
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
import { listActiveBrandConfigItemsAction } from "@/lib/actions/brand-config";
import { listActivePaymentMethodsAction } from "@/lib/actions/payment-methods";
import { voidSalesOrderAction } from "@/lib/actions/sales";
import type { BrandConfigItem } from "@/lib/services/brand-config";
import type { SaleItem } from "@/lib/services/sales";
import type { Tables } from "@/lib/supabase/types";

type PaymentMethod = Tables<"payment_methods">;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	salesOrderId: string;
	soNumber: string;
	outletName: string | null;
	orderTotal: number;
	items: SaleItem[];
	onSuccess?: (result: {
		cnNumber: string;
		rnNumber: string;
		refundAmount: number;
	}) => void;
	onError?: (message: string) => void;
};

type Step = 1 | 2 | 3;

function money(n: number): string {
	return n.toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export function VoidSalesOrderDialog({
	open,
	onOpenChange,
	salesOrderId,
	soNumber,
	outletName,
	orderTotal,
	items,
	onSuccess,
	onError,
}: Props) {
	const router = useRouter();
	const [step, setStep] = useState<Step>(1);
	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
		new Set(),
	);
	const [reason, setReason] = useState<string>("");
	const [passcode, setPasscode] = useState("");
	const [refundMethod, setRefundMethod] = useState<string>("");
	const [includeAdminFee, setIncludeAdminFee] = useState(false);
	const [adminFee, setAdminFee] = useState<string>("0");
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [voidReasons, setVoidReasons] = useState<BrandConfigItem[]>([]);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!open) return;
		// Reset when the dialog opens.
		setStep(1);
		setSelectedItemIds(new Set(items.map((i) => i.id)));
		setReason("");
		setPasscode("");
		setRefundMethod("");
		setIncludeAdminFee(false);
		setAdminFee("0");
		setSubmitError(null);
	}, [open, items]);

	useEffect(() => {
		if (!open) return;
		listActivePaymentMethodsAction()
			.then(setPaymentMethods)
			.catch(() => setPaymentMethods([]));
		listActiveBrandConfigItemsAction("void_reason")
			.then(setVoidReasons)
			.catch(() => setVoidReasons([]));
	}, [open]);

	const allSelected = items.length > 0 && selectedItemIds.size === items.length;
	const adminFeeNum = Number.parseFloat(adminFee || "0") || 0;
	const effectiveAdminFee = includeAdminFee ? Math.max(0, adminFeeNum) : 0;
	const refundAmount = useMemo(
		() => Math.max(0, orderTotal - effectiveAdminFee),
		[orderTotal, effectiveAdminFee],
	);

	const canAdvanceFromItems = allSelected && items.length > 0;
	const canSubmit =
		reason !== "" &&
		/^\d{4}$/.test(passcode) &&
		refundMethod !== "" &&
		(!includeAdminFee || adminFeeNum >= 0);

	const submit = () => {
		if (!canSubmit) return;
		setSubmitError(null);
		startTransition(async () => {
			try {
				const result = await voidSalesOrderAction(salesOrderId, {
					reason,
					passcode,
					refund_method: refundMethod,
					include_admin_fee: includeAdminFee,
					admin_fee: effectiveAdminFee,
					sale_item_ids: Array.from(selectedItemIds),
				});
				onOpenChange(false);
				onSuccess?.(result);
				router.refresh();
			} catch (e) {
				const msg =
					e instanceof Error ? e.message : "Failed to void sales order";
				setSubmitError(msg);
				onError?.(msg);
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				preventOutsideClose
				className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 p-0 sm:max-w-2xl"
			>
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle className="text-center font-semibold text-red-700">
						{step === 1 && `Void Items for ${soNumber}`}
						{step === 2 && `Void ${soNumber} — Confirm`}
						{step === 3 && "Authorize Void"}
					</DialogTitle>
					<DialogDescription className="text-center text-xs">
						Step {step} of 3
						{outletName && (
							<>
								{" · "}
								Outlet: <span className="font-medium">{outletName}</span>
							</>
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto px-6 py-5">
					{submitError && (
						<div
							role="alert"
							className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 text-sm"
						>
							<AlertTriangle className="mt-0.5 size-4 shrink-0" />
							<span>{submitError}</span>
						</div>
					)}
					{step === 1 && (
						<Step1Items
							items={items}
							selectedIds={selectedItemIds}
							orderTotal={orderTotal}
						/>
					)}
					{step === 2 && (
						<Step2Confirm
							soNumber={soNumber}
							refundAmount={refundAmount}
							orderTotal={orderTotal}
							adminFee={effectiveAdminFee}
						/>
					)}
					{step === 3 && (
						<Step3Authorize
							outletName={outletName}
							reason={reason}
							setReason={setReason}
							passcode={passcode}
							setPasscode={(v) => {
								setPasscode(v);
								if (submitError) setSubmitError(null);
							}}
							refundMethod={refundMethod}
							setRefundMethod={setRefundMethod}
							paymentMethods={paymentMethods}
							voidReasons={voidReasons}
							includeAdminFee={includeAdminFee}
							setIncludeAdminFee={setIncludeAdminFee}
							adminFee={adminFee}
							setAdminFee={setAdminFee}
							refundAmount={refundAmount}
							disabled={isPending}
						/>
					)}
				</div>

				<DialogFooter className="border-t px-6 py-3">
					{step === 1 && (
						<>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isPending}
							>
								Keep order
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={() => setStep(2)}
								disabled={!canAdvanceFromItems || isPending}
							>
								Next
							</Button>
						</>
					)}
					{step === 2 && (
						<>
							<Button
								type="button"
								variant="outline"
								onClick={() => setStep(1)}
								disabled={isPending}
							>
								Back
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={() => setStep(3)}
								disabled={isPending}
							>
								Proceed
							</Button>
						</>
					)}
					{step === 3 && (
						<>
							<Button
								type="button"
								variant="outline"
								onClick={() => setStep(2)}
								disabled={isPending}
							>
								Back
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={submit}
								disabled={!canSubmit || isPending}
							>
								{isPending ? (
									<>
										<Loader2 className="mr-2 size-4 animate-spin" />
										Voiding…
									</>
								) : (
									"Void order"
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function Step1Items({
	items,
	selectedIds,
	orderTotal,
}: {
	items: SaleItem[];
	selectedIds: Set<string>;
	orderTotal: number;
}) {
	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
				<span className="font-semibold">
					Per-item selection is in development.
				</span>{" "}
				All items on this sales order will be voided. Partial voids will land in
				a later update.
			</div>
			<div className="rounded-md border">
				<div className="grid grid-cols-[1fr_80px_120px_40px] items-center border-b bg-muted/30 px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase">
					<div>Item</div>
					<div className="text-right">Qty</div>
					<div className="text-right">Total (MYR)</div>
					<div />
				</div>
				<div className="divide-y">
					{items.map((item) => (
						<div
							key={item.id}
							className="grid grid-cols-[1fr_80px_120px_40px] items-center px-4 py-3 text-sm"
						>
							<div>
								<div className="font-medium">{item.item_name}</div>
								{item.sku && (
									<div className="text-[11px] text-muted-foreground">
										{item.sku}
									</div>
								)}
							</div>
							<div className="text-right tabular-nums">{item.quantity}</div>
							<div className="text-right tabular-nums">
								{money(Number(item.total ?? 0))}
							</div>
							<div className="flex justify-end">
								<span
									className="relative inline-flex"
									title="Per-item selection — in development"
								>
									<Checkbox
										checked={selectedIds.has(item.id)}
										disabled
										aria-label="Item included in void (in development)"
									/>
									<span
										aria-hidden
										className="pointer-events-none absolute -right-1 -top-1 size-1.5 rounded-full bg-amber-500 ring-1 ring-background"
									/>
								</span>
							</div>
						</div>
					))}
					{items.length === 0 && (
						<div className="px-4 py-6 text-center text-muted-foreground text-sm">
							No line items on this order.
						</div>
					)}
				</div>
				<div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-sm">
					<span className="font-medium">Refundable amount</span>
					<span className="font-semibold tabular-nums">
						MYR {money(orderTotal)}
					</span>
				</div>
			</div>
		</div>
	);
}

function Step2Confirm({
	soNumber,
	refundAmount,
	orderTotal,
	adminFee,
}: {
	soNumber: string;
	refundAmount: number;
	orderTotal: number;
	adminFee: number;
}) {
	return (
		<div className="flex flex-col items-center gap-4 py-4 text-center">
			<AlertTriangle className="size-12 text-amber-500" />
			<p className="font-semibold text-lg">
				MYR {money(refundAmount)} will be returned to the customer.
			</p>
			<div className="space-y-1 text-muted-foreground text-sm">
				<p>The following will happen when you proceed:</p>
				<ol className="mt-2 list-decimal space-y-1 pl-6 text-left">
					<li>
						<span className="font-medium">{soNumber}</span> will be tagged as{" "}
						<span className="font-medium">Cancelled</span>.
					</li>
					<li>
						A Refund Note (RN-XXXXXX) will be generated for{" "}
						<span className="font-medium">MYR {money(refundAmount)}</span>.
					</li>
					<li>
						A Cancellation Note (CN-XXXXXX) will be created for the full{" "}
						<span className="font-medium">MYR {money(orderTotal)}</span>
						{adminFee > 0 && <> (admin fee: MYR {money(adminFee)})</>}.
					</li>
					<li>Product stock movements will be reversed.</li>
				</ol>
			</div>
			<p className="font-semibold text-red-600 text-sm">
				This cannot be reversed.
			</p>
		</div>
	);
}

function Step3Authorize({
	outletName,
	reason,
	setReason,
	passcode,
	setPasscode,
	refundMethod,
	setRefundMethod,
	paymentMethods,
	voidReasons,
	includeAdminFee,
	setIncludeAdminFee,
	adminFee,
	setAdminFee,
	refundAmount,
	disabled,
}: {
	outletName: string | null;
	reason: string;
	setReason: (v: string) => void;
	passcode: string;
	setPasscode: (v: string) => void;
	refundMethod: string;
	setRefundMethod: (v: string) => void;
	paymentMethods: PaymentMethod[];
	voidReasons: BrandConfigItem[];
	includeAdminFee: boolean;
	setIncludeAdminFee: (v: boolean) => void;
	adminFee: string;
	setAdminFee: (v: string) => void;
	refundAmount: number;
	disabled: boolean;
}) {
	return (
		<div className="space-y-4">
			<div>
				<Label htmlFor="void-passcode">
					Passcode <span className="text-red-500">*</span>
				</Label>
				<Input
					id="void-passcode"
					type="text"
					inputMode="numeric"
					pattern="\d{4}"
					maxLength={4}
					autoComplete="off"
					placeholder="4-digit code"
					value={passcode}
					onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
					disabled={disabled}
					className="mt-1.5 w-32 text-center font-mono text-base tracking-widest"
				/>
				<p className="mt-1 text-[11px] text-muted-foreground">
					Generate at <span className="font-medium">/passcode</span> with
					function [VOID/REVERT] Sales Order/Invoice for outlet{" "}
					<span className="font-medium">{outletName ?? "—"}</span>. Passcode is
					outlet-specific and single-use.
				</p>
			</div>

			<div>
				<Label htmlFor="void-reason">
					Remarks <span className="text-red-500">*</span>
				</Label>
				<Select value={reason} onValueChange={setReason} disabled={disabled}>
					<SelectTrigger id="void-reason" className="mt-1.5 w-full">
						<SelectValue placeholder="Please select a remark" />
					</SelectTrigger>
					<SelectContent>
						{voidReasons.map((r) => (
							<SelectItem key={r.code} value={r.code}>
								{r.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label htmlFor="refund-method">
					Return MYR {money(refundAmount)} as{" "}
					<span className="text-red-500">*</span>
				</Label>
				<Select
					value={refundMethod}
					onValueChange={setRefundMethod}
					disabled={disabled}
				>
					<SelectTrigger id="refund-method" className="mt-1.5 w-full">
						<SelectValue placeholder="Select refund method" />
					</SelectTrigger>
					<SelectContent>
						{paymentMethods.map((pm) => (
							<SelectItem key={pm.code} value={pm.code}>
								{pm.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="rounded-md border p-3">
				<div className="flex items-center gap-2">
					<Checkbox
						id="include-admin-fee"
						checked={includeAdminFee}
						onCheckedChange={(v) => setIncludeAdminFee(v === true)}
						disabled={disabled}
					/>
					<Label htmlFor="include-admin-fee" className="font-medium text-sm">
						Include Admin Fee?
					</Label>
				</div>
				{includeAdminFee && (
					<div className="mt-2 pl-6">
						<Label htmlFor="admin-fee" className="text-xs">
							Admin fee (MYR)
						</Label>
						<Input
							id="admin-fee"
							type="number"
							min="0"
							step="0.01"
							value={adminFee}
							onChange={(e) => setAdminFee(e.target.value)}
							disabled={disabled}
							className="mt-1 w-32 tabular-nums"
						/>
						<p className="mt-1 text-[11px] text-muted-foreground">
							Deducted from the refund.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
