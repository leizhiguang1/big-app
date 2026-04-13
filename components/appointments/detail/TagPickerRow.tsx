"use client";

import { useOptimistic, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { setAppointmentTagsAction } from "@/lib/actions/appointments";
import {
	APPOINTMENT_TAG_CONFIG,
	APPOINTMENT_TAG_KEYS,
} from "@/lib/constants/appointment-status";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import { cn } from "@/lib/utils";

type Props = {
	appointment: AppointmentWithRelations;
	onToast: (message: string, variant?: Toast["variant"]) => void;
};

export function TagPickerRow({ appointment, onToast }: Props) {
	const [optimistic, setOptimistic] = useOptimistic<string[], string[]>(
		appointment.tags ?? [],
		(_prev, next) => next,
	);
	const [pending, startTransition] = useTransition();

	if (appointment.is_time_block) return null;

	const toggle = (key: string) => {
		const next = optimistic[0] === key ? [] : [key];
		startTransition(async () => {
			setOptimistic(next);
			try {
				await setAppointmentTagsAction(appointment.id, { tags: next });
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Tag update failed",
					"error",
				);
			}
		});
	};

	return (
		<div className="rounded-md border bg-card p-4">
			<div className="text-muted-foreground text-xs uppercase tracking-wide">
				Tag
			</div>
			<div className="mt-3 flex flex-wrap gap-2">
				{APPOINTMENT_TAG_KEYS.map((key) => {
					const config = APPOINTMENT_TAG_CONFIG[key];
					const isActive = optimistic[0] === key;
					return (
						<button
							key={key}
							type="button"
							onClick={() => toggle(key)}
							disabled={pending}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold text-[11px] uppercase tracking-wide transition",
								isActive
									? "text-white shadow-sm"
									: "border-border bg-background text-muted-foreground hover:text-foreground",
								pending && "cursor-wait opacity-70",
							)}
							style={
								isActive
									? {
											backgroundColor: config.dot,
											borderColor: config.dot,
										}
									: undefined
							}
						>
							{config.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
