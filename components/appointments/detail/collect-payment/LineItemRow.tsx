import { ChevronDown, ChevronUp, X } from "lucide-react";
import { EmployeePicker } from "@/components/employees/EmployeePicker";
import { Input } from "@/components/ui/input";
import {
	MoneyInput,
	PercentInput,
	QtyInput,
	RawNumericInput,
} from "@/components/ui/numeric-input";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { ServiceWithCategory } from "@/lib/services/services";
import type { Tax } from "@/lib/services/taxes";
import { cn } from "@/lib/utils";
import { capMyrForLine, lineGross, lineTaxAmount, money } from "./helpers";
import type { Allocation, Line } from "./types";

type Props = {
	line: Line;
	lineDiscount: number;
	lineNet: number;
	taxes: Tax[];
	service: ServiceWithCategory | null;
	capPct: number | null;
	requiresFullPay: boolean;

	isExpanded: boolean;
	onToggleExpanded: () => void;
	remarksOpen: boolean;
	onToggleRemarks: () => void;

	updateLine: (patch: Partial<Line>) => void;

	showPaymentAlloc: boolean;
	linePayAlloc: string;
	onLinePayAllocChange: (v: string) => void;
	lineAllocOver: boolean;
	lineAllocShort: boolean;

	itemized: boolean;
	allEmployees: EmployeeWithRelations[];
	lineEmpAlloc: Allocation[];
	onLineEmpChange: (idx: number, empId: string | null) => void;
	onLinePercentChange: (idx: number, pct: number) => void;
	onBalanceEmpLine: () => void;

	onRemove?: () => void;
};

export function LineItemRow({
	line,
	lineDiscount,
	lineNet,
	taxes,
	service,
	capPct,
	requiresFullPay,
	isExpanded,
	onToggleExpanded,
	remarksOpen,
	onToggleRemarks,
	updateLine,
	showPaymentAlloc,
	linePayAlloc,
	onLinePayAllocChange,
	lineAllocOver,
	lineAllocShort,
	itemized,
	allEmployees,
	lineEmpAlloc,
	onLineEmpChange,
	onLinePercentChange,
	onBalanceEmpLine,
	onRemove,
}: Props) {
	const activeTaxes = taxes.filter((t) => t.is_active);
	const gross = lineGross(line);
	const netTotal = Math.max(0, gross - lineDiscount);
	const taxAmt = lineTaxAmount(line, taxes, lineDiscount);
	const capMyr = capMyrForLine(line, capPct);
	const discountMax =
		line.discount_type === "percent"
			? capPct != null
				? Math.min(100, capPct)
				: 100
			: capMyr != null
				? Math.min(gross, capMyr)
				: gross;

	const priceMin =
		service?.price_min != null ? Number(service.price_min) : null;
	const priceMax =
		service?.price_max != null ? Number(service.price_max) : null;
	const priceLocked =
		service != null && service.allow_cash_price_range === false;
	const hasRange = priceMin != null && priceMax != null;
	const priceEditable =
		line.item_type !== "service" || (hasRange && !priceLocked);
	const qtyEditable = line.item_type !== "service";

	return (
		<li className="px-3 py-2.5">
			{/* Row 1: main data */}
			<div className="grid grid-cols-[1fr_56px_96px_80px_24px] items-center gap-1">
				<div className="min-w-0">
					<div className="flex items-center gap-1.5">
						{onRemove && (
							<button
								type="button"
								onClick={onRemove}
								className="-ml-1 flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
								aria-label="Remove item"
							>
								<X className="size-3.5" />
							</button>
						)}
						<span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">
							{line.item_type === "product"
								? "PRD"
								: line.item_type === "charge"
									? "CON"
									: "SVC"}
						</span>
						<span className="truncate text-sm font-medium text-blue-600">
							{line.item_name}
						</span>
						{line.item_type === "service" && requiresFullPay && (
							<span
								className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-700"
								title="Requires full payment — cannot leave an outstanding balance"
							>
								Full pay
							</span>
						)}
						{line.item_type === "service" && !requiresFullPay && (
							<span
								className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700"
								title="Partial payment allowed (Allow Redemption Without Payment)"
							>
								Partial ok
							</span>
						)}
					</div>
				</div>

				{qtyEditable ? (
					<QtyInput
						value={line.quantity}
						onChange={(q) => updateLine({ quantity: q })}
						min={1}
						max={9999}
						className="h-7 text-center text-[11px] tabular-nums"
						aria-label="Quantity"
					/>
				) : (
					<span className="text-center text-sm tabular-nums">
						{line.quantity}
					</span>
				)}

				{priceEditable ? (
					<MoneyInput
						value={line.unit_price}
						onChange={(p) => updateLine({ unit_price: p })}
						min={priceMin ?? 0}
						max={priceMax ?? undefined}
						className="h-7 text-right text-[11px] tabular-nums"
						aria-label="Unit price"
					/>
				) : (
					<span className="text-right text-sm tabular-nums">
						{money(line.unit_price)}
					</span>
				)}

				<span className="text-right text-sm font-medium tabular-nums">
					{money(netTotal)}
				</span>

				<button
					type="button"
					onClick={onToggleExpanded}
					className="flex size-6 items-center justify-center rounded hover:bg-muted"
				>
					{isExpanded ? (
						<ChevronUp className="size-4 text-muted-foreground" />
					) : (
						<ChevronDown className="size-4 text-muted-foreground" />
					)}
				</button>
			</div>

			{/* Row 2: SKU + Tax */}
			<div className="mt-1 flex items-start justify-between">
				{line.sku ? (
					<div className="pl-7 text-[10px] font-mono text-muted-foreground">
						{line.sku}
					</div>
				) : (
					<div />
				)}
				<div className="flex flex-col items-end gap-0.5">
					<select
						value={line.tax_id ?? ""}
						onChange={(e) =>
							updateLine({
								tax_id: e.target.value === "" ? null : e.target.value,
							})
						}
						className="h-5 rounded border bg-background px-1.5 text-[10px] outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
					>
						<option value="">No tax</option>
						{activeTaxes.map((t) => (
							<option key={t.id} value={t.id}>
								({t.name.toUpperCase()}) {Number(t.rate_pct).toFixed(2)}%
							</option>
						))}
					</select>
					{taxAmt > 0 && (
						<span className="text-[10px] text-muted-foreground">
							Tax Amount (MYR): {money(taxAmt)}
						</span>
					)}
				</div>
			</div>

			{isExpanded && (
				<div className="mt-2 space-y-2 border-t border-dashed pt-2 text-[11px]">
					{/* Discount */}
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
						<div className="flex items-center gap-1.5">
							<span className="text-muted-foreground">Discount</span>
							<div className="flex items-center overflow-hidden rounded-md border">
								<RawNumericInput
									value={line.discount_input}
									onChange={(v) => updateLine({ discount_input: v })}
									min={0}
									max={discountMax}
									decimals={line.discount_type === "percent" ? 1 : 2}
									placeholder="0"
									className="h-6 w-16 rounded-none border-0 text-right text-[11px] focus-visible:ring-0"
								/>
								<div className="flex">
									<button
										type="button"
										onClick={() => {
											if (line.discount_type === "percent") return;
											const raw = Number(line.discount_input);
											const nextInput =
												Number.isFinite(raw) && raw > 0 && gross > 0
													? ((raw / gross) * 100).toFixed(1)
													: line.discount_input;
											updateLine({
												discount_type: "percent",
												discount_input: nextInput,
											});
										}}
										className={cn(
											"border-l px-2.5 py-1 text-[11px] font-medium transition-colors",
											line.discount_type === "percent"
												? "bg-blue-600 text-white"
												: "bg-muted/50 text-muted-foreground hover:bg-muted",
										)}
									>
										%
									</button>
									<button
										type="button"
										onClick={() => {
											if (line.discount_type === "amount") return;
											const raw = Number(line.discount_input);
											const nextInput =
												Number.isFinite(raw) && raw > 0
													? ((raw * gross) / 100).toFixed(2)
													: line.discount_input;
											updateLine({
												discount_type: "amount",
												discount_input: nextInput,
											});
										}}
										className={cn(
											"border-l px-2.5 py-1 text-[11px] font-medium transition-colors",
											line.discount_type === "amount"
												? "bg-blue-600 text-white"
												: "bg-muted/50 text-muted-foreground hover:bg-muted",
										)}
									>
										MYR
									</button>
								</div>
							</div>
							<button
								type="button"
								onClick={() =>
									updateLine({
										discount_input: discountMax.toFixed(
											line.discount_type === "percent" ? 1 : 2,
										),
									})
								}
								className="rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50"
								title={`Apply maximum discount (${
									line.discount_type === "percent"
										? `${discountMax.toFixed(1)}%`
										: `RM ${money(discountMax)}`
								})`}
							>
								Max
							</button>
							{line.discount_input !== "" && (
								<button
									type="button"
									onClick={() => updateLine({ discount_input: "" })}
									className="rounded border border-muted bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
								>
									Clear
								</button>
							)}
							{lineDiscount > 0 && (
								<span className="tabular-nums text-muted-foreground">
									-{money(lineDiscount)}
								</span>
							)}
							{capPct != null && (
								<span className="text-[10px] text-muted-foreground">
									Cap {capPct}% (RM {money(capMyr ?? gross)})
								</span>
							)}
						</div>

						{showPaymentAlloc && (
							<div className="flex items-center gap-1.5">
								<span className="text-muted-foreground">
									Payment Allocation (MYR)
								</span>
								<RawNumericInput
									value={linePayAlloc}
									onChange={onLinePayAllocChange}
									min={0}
									max={lineNet}
									decimals={2}
									className={cn(
										"h-6 w-20 text-right text-[11px] tabular-nums",
										(lineAllocOver || lineAllocShort) &&
											"border-red-500 focus-visible:ring-red-500",
									)}
								/>
								<button
									type="button"
									onClick={() => onLinePayAllocChange(lineNet.toFixed(2))}
									className="rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50"
								>
									Max
								</button>
								<button
									type="button"
									onClick={() => onLinePayAllocChange("")}
									className="rounded border border-muted bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
								>
									0
								</button>
								<span className="text-[10px] text-muted-foreground">
									of {money(lineNet)}
								</span>
								{lineAllocOver && (
									<span className="text-[10px] font-medium text-red-600">
										exceeds line total
									</span>
								)}
								{lineAllocShort && (
									<span className="text-[10px] font-medium text-red-600">
										must equal line total
									</span>
								)}
							</div>
						)}
					</div>

					{/* Tooth + Surface */}
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-1.5">
							<span className="text-muted-foreground">Tooth #</span>
							<Input
								value={line.tooth_number}
								onChange={(e) => updateLine({ tooth_number: e.target.value })}
								className="h-6 w-24 text-[11px]"
							/>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="text-muted-foreground">Surface</span>
							<Input
								value={line.surface}
								onChange={(e) => updateLine({ surface: e.target.value })}
								className="h-6 w-24 text-[11px]"
							/>
						</div>
					</div>

					{/* Remarks */}
					<div className="flex items-start gap-1.5">
						<button
							type="button"
							onClick={onToggleRemarks}
							className="mt-0.5 flex shrink-0 items-center gap-0.5 text-muted-foreground hover:text-foreground"
						>
							Remarks
							{remarksOpen ? (
								<ChevronUp className="size-3" />
							) : (
								<ChevronDown className="size-3" />
							)}
						</button>
						{remarksOpen && (
							<textarea
								value={line.remarks}
								onChange={(e) => updateLine({ remarks: e.target.value })}
								maxLength={500}
								rows={1}
								className="min-h-[24px] flex-1 resize-none rounded border border-input bg-transparent px-2 py-0.5 text-[11px] outline-none placeholder:italic placeholder:text-muted-foreground/50 focus-visible:border-ring"
							/>
						)}
					</div>

					{priceMin != null && priceMax != null && (
						<div className="text-[10px] text-muted-foreground">
							Item price range is (MYR) {money(priceMin)} to (MYR){" "}
							{money(priceMax)}
						</div>
					)}

					{itemized && (
						<LineEmployeeAlloc
							slots={lineEmpAlloc}
							allEmployees={allEmployees}
							onEmp={onLineEmpChange}
							onPercent={onLinePercentChange}
							onBalance={onBalanceEmpLine}
							lineId={line.id}
						/>
					)}
				</div>
			)}
		</li>
	);
}

function LineEmployeeAlloc({
	slots,
	allEmployees,
	onEmp,
	onPercent,
	onBalance,
	lineId,
}: {
	slots: Allocation[];
	allEmployees: EmployeeWithRelations[];
	onEmp: (idx: number, empId: string | null) => void;
	onPercent: (idx: number, pct: number) => void;
	onBalance: () => void;
	lineId: string;
}) {
	const filled = slots.filter((a) => a.employeeId);
	const sum = filled.reduce((s, a) => s + a.percent, 0);
	const invalid = Math.abs(sum - 100) > 0.01;
	return (
		<div className="flex flex-wrap items-center gap-2 border-t border-dotted pt-1.5">
			{slots.map((slot, si) => (
				<div key={`la-${lineId}-${si}`} className="flex items-center gap-1">
					<EmployeePicker
						employees={allEmployees}
						value={slot.employeeId || null}
						onChange={(id) => onEmp(si, id)}
						size="sm"
						placeholder={`Employee ${si + 1}`}
					/>
					{slot.employeeId && (
						<>
							<PercentInput
								value={slot.percent}
								onChange={(n) => onPercent(si, n)}
								className="h-5 w-14 px-1 text-center text-[10px] tabular-nums"
								aria-label="Employee percent"
							/>
							<span className="text-[10px] text-muted-foreground">%</span>
						</>
					)}
				</div>
			))}
			{filled.length > 0 && (
				<span className="inline-flex items-center gap-1.5 text-[10px] tabular-nums text-muted-foreground">
					<span className={cn(invalid && "text-red-600 font-medium")}>
						{sum.toFixed(0)}%
					</span>
					{invalid && (
						<button
							type="button"
							onClick={onBalance}
							className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-amber-900 hover:bg-amber-50"
						>
							Balance
						</button>
					)}
				</span>
			)}
		</div>
	);
}
