"use client";

import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { useState } from "react";
import { SalesOrderDetailDialog } from "@/components/sales/SalesOrderDetailDialog";
import type {
	CustomerWallet,
	WalletTransactionWithRefs,
} from "@/lib/services/wallet";
import { cn } from "@/lib/utils";

type Props = {
	wallet: CustomerWallet | null;
	transactions: WalletTransactionWithRefs[];
};

function formatMoney(n: number | string | null | undefined): string {
	return Number(n ?? 0).toLocaleString("en-MY", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

const KIND_LABEL: Record<WalletTransactionWithRefs["kind"], string> = {
	topup: "Top-up",
	spend: "Spend",
	void_topup: "Top-up voided",
	void_spend: "Spend refunded",
	adjustment: "Adjustment",
};

export function CustomerCashWalletTab({ wallet, transactions }: Props) {
	const balance = Number(wallet?.balance ?? 0);
	const [openId, setOpenId] = useState<string | null>(null);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between gap-4 rounded-xl border bg-gradient-to-br from-teal-500 to-teal-600 p-6 text-white shadow-sm">
				<div>
					<div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
						<Wallet className="size-4" />
						Cash Wallet
					</div>
					<div className="mt-3 font-bold text-3xl tabular-nums">
						MYR {formatMoney(balance)}
					</div>
					<div className="mt-1 text-xs text-white/80">Available balance</div>
				</div>
				<div className="max-w-[240px] text-right text-[11px] text-white/90 leading-snug">
					To top up, sell a <span className="font-semibold">Cash Wallet</span>{" "}
					line on a new sale.
				</div>
			</div>

			{transactions.length === 0 ? (
				<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
					No wallet transactions yet. Top-ups and deductions will appear here.
				</div>
			) : (
				<div className="rounded-xl border bg-card shadow-sm">
					<table className="w-full text-[13px]">
						<thead>
							<tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
								<th className="px-3 py-2 text-left font-medium">Date</th>
								<th className="px-3 py-2 text-left font-medium">Kind</th>
								<th className="px-3 py-2 text-right font-medium">Amount</th>
								<th className="px-3 py-2 text-right font-medium">
									Balance After
								</th>
								<th className="px-3 py-2 text-left font-medium">Sales Order</th>
								<th className="px-3 py-2 text-left font-medium">By</th>
								<th className="px-3 py-2 text-left font-medium">Remarks</th>
							</tr>
						</thead>
						<tbody>
							{transactions.map((tx) => {
								const isCredit = tx.direction === "credit";
								const signed = `${isCredit ? "+" : "−"} ${formatMoney(tx.amount)}`;
								const by = tx.created_by_employee
									? `${tx.created_by_employee.first_name} ${tx.created_by_employee.last_name ?? ""}`.trim()
									: "—";
								return (
									<tr
										key={tx.id}
										className="border-b last:border-b-0 hover:bg-muted/30"
									>
										<td className="px-3 py-2 text-muted-foreground">
											{formatDateTime(tx.created_at)}
										</td>
										<td className="px-3 py-2">
											<span className="inline-flex items-center gap-1">
												{isCredit ? (
													<ArrowUpRight className="size-3 text-emerald-600" />
												) : (
													<ArrowDownRight className="size-3 text-rose-600" />
												)}
												{KIND_LABEL[tx.kind]}
											</span>
										</td>
										<td
											className={cn(
												"px-3 py-2 text-right font-semibold tabular-nums",
												isCredit ? "text-emerald-700" : "text-rose-700",
											)}
										>
											{signed}
										</td>
										<td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
											{formatMoney(tx.balance_after)}
										</td>
										<td className="px-3 py-2 font-mono text-[12px]">
											{tx.sales_order ? (
												<button
													type="button"
													onClick={() => {
														if (tx.sales_order) setOpenId(tx.sales_order.id);
													}}
													className="text-sky-700 hover:underline"
												>
													{tx.sales_order.so_number}
												</button>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</td>
										<td className="px-3 py-2 text-muted-foreground">{by}</td>
										<td className="px-3 py-2 text-muted-foreground">
											{tx.remarks ?? "—"}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
			<SalesOrderDetailDialog
				open={openId !== null}
				onOpenChange={(open) => {
					if (!open) setOpenId(null);
				}}
				salesOrderId={openId}
			/>
		</div>
	);
}
