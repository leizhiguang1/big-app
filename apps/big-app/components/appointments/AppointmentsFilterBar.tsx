"use client";

import {
	AlignJustify,
	CalendarDays,
	CalendarOff,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Grid2x2,
	Search,
	X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { AppointmentsAdvancedFilter } from "@/components/appointments/AppointmentsAdvancedFilter";
import { ColumnSettingsPopover } from "@/components/appointments/ColumnSettingsPopover";
import { MonthYearPicker } from "@/components/appointments/MonthYearPicker";
import { Calendar } from "@/components/ui/calendar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ColumnKey } from "@/lib/appointments/columns";
import type {
	AppointmentPaymentStatus,
	AppointmentTypeFilter,
} from "@/lib/appointments/filters";
import {
	type DisplayStyle,
	type ResourceMode,
	type TimeScope,
	VALID_SCOPES,
} from "@/lib/calendar/layout";
import type { AppointmentStatus } from "@/lib/constants/appointment-status";
import {
	addDays,
	fmtDate,
	fmtWeekRange,
	getWeekStart,
	parseDate,
	shiftCoversDate,
} from "@/lib/roster/week";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import type { OutletWithRoomCount, Room } from "@/lib/services/outlets";
import { cn } from "@/lib/utils";

export type ResourceFilter = {
	mode: ResourceMode;
	value: string | null; // null = "All"
};

const WEEKDAY_LONG = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];
const MONTH_LONG = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

function formatDayLong(d: Date): string {
	return `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMonthLong(d: Date): string {
	return `${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

type Props = {
	outlets: OutletWithRoomCount[];
	outletId: string;
	display: DisplayStyle;
	scope: TimeScope;
	dateStr: string;
	resource: ResourceFilter;
	rooms: Room[];
	employees: RosterEmployee[];
	shifts: EmployeeShift[];
	statusFilter: AppointmentStatus[];
	typeFilter: AppointmentTypeFilter[];
	paymentStatusFilter: AppointmentPaymentStatus[];
	columnOrder: ColumnKey[];
	visibleColumns: ColumnKey[];
	onDisplayChange: (next: DisplayStyle) => void;
	onScopeChange: (next: TimeScope) => void;
	onColumnChange: (order: ColumnKey[], visible: ColumnKey[]) => void;
};

export function AppointmentsFilterBar({
	outlets,
	outletId,
	display,
	scope,
	dateStr,
	resource,
	rooms,
	employees,
	shifts,
	statusFilter,
	typeFilter,
	paymentStatusFilter,
	columnOrder,
	visibleColumns,
	onDisplayChange,
	onScopeChange,
	onColumnChange,
}: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [pending, startTransition] = useTransition();
	const [datePickerOpen, setDatePickerOpen] = useState(false);

	// Local search state — debounced into URL param `q`
	const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const date = parseDate(dateStr);
	const today = fmtDate(new Date());
	const isToday = dateStr === today;

	const navigate = (next: Partial<Record<string, string | null>>) => {
		const params = new URLSearchParams(searchParams.toString());
		for (const [k, v] of Object.entries(next)) {
			if (v === null || v === undefined || v === "") params.delete(k);
			else params.set(k, v);
		}
		const qs = params.toString();
		startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
	};

	const handleSearch = (value: string) => {
		setInputValue(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			navigate({ q: value || null });
		}, 350);
	};

	const handleClear = () => {
		setInputValue("");
		if (debounceRef.current) clearTimeout(debounceRef.current);
		navigate({ q: null });
	};

	const shiftDate = (delta: number) => {
		let next: Date;
		if (scope === "day") next = addDays(date, delta);
		else if (scope === "week") next = addDays(date, delta * 7);
		else {
			next = new Date(date);
			next.setMonth(next.getMonth() + delta);
		}
		navigate({ date: fmtDate(next) });
	};

	const dateLabel = (() => {
		if (scope === "day") return formatDayLong(date);
		if (scope === "week") return fmtWeekRange(getWeekStart(date));
		return formatMonthLong(date);
	})();

	const onResourcePick = (mode: ResourceMode, value: string | null) => {
		navigate({
			resource: mode,
			rid: mode === "room" ? (value ?? null) : null,
			eid: mode === "employee" ? (value ?? null) : null,
		});
	};

	const rosteredEmployeeIds = useMemo(() => {
		const dates: string[] = [];
		if (scope === "day") {
			dates.push(dateStr);
		} else if (scope === "week") {
			const start = getWeekStart(date);
			for (let i = 0; i < 7; i++) dates.push(fmtDate(addDays(start, i)));
		} else {
			const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
			const gridStart = getWeekStart(firstOfMonth);
			for (let i = 0; i < 42; i++) dates.push(fmtDate(addDays(gridStart, i)));
		}
		const ids = new Set<string>();
		for (const s of shifts) {
			if (ids.has(s.employee_id)) continue;
			if (dates.some((d) => shiftCoversDate(s, d))) {
				ids.add(s.employee_id);
			}
		}
		return ids;
	}, [shifts, scope, dateStr, date]);

	const sortedEmployees = useMemo(
		() =>
			[...employees].sort((a, b) =>
				`${a.first_name} ${a.last_name}`.localeCompare(
					`${b.first_name} ${b.last_name}`,
				),
			),
		[employees],
	);
	const rosteredEmployees = sortedEmployees.filter((e) =>
		rosteredEmployeeIds.has(e.id),
	);
	const offRosterEmployees = sortedEmployees.filter(
		(e) => !rosteredEmployeeIds.has(e.id),
	);

	const resourceLabel = (() => {
		if (resource.value === null) {
			return resource.mode === "room" ? "All Rooms" : "All Staff";
		}
		if (resource.mode === "room") {
			return rooms.find((r) => r.id === resource.value)?.name ?? "Room";
		}
		const e = employees.find((emp) => emp.id === resource.value);
		return e ? `${e.first_name} ${e.last_name}` : "Staff";
	})();
	const resourceActive = resource.value !== null;
	const filterEmployeeOffRoster =
		resource.mode === "employee" &&
		resource.value !== null &&
		!rosteredEmployeeIds.has(resource.value);
	const offRosterTooltip = `Not rostered this ${scope}`;

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2",
				pending && "opacity-70",
			)}
		>
			{/* Resource filter */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className={cn(
							"inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2 text-xs font-medium hover:bg-muted",
							resourceActive && "border-primary/40 bg-primary/5",
							filterEmployeeOffRoster &&
								"border-amber-400/60 bg-amber-50 dark:bg-amber-900/15",
						)}
					>
						<span className="capitalize">{resourceLabel}</span>
						{filterEmployeeOffRoster ? (
							<span
								role="img"
								aria-label={offRosterTooltip}
								title={offRosterTooltip}
								className="inline-flex size-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300"
							>
								<CalendarOff className="size-3" aria-hidden />
							</span>
						) : (
							resourceActive && (
								<span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
									1
								</span>
							)
						)}
						<ChevronDown className="size-3.5 text-muted-foreground" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="min-w-56">
					<DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Room
					</DropdownMenuLabel>
					<DropdownMenuItem
						onSelect={() => onResourcePick("room", null)}
						className={cn(
							resource.mode === "room" &&
								resource.value === null &&
								"font-bold",
						)}
					>
						All Rooms
					</DropdownMenuItem>
					{rooms.map((r) => (
						<DropdownMenuItem
							key={r.id}
							onSelect={() => onResourcePick("room", r.id)}
							className={cn(
								"pl-6",
								resource.mode === "room" &&
									resource.value === r.id &&
									"font-bold",
							)}
						>
							{r.name}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Employee
					</DropdownMenuLabel>
					<DropdownMenuItem
						onSelect={() => onResourcePick("employee", null)}
						className={cn(
							resource.mode === "employee" &&
								resource.value === null &&
								"font-bold",
						)}
					>
						All Staff
					</DropdownMenuItem>
					{rosteredEmployees.map((e) => (
						<DropdownMenuItem
							key={e.id}
							onSelect={() => onResourcePick("employee", e.id)}
							className={cn(
								"pl-6",
								resource.mode === "employee" &&
									resource.value === e.id &&
									"font-bold",
							)}
						>
							{e.first_name} {e.last_name}
						</DropdownMenuItem>
					))}
					{rosteredEmployees.length > 0 && offRosterEmployees.length > 0 && (
						<div
							className="mx-2 my-1 border-t border-dashed border-border/70"
							aria-hidden
						/>
					)}
					{offRosterEmployees.map((e) => (
						<DropdownMenuItem
							key={e.id}
							onSelect={() => onResourcePick("employee", e.id)}
							className={cn(
								"pl-6 text-muted-foreground/70",
								resource.mode === "employee" &&
									resource.value === e.id &&
									"font-bold text-foreground",
							)}
						>
							{e.first_name} {e.last_name}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Date navigation */}
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={() => shiftDate(-1)}
					aria-label="Previous"
					className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted/80"
				>
					<ChevronLeft className="size-4" />
				</button>
				<button
					type="button"
					onClick={() => navigate({ date: today })}
					className={cn(
						"h-7 rounded-md px-2.5 text-[11px] font-semibold uppercase tracking-wide",
						isToday
							? "bg-primary text-primary-foreground"
							: "bg-muted text-muted-foreground hover:bg-muted/80",
					)}
				>
					Today
				</button>
				<button
					type="button"
					onClick={() => shiftDate(1)}
					aria-label="Next"
					className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted/80"
				>
					<ChevronRight className="size-4" />
				</button>
			</div>

			{/* Date label — click to open calendar picker */}
			<Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						className="shrink-0 rounded-md px-1.5 py-0.5 font-semibold text-foreground text-xs hover:bg-muted"
					>
						{dateLabel}
					</button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-0">
					{scope === "month" ? (
						<MonthYearPicker
							value={date}
							onSelect={(d) => {
								navigate({ date: fmtDate(d) });
								setDatePickerOpen(false);
							}}
						/>
					) : (
						<Calendar
							mode="single"
							selected={date}
							defaultMonth={date}
							onSelect={(d) => {
								if (!d) return;
								navigate({ date: fmtDate(d) });
								setDatePickerOpen(false);
							}}
							showOutsideDays
							captionLayout="dropdown"
						/>
					)}
				</PopoverContent>
			</Popover>

			<div className="flex-1" />

			{/* Display style toggle (Calendar/List/Grid) */}
			<div className="inline-flex h-8 items-center rounded-md bg-muted p-0.5">
				{(
					[
						{ k: "list", icon: AlignJustify, label: "List view" },
						{ k: "grid", icon: Grid2x2, label: "Grid view" },
						{ k: "calendar", icon: CalendarDays, label: "Calendar view" },
					] as const
				).map(({ k, icon: Icon, label }) => (
					<Tooltip key={k}>
						<TooltipTrigger asChild>
							<button
								type="button"
								onClick={() => onDisplayChange(k)}
								aria-label={label}
								className={cn(
									"flex size-7 items-center justify-center rounded transition",
									display === k
										? "bg-background text-primary shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="size-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent>{label}</TooltipContent>
					</Tooltip>
				))}
			</div>

			{/* Time scope toggle (D/W/M) */}
			<div className="inline-flex h-8 items-center rounded-md bg-muted p-0.5">
				{(
					[
						{ k: "day", label: "D", full: "Day view" },
						{ k: "week", label: "W", full: "Week view" },
						{ k: "month", label: "M", full: "Month view" },
					] as const
				).map(({ k, label, full }) => {
					const allowed = VALID_SCOPES[display].includes(k);
					return (
						<Tooltip key={k}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => onScopeChange(k)}
									disabled={!allowed}
									aria-label={full}
									className={cn(
										"flex size-7 items-center justify-center rounded font-semibold text-[11px] transition",
										scope === k
											? "bg-background text-primary shadow-sm"
											: allowed
												? "text-muted-foreground hover:text-foreground"
												: "cursor-not-allowed text-muted-foreground/30",
									)}
								>
									{label}
								</button>
							</TooltipTrigger>
							<TooltipContent>
								{allowed ? full : `${full} (not available in this layout)`}
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>

			{/* Column settings — list view only */}
			{display === "list" && (
				<ColumnSettingsPopover
					columnOrder={columnOrder}
					visibleColumns={visibleColumns}
					onChange={onColumnChange}
				/>
			)}

			{/* Advanced filter (status + type + payment) */}
			<AppointmentsAdvancedFilter
				statuses={statusFilter}
				types={typeFilter}
				paymentStatuses={paymentStatusFilter}
				onApply={({ statuses, types, paymentStatuses }) => {
					navigate({
						status: statuses.length > 0 ? statuses.join(",") : null,
						atype: types.length > 0 ? types.join(",") : null,
						pstatus:
							paymentStatuses.length > 0 ? paymentStatuses.join(",") : null,
					});
				}}
			/>

			{/* Search */}
			<div className="relative">
				<Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search customers, booking ref…"
					className="h-8 w-48 pl-7 pr-6 text-xs"
					value={inputValue}
					onChange={(e) => handleSearch(e.target.value)}
				/>
				{inputValue && (
					<button
						type="button"
						onClick={handleClear}
						className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
					>
						<X className="size-3" />
					</button>
				)}
			</div>
		</div>
	);
}
