import { RawNumericInput } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils";
import { money } from "./helpers";
import { Row, Toggle } from "./ui-primitives";

type Props = {
	totalTax: number;
	totalDiscount: number;
	rawTotal: number;
	total: number;
	rounding: number;
	requireRounding: boolean;
	setRequireRounding: (v: boolean) => void;
	roundedTotalInput: string;
	setRoundedTotalInput: (v: string) => void;
	roundingExceedsLimit: boolean;

	totalPaid: number;
	balanceDiff: number;
	isOverpaid: boolean;
	isUnderpaid: boolean;

	linesCount: number;
	allocSum: number;
	allocSumMismatch: boolean;
	autoAllocatePartial: () => void;
	forcesFullPayment: boolean;
};

export function TotalsPanel({
	totalTax,
	totalDiscount,
	rawTotal,
	total,
	rounding,
	requireRounding,
	setRequireRounding,
	roundedTotalInput,
	setRoundedTotalInput,
	roundingExceedsLimit,
	totalPaid,
	balanceDiff,
	isOverpaid,
	isUnderpaid,
	linesCount,
	allocSum,
	allocSumMismatch,
	autoAllocatePartial,
	forcesFullPayment,
}: Props) {
	return (
		<div className="space-y-1.5 text-sm">
			<Row
				label="Tax"
				value={
					<span className="tabular-nums text-foreground">
						{money(totalTax)}
					</span>
				}
			/>
			<Row
				label="Discount"
				value={
					<span className="tabular-nums text-foreground">
						{money(totalDiscount)}
					</span>
				}
			/>
			<div className="border-t pt-1.5">
				<Row
					label="Total (MYR)"
					value={
						<span
							className={cn(
								"tabular-nums font-semibold text-foreground",
								requireRounding &&
									"line-through text-muted-foreground font-normal",
							)}
						>
							{money(rawTotal)}
						</span>
					}
				/>
			</div>

			<Row
				label={
					<div className="flex items-center gap-2">
						<span>Rounding</span>
						<Toggle
							checked={requireRounding}
							onCheckedChange={(v) => {
								setRequireRounding(v);
								if (v) {
									setRoundedTotalInput(Math.round(rawTotal).toFixed(2));
								} else {
									setRoundedTotalInput("");
								}
							}}
						/>
					</div>
				}
				value={
					requireRounding ? (
						<div className="flex flex-col items-end gap-0.5">
							<RawNumericInput
								value={roundedTotalInput}
								onChange={setRoundedTotalInput}
								min={rawTotal - 1}
								max={rawTotal + 1}
								decimals={2}
								placeholder={rawTotal.toFixed(2)}
								className={cn(
									"h-7 w-28 text-right text-xs tabular-nums",
									roundingExceedsLimit &&
										"border-red-500 focus-visible:ring-red-500",
								)}
							/>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() =>
										setRoundedTotalInput(Math.floor(rawTotal).toFixed(2))
									}
									className="rounded border border-muted bg-white px-1 py-0.5 text-[9px] font-medium text-muted-foreground hover:bg-muted"
									title="Round down to the nearest ringgit"
								>
									↓ RM1
								</button>
								<button
									type="button"
									onClick={() =>
										setRoundedTotalInput(Math.ceil(rawTotal).toFixed(2))
									}
									className="rounded border border-muted bg-white px-1 py-0.5 text-[9px] font-medium text-muted-foreground hover:bg-muted"
									title="Round up to the nearest ringgit"
								>
									↑ RM1
								</button>
								<button
									type="button"
									onClick={() =>
										setRoundedTotalInput(
											(Math.round(rawTotal * 20) / 20).toFixed(2),
										)
									}
									className="rounded border border-muted bg-white px-1 py-0.5 text-[9px] font-medium text-muted-foreground hover:bg-muted"
									title="Round to the nearest 0.05"
								>
									0.05
								</button>
							</div>
							{rounding !== 0 && !roundingExceedsLimit && (
								<span className="text-[10px] text-muted-foreground">
									{rounding > 0 ? "+" : ""}
									{money(rounding)}
								</span>
							)}
							{roundingExceedsLimit && (
								<span className="text-[10px] font-medium text-red-600">
									Exceeds RM 1.00 limit
								</span>
							)}
						</div>
					) : (
						<span className="tabular-nums text-muted-foreground">—</span>
					)
				}
			/>

			{requireRounding && (
				<div className="rounded-md bg-blue-50 px-3 py-2">
					<Row
						label={
							<span className="text-xs font-semibold text-foreground">
								Total After Rounding (MYR)
							</span>
						}
						value={
							<span className="tabular-nums text-base font-bold text-blue-700">
								{money(total)}
							</span>
						}
					/>
				</div>
			)}

			<Row
				label="Paid"
				value={
					<span className="tabular-nums text-foreground">
						{money(totalPaid)}
					</span>
				}
			/>
			{total > 0 && (
				<div className="h-1 overflow-hidden rounded-full bg-muted">
					<div
						className={cn(
							"h-full transition-all",
							isOverpaid
								? "bg-red-500"
								: isUnderpaid
									? "bg-amber-400"
									: "bg-emerald-500",
						)}
						style={{
							width: `${Math.min(100, (totalPaid / total) * 100)}%`,
						}}
					/>
				</div>
			)}
			<Row
				label={isOverpaid ? "Over" : "Balance"}
				value={
					<span
						className={cn(
							"tabular-nums font-semibold",
							isOverpaid
								? "text-red-600"
								: isUnderpaid
									? "text-amber-600"
									: "text-foreground",
						)}
					>
						{money(Math.abs(balanceDiff))}
					</span>
				}
			/>

			{isUnderpaid && totalPaid > 0 && linesCount > 0 && (
				<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px]">
					<div className="flex items-center justify-between">
						<span className="font-medium text-amber-900">
							Allocated to items
						</span>
						<span
							className={cn(
								"tabular-nums font-semibold",
								allocSumMismatch ? "text-red-600" : "text-emerald-700",
							)}
						>
							{money(allocSum)} / {money(totalPaid)}
						</span>
					</div>
					<button
						type="button"
						onClick={autoAllocatePartial}
						className="mt-1.5 w-full rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
					>
						Auto-allocate (required-full first)
					</button>
					{forcesFullPayment && (
						<div className="mt-1.5 text-[10px] text-red-700">
							Every item requires full payment — partial is not allowed for this
							bill.
						</div>
					)}
				</div>
			)}
			{isOverpaid && (
				<div className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-700">
					Over by RM {money(-balanceDiff)}. Reduce a payment row below.
				</div>
			)}
		</div>
	);
}
