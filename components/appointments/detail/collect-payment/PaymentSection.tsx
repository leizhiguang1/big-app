import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RawNumericInput } from "@/components/ui/numeric-input";
import type { PaymentMethod } from "@/lib/services/payment-methods";
import { money } from "./helpers";
import { PaymentMethodFields } from "./PaymentMethodFields";
import type { PaymentEntry } from "./types";
import { Toggle } from "./ui-primitives";

type Props = {
	payments: PaymentEntry[];
	paymentMethods: PaymentMethod[];
	methodByCode: Map<string, PaymentMethod>;
	total: number;
	walletBalance?: number | null;

	onChangeMethod: (key: string, mode: string) => void;
	onUpdatePayment: (key: string, patch: Partial<PaymentEntry>) => void;
	onRemovePayment: (key: string) => void;
	onAddPayment: () => void;
	onSetPaymentToTotal: (key: string) => void;

	backdate: boolean;
	onBackdateChange: (v: boolean) => void;
	backdateValue: string;
	onBackdateValueChange: (v: string) => void;

	remarks: string;
	onRemarksChange: (v: string) => void;
};

export function PaymentSection({
	payments,
	paymentMethods,
	methodByCode,
	total,
	walletBalance = null,
	onChangeMethod,
	onUpdatePayment,
	onRemovePayment,
	onAddPayment,
	onSetPaymentToTotal,
	backdate,
	onBackdateChange,
	backdateValue,
	onBackdateValueChange,
	remarks,
	onRemarksChange,
}: Props) {
	return (
		<>
			<div className="mt-5 text-sm font-semibold tracking-wide text-blue-600">
				PAYMENT
			</div>

			<div className="mt-2 flex items-center justify-end gap-2 text-xs">
				<span className="text-blue-600">Backdate Invoice?</span>
				<Toggle
					checked={backdate}
					onCheckedChange={(v) => {
						onBackdateChange(v);
						if (v) {
							const now = new Date();
							const yyyy = now.getFullYear();
							const mm = String(now.getMonth() + 1).padStart(2, "0");
							const dd = String(now.getDate()).padStart(2, "0");
							onBackdateValueChange(`${yyyy}-${mm}-${dd}`);
						} else {
							onBackdateValueChange("");
						}
					}}
				/>
			</div>
			{backdate &&
				(() => {
					const today = new Date();
					const y = today.getFullYear();
					const m = String(today.getMonth() + 1).padStart(2, "0");
					const d = String(today.getDate()).padStart(2, "0");
					const maxStr = `${y}-${m}-${d}`;
					const minStr = `${y}-${m}-01`;
					return (
						<div className="mt-2">
							<Input
								type="date"
								min={minStr}
								max={maxStr}
								value={backdateValue}
								onChange={(e) => onBackdateValueChange(e.target.value)}
								onBlur={() => {
									if (!backdateValue) return;
									if (backdateValue < minStr || backdateValue > maxStr) {
										onBackdateValueChange(maxStr);
									}
								}}
								className="h-8 text-xs"
							/>
						</div>
					);
				})()}

			<div className="mt-3 space-y-3">
				{payments.map((p) => {
					const method = methodByCode.get(p.mode);
					const usedByOthers = new Set(
						payments.filter((q) => q.key !== p.key).map((q) => q.mode),
					);
					const otherPaid = payments.reduce((s, q) => {
						if (q.key === p.key) return s;
						const v = Number(q.amount);
						return s + (Number.isFinite(v) && v > 0 ? v : 0);
					}, 0);
					const rowBalance = Math.max(
						0,
						Math.round((total - otherPaid) * 100) / 100,
					);
					const rowAmount = Number(p.amount);
					const isCash = p.mode === "cash";
					const isWallet = p.mode === "wallet";
					const change =
						isCash && Number.isFinite(rowAmount) && rowAmount > rowBalance
							? Math.round((rowAmount - rowBalance) * 100) / 100
							: 0;
					const exceeds =
						!isCash && Number.isFinite(rowAmount) && rowAmount > rowBalance
							? Math.round((rowAmount - rowBalance) * 100) / 100
							: 0;
					const walletShort =
						isWallet &&
						walletBalance != null &&
						Number.isFinite(rowAmount) &&
						rowAmount > walletBalance
							? Math.round((rowAmount - walletBalance) * 100) / 100
							: 0;
					return (
						<div
							key={p.key}
							className="space-y-2 rounded-md border border-border bg-muted/20 p-2"
						>
							<div className="flex items-center gap-2">
								<select
									className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring"
									value={p.mode}
									onChange={(e) => onChangeMethod(p.key, e.target.value)}
								>
									{paymentMethods.map((m) => {
										const isWalletMethod = m.code === "wallet";
										const noWallet =
											isWalletMethod &&
											(walletBalance == null || walletBalance <= 0);
										return (
											<option
												key={m.code}
												value={m.code}
												disabled={usedByOthers.has(m.code) || noWallet}
											>
												{m.name}
												{usedByOthers.has(m.code)
													? " (used)"
													: noWallet
														? " (no balance)"
														: ""}
											</option>
										);
									})}
									{!method && (
										<option key={p.mode} value={p.mode}>
											{p.mode}
										</option>
									)}
								</select>
								<RawNumericInput
									value={p.amount}
									onChange={(v) => onUpdatePayment(p.key, { amount: v })}
									min={0}
									decimals={2}
									placeholder="0.00"
									className="h-8 flex-1 text-right text-xs tabular-nums"
								/>
								{payments.length > 1 && (
									<button
										type="button"
										onClick={() => onRemovePayment(p.key)}
										className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
										aria-label="Remove payment"
									>
										<Trash2 className="size-3.5" />
									</button>
								)}
							</div>
							<div className="flex items-center justify-between">
								{isWallet && walletShort > 0 ? (
									<span className="text-[10px] font-medium text-red-600">
										Exceeds wallet by RM {money(walletShort)}
									</span>
								) : isCash && change > 0 ? (
									<span className="text-[10px] font-medium text-emerald-700">
										Change due: RM {money(change)}
									</span>
								) : exceeds > 0 ? (
									<span className="text-[10px] font-medium text-red-600">
										Exceeds balance by RM {money(exceeds)}
									</span>
								) : isWallet && walletBalance != null ? (
									<span className="text-[10px] font-medium text-teal-700">
										Wallet balance: RM {money(walletBalance)}
									</span>
								) : (
									<span />
								)}
								<button
									type="button"
									onClick={() => onSetPaymentToTotal(p.key)}
									className="text-[10px] font-medium text-blue-600 hover:underline"
								>
									Set to Balance (RM {money(rowBalance)})
								</button>
							</div>

							{method && (
								<PaymentMethodFields
									method={method}
									entry={p}
									onChange={(patch) => onUpdatePayment(p.key, patch)}
								/>
							)}
						</div>
					);
				})}

				<button
					type="button"
					onClick={onAddPayment}
					disabled={payments.length >= 5}
					className="flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50"
				>
					<Plus className="size-3" />
					Add Payment Type
				</button>

				<div className="flex items-center gap-2 border-t pt-3">
					<span className="w-20 shrink-0 text-xs text-muted-foreground">
						Sale remarks
					</span>
					<Input
						placeholder="Optional"
						value={remarks}
						onChange={(e) => onRemarksChange(e.target.value)}
						className="h-8 flex-1 text-xs"
					/>
				</div>
			</div>
		</>
	);
}
