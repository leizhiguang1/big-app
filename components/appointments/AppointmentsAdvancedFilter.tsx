"use client";

import { Ban, SlidersHorizontal, User, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	APPOINTMENT_TYPE_FILTERS,
	type AppointmentTypeFilter,
} from "@/lib/appointments/filters";
import {
	APPOINTMENT_STATUS_CONFIG,
	APPOINTMENT_STATUSES,
	type AppointmentStatus,
} from "@/lib/constants/appointment-status";
import { cn } from "@/lib/utils";

const TYPE_FILTER_LABEL: Record<
	AppointmentTypeFilter,
	{ label: string; Icon: typeof User }
> = {
	regular: { label: "Regular", Icon: User },
	walkin: { label: "Walk-in", Icon: UserPlus },
	timeblock: { label: "Time Block", Icon: Ban },
};

type Props = {
	statuses: AppointmentStatus[];
	types: AppointmentTypeFilter[];
	onApply: (next: {
		statuses: AppointmentStatus[];
		types: AppointmentTypeFilter[];
	}) => void;
};

export function AppointmentsAdvancedFilter({
	statuses,
	types,
	onApply,
}: Props) {
	const [open, setOpen] = useState(false);
	const [draftStatuses, setDraftStatuses] =
		useState<AppointmentStatus[]>(statuses);
	const [draftTypes, setDraftTypes] = useState<AppointmentTypeFilter[]>(types);

	useEffect(() => {
		if (open) {
			setDraftStatuses(
				statuses.length > 0 ? statuses : [...APPOINTMENT_STATUSES],
			);
			setDraftTypes(types.length > 0 ? types : [...APPOINTMENT_TYPE_FILTERS]);
		}
	}, [open, statuses, types]);

	const activeCount = statuses.length + types.length;
	const active = activeCount > 0;

	const toggleStatus = (s: AppointmentStatus) => {
		setDraftStatuses((prev) =>
			prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
		);
	};

	const toggleType = (t: AppointmentTypeFilter) => {
		setDraftTypes((prev) =>
			prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
		);
	};

	const handleReset = () => {
		setDraftStatuses([]);
		setDraftTypes([]);
		onApply({ statuses: [], types: [] });
		setOpen(false);
	};

	const handleApply = () => {
		const allStatuses = draftStatuses.length === APPOINTMENT_STATUSES.length;
		const allTypes = draftTypes.length === APPOINTMENT_TYPE_FILTERS.length;
		onApply({
			statuses: allStatuses ? [] : draftStatuses,
			types: allTypes ? [] : draftTypes,
		});
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label="Filter"
					className={cn(
						"inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2 text-xs font-medium hover:bg-muted",
						active && "border-primary/40 bg-primary/5",
					)}
				>
					<SlidersHorizontal className="size-3.5 text-muted-foreground" />
					{active && (
						<span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
							{activeCount}
						</span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 gap-0 p-0">
				<div className="flex items-center justify-between border-b px-3 py-2">
					<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Filter
					</span>
				</div>
				<div className="max-h-[60vh] overflow-y-auto px-3 py-2">
					<div className="mb-1 text-[11px] font-semibold text-foreground">
						Appointment Type
					</div>
					<div className="flex flex-col gap-1.5 pb-2">
						{APPOINTMENT_TYPE_FILTERS.map((t) => {
							const { label, Icon } = TYPE_FILTER_LABEL[t];
							const checked = draftTypes.includes(t);
							const id = `filter-type-${t}`;
							return (
								<label
									key={t}
									htmlFor={id}
									className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted"
								>
									<Checkbox
										id={id}
										checked={checked}
										onCheckedChange={() => toggleType(t)}
									/>
									<Icon className="size-3.5 text-muted-foreground" />
									<span className="text-xs">{label}</span>
								</label>
							);
						})}
					</div>

					<div className="mt-2 mb-1 border-t pt-2 text-[11px] font-semibold text-foreground">
						Status
					</div>
					<div className="flex flex-col gap-1.5">
						{APPOINTMENT_STATUSES.map((s) => (
							<StatusFilterRow
								key={s}
								status={s}
								checked={draftStatuses.includes(s)}
								onToggle={() => toggleStatus(s)}
							/>
						))}
					</div>
				</div>
				<div className="flex items-center justify-end gap-2 border-t bg-muted/40 px-3 py-2">
					<Button type="button" variant="ghost" size="sm" onClick={handleReset}>
						Reset
					</Button>
					<Button type="button" size="sm" onClick={handleApply}>
						Apply
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function StatusFilterRow({
	status,
	checked,
	onToggle,
}: {
	status: AppointmentStatus;
	checked: boolean;
	onToggle: () => void;
}) {
	const cfg = APPOINTMENT_STATUS_CONFIG[status];
	const id = `filter-status-${status}`;
	return (
		<label
			htmlFor={id}
			className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted"
		>
			<Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
			<cfg.Icon className="size-3.5" style={{ color: cfg.solidHex }} />
			<span className="text-xs">{cfg.label}</span>
		</label>
	);
}
