"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Coffee, Moon, Trash2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	createShiftAction,
	deleteShiftAction,
	updateShiftAction,
} from "@/lib/actions/employee-shifts";
import { addDays, fmtDate, parseDate } from "@/lib/roster/week";
import {
	type EmployeeShiftInput,
	employeeShiftInputSchema,
	type ShiftBreak,
} from "@/lib/schemas/employee-shifts";
import type {
	EmployeeShift,
	RosterEmployee,
} from "@/lib/services/employee-shifts";
import { cn } from "@/lib/utils";

type Props = {
	open: boolean;
	onClose: () => void;
	employee: RosterEmployee;
	outletId: string;
	shiftDate: string;
	shift: EmployeeShift | null;
};

const DEFAULT_START = "09:00";
const DEFAULT_END = "19:00";
const DEFAULT_BREAKS: ShiftBreak[] = [
	{ name: "Break 1", start: "13:00", end: "14:00" },
	{ name: "Break 2", start: "18:00", end: "19:00" },
];
const MAX_BREAKS = 10;

const SELECT_CLASS =
	"h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function coerceBreaks(raw: unknown): ShiftBreak[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.filter(
			(b): b is ShiftBreak =>
				typeof b === "object" &&
				b !== null &&
				typeof (b as ShiftBreak).name === "string" &&
				typeof (b as ShiftBreak).start === "string" &&
				typeof (b as ShiftBreak).end === "string",
		)
		.map((b) => ({ name: b.name, start: b.start, end: b.end }));
}

function buildDefaults(args: {
	employee: RosterEmployee;
	outletId: string;
	shiftDate: string;
	shift: EmployeeShift | null;
}): EmployeeShiftInput {
	const s = args.shift;
	if (!s) {
		return {
			employee_id: args.employee.id,
			outlet_id: args.outletId,
			shift_date: args.shiftDate,
			start_time: DEFAULT_START,
			end_time: DEFAULT_END,
			is_overnight: false,
			repeat_type: "weekly",
			repeat_end: null,
			breaks: [],
			remarks: undefined,
		};
	}
	return {
		employee_id: s.employee_id,
		outlet_id: s.outlet_id,
		shift_date: s.shift_date,
		start_time: s.start_time.slice(0, 5),
		end_time: s.end_time.slice(0, 5),
		is_overnight: s.is_overnight,
		repeat_type: (s.repeat_type as "none" | "weekly") ?? "weekly",
		repeat_end: s.repeat_end,
		breaks: coerceBreaks(s.breaks),
		remarks: s.remarks ?? undefined,
	};
}

export function ShiftDialog({
	open,
	onClose,
	employee,
	outletId,
	shiftDate,
	shift,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const form = useForm<EmployeeShiftInput>({
		resolver: zodResolver(employeeShiftInputSchema),
		defaultValues: buildDefaults({ employee, outletId, shiftDate, shift }),
	});

	const breaksArray = useFieldArray({
		control: form.control,
		name: "breaks",
	});

	useEffect(() => {
		if (open) {
			form.reset(buildDefaults({ employee, outletId, shiftDate, shift }));
			setServerError(null);
		}
	}, [open, employee, outletId, shiftDate, shift, form]);

	const startTime = form.watch("start_time");
	const endTime = form.watch("end_time");
	const isOvernight = form.watch("is_overnight");
	const repeatType = form.watch("repeat_type");
	const repeatEnd = form.watch("repeat_end");
	const breaks = form.watch("breaks");

	const isOngoing = !repeatEnd;

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				if (shift) {
					await updateShiftAction(shift.id, values);
				} else {
					await createShiftAction(values);
				}
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	});

	const onDelete = () => {
		if (!shift) return;
		startTransition(async () => {
			try {
				await deleteShiftAction(shift.id);
				setConfirmOpen(false);
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	};

	const setOngoing = (next: boolean) => {
		if (next) {
			form.setValue("repeat_end", null, { shouldDirty: true });
		} else if (!repeatEnd) {
			const anchor = parseDate(form.getValues("shift_date"));
			form.setValue("repeat_end", fmtDate(addDays(anchor, 28)), {
				shouldDirty: true,
			});
		}
	};

	const addBreak = () => {
		if (breaks.length >= MAX_BREAKS) return;
		const next: ShiftBreak =
			breaks.length < DEFAULT_BREAKS.length
				? {
						...DEFAULT_BREAKS[breaks.length],
						name: `Break ${breaks.length + 1}`,
					}
				: { name: `Break ${breaks.length + 1}`, start: "13:00", end: "14:00" };
		breaksArray.append(next);
	};

	const errors = form.formState.errors;
	const displayName = `${employee.first_name} ${employee.last_name}`.trim();
	const initials =
		`${employee.first_name[0] ?? ""}${employee.last_name[0] ?? ""}`.toUpperCase() ||
		"?";
	const shiftLabel = startTime && endTime ? `${startTime} – ${endTime}` : "—";

	return (
		<>
			<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
				<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
					<DialogHeader className="sr-only">
						<DialogTitle>{shift ? "Edit shift" : "Add shift"}</DialogTitle>
						<DialogDescription>
							{displayName} on {shiftDate}
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
						<div className="flex min-h-0 flex-1">
							{/* Sidebar */}
							<aside className="flex w-56 shrink-0 flex-col items-center gap-2 border-r bg-muted/30 p-6 text-center">
								<Avatar className="size-20">
									<AvatarFallback className="text-lg">
										{initials}
									</AvatarFallback>
								</Avatar>
								<p className="font-semibold text-sm leading-tight">
									{displayName}
								</p>
								<p className="text-muted-foreground text-xs">
									Edit Working Hours
								</p>
								<div className="mt-2 h-0.5 w-12 rounded-full bg-primary" />
								<p className="mt-2 text-muted-foreground text-xs uppercase tracking-wide">
									Shift
								</p>
								<p className="font-semibold text-sm">{shiftLabel}</p>
								<p className="text-muted-foreground text-xs">{shiftDate}</p>

								<label className="mt-4 flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										className="size-4 accent-primary"
										{...form.register("is_overnight")}
									/>
									<span className="flex items-center gap-1">
										<Moon className="size-3.5 text-muted-foreground" />
										Overnight
									</span>
								</label>
							</aside>

							{/* Main pane */}
							<div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
								<div className="grid grid-cols-2 gap-4">
									<Field
										label="Start"
										htmlFor="shift-start"
										error={errors.start_time?.message}
									>
										<Input
											id="shift-start"
											type="time"
											{...form.register("start_time")}
										/>
									</Field>
									<Field
										label="End"
										htmlFor="shift-end"
										error={errors.end_time?.message}
									>
										<Input
											id="shift-end"
											type="time"
											{...form.register("end_time")}
										/>
										{isOvernight && (
											<p className="text-muted-foreground text-xs">
												Ends the next day
											</p>
										)}
									</Field>
								</div>

								<Field label="Repeats" htmlFor="shift-repeat">
									<select
										id="shift-repeat"
										className={SELECT_CLASS}
										{...form.register("repeat_type", {
											onChange: (e) => {
												if (e.target.value === "none") {
													form.setValue("repeat_end", null);
												}
											},
										})}
									>
										<option value="weekly">Weekly</option>
										<option value="none">Don't Repeat</option>
									</select>
								</Field>

								{repeatType === "weekly" && (
									<div className="flex flex-col gap-2">
										<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
											End Repeat
										</span>
										<button
											type="button"
											onClick={() => setOngoing(!isOngoing)}
											className="flex items-center gap-2 text-sm"
										>
											<span
												className={cn(
													"flex size-5 items-center justify-center rounded-full border-2",
													isOngoing
														? "border-emerald-500 bg-emerald-500 text-white"
														: "border-muted-foreground/40",
												)}
											>
												{isOngoing && (
													<svg
														viewBox="0 0 24 24"
														className="size-3"
														fill="none"
														stroke="currentColor"
														strokeWidth="4"
													>
														<title>Ongoing</title>
														<path d="M5 13l4 4L19 7" />
													</svg>
												)}
											</span>
											Ongoing
										</button>
										{!isOngoing && (
											<Input
												type="date"
												value={repeatEnd ?? ""}
												onChange={(e) =>
													form.setValue("repeat_end", e.target.value || null, {
														shouldDirty: true,
													})
												}
												min={form.getValues("shift_date")}
											/>
										)}
										{errors.repeat_end?.message && (
											<p className="text-destructive text-xs">
												{errors.repeat_end.message}
											</p>
										)}
									</div>
								)}

								{/* Breaks */}
								<div className="flex flex-col gap-2">
									<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
										Breaks
									</span>
									<div className="flex flex-wrap gap-3">
										{breaksArray.fields.map((field, idx) => (
											<div
												key={field.id}
												className="relative flex w-44 flex-col gap-2 rounded-md border bg-background p-3"
											>
												<button
													type="button"
													onClick={() => breaksArray.remove(idx)}
													className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-destructive"
													aria-label="Remove break"
												>
													<X className="size-3.5" />
												</button>
												<Input
													className="h-7 text-xs"
													{...form.register(`breaks.${idx}.name` as const)}
												/>
												<div className="flex flex-col gap-1">
													<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
														Start
													</span>
													<Input
														type="time"
														className="h-7 text-xs"
														{...form.register(`breaks.${idx}.start` as const)}
													/>
												</div>
												<div className="flex flex-col gap-1">
													<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
														End
													</span>
													<Input
														type="time"
														className="h-7 text-xs"
														{...form.register(`breaks.${idx}.end` as const)}
													/>
												</div>
											</div>
										))}
										{breaks.length < MAX_BREAKS && (
											<button
												type="button"
												onClick={addBreak}
												className="flex h-[148px] w-44 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-emerald-600 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
											>
												<Coffee className="size-5" />
												<span className="font-semibold text-xs">Add Break</span>
											</button>
										)}
									</div>
								</div>

								<Field label="Remarks" htmlFor="shift-remarks">
									<textarea
										id="shift-remarks"
										rows={3}
										className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
										placeholder="Remarks"
										{...form.register("remarks")}
									/>
								</Field>

								{serverError && (
									<p className="text-destructive text-sm">{serverError}</p>
								)}
							</div>
						</div>

						<DialogFooter className="flex items-center justify-between gap-2 border-t bg-muted/20 px-4 py-3 sm:justify-between">
							<div>
								{shift && (
									<Button
										type="button"
										variant="destructive"
										size="sm"
										onClick={() => setConfirmOpen(true)}
										disabled={pending}
									>
										<Trash2 className="size-4" />
										Delete
									</Button>
								)}
							</div>
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={onClose}
								>
									Cancel
								</Button>
								<Button type="submit" size="sm" disabled={pending}>
									{pending ? "Saving…" : shift ? "Save changes" : "Add shift"}
								</Button>
							</div>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Delete shift?"
				description={`Remove ${displayName}'s shift starting ${shiftDate}. This cannot be undone.`}
				confirmLabel="Delete"
				variant="destructive"
				pending={pending}
				onConfirm={onDelete}
			/>
		</>
	);
}

function Field({
	label,
	htmlFor,
	error,
	children,
}: {
	label: string;
	htmlFor?: string;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label
				htmlFor={htmlFor}
				className="font-medium text-muted-foreground text-xs uppercase tracking-wide"
			>
				{label}
			</label>
			{children}
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
}
