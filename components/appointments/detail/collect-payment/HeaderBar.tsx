import { X } from "lucide-react";
import { EmployeePicker } from "@/components/employees/EmployeePicker";
import { PercentInput } from "@/components/ui/numeric-input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import { cn } from "@/lib/utils";
import { money } from "./helpers";
import type { Allocation } from "./types";
import { Toggle } from "./ui-primitives";

type Props = {
	customerName: string;
	customerCode: string;
	total: number;
	itemized: boolean;
	onItemizedChange: (v: boolean) => void;
	globalAlloc: Allocation[];
	allEmployees: EmployeeWithRelations[];
	onGlobalEmpChange: (idx: number, empId: string | null) => void;
	onGlobalPercentChange: (idx: number, pct: number) => void;
	onBalanceGlobal: () => void;
	onClose: () => void;
	closeDisabled: boolean;
};

export function HeaderBar({
	customerName,
	customerCode,
	total,
	itemized,
	onItemizedChange,
	globalAlloc,
	allEmployees,
	onGlobalEmpChange,
	onGlobalPercentChange,
	onBalanceGlobal,
	onClose,
	closeDisabled,
}: Props) {
	const filled = globalAlloc.filter((a) => a.employeeId);
	const sum = filled.reduce((s, a) => s + a.percent, 0);
	const sumInvalid = Math.abs(sum - 100) > 0.01;

	return (
		<div className="flex items-start justify-between border-b bg-white px-6 py-3">
			<div className="flex flex-col">
				<div className="text-lg font-semibold tracking-wide text-blue-600">
					{customerName.toUpperCase()}
				</div>
				{customerCode && (
					<div className="text-xs text-muted-foreground">{customerCode}</div>
				)}
				<div className="mt-0.5 text-xs text-muted-foreground">
					MYR {money(total)}
				</div>
				<div className="text-[10px] text-muted-foreground">Cash / Wallet</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground">
						Itemised Allocation?
					</span>
					<Toggle checked={itemized} onCheckedChange={onItemizedChange} />
				</div>

				{/* Global allocation slots — kept mounted when itemised so the
				    toggle + close button don't shift. */}
				<div
					className={cn("flex items-end gap-2", itemized && "invisible")}
					aria-hidden={itemized}
				>
					{globalAlloc.map((slot, idx) => (
						<div
							key={`global-${idx}`}
							className="flex flex-col items-center gap-1"
						>
							<EmployeePicker
								employees={allEmployees}
								value={slot.employeeId || null}
								onChange={(id) => onGlobalEmpChange(idx, id)}
								size="sm"
								placeholder={`Employee ${idx + 1}`}
							/>
							{slot.employeeId ? (
								<div className="flex items-center gap-0.5">
									<PercentInput
										value={slot.percent}
										onChange={(n) => onGlobalPercentChange(idx, n)}
										className="h-5 w-14 px-1 text-center text-[10px] tabular-nums"
										aria-label="Employee percent"
									/>
									<span className="text-[10px] text-muted-foreground">%</span>
								</div>
							) : (
								<div className="h-5" />
							)}
						</div>
					))}
					{filled.length > 0 && (
						<div className="flex items-center gap-1.5 text-[10px] tabular-nums text-muted-foreground">
							<span className={cn(sumInvalid && "text-red-600 font-medium")}>
								{sum.toFixed(0)}%
							</span>
							{sumInvalid && (
								<button
									type="button"
									onClick={onBalanceGlobal}
									className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-amber-900 hover:bg-amber-50"
								>
									Balance
								</button>
							)}
						</div>
					)}
				</div>

				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								onClick={onClose}
								disabled={closeDisabled}
								aria-label="Close"
								className="ml-2 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
							>
								<X className="size-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent>Close</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	);
}
