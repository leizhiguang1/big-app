import { Wallet } from "lucide-react";

export function CustomerCashWalletTab() {
	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-xl border bg-gradient-to-br from-teal-500 to-teal-600 p-6 text-white shadow-sm">
				<div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
					<Wallet className="size-4" />
					Cash Wallet
				</div>
				<div className="mt-3 font-bold text-3xl tabular-nums">MYR 0.00</div>
				<div className="mt-1 text-xs text-white/80">Available balance</div>
			</div>

			<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
				No wallet transactions yet. Top-ups and deductions will appear here.
			</div>
		</div>
	);
}
