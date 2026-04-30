"use client";

import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOutletPath } from "@/hooks/use-outlet-path";
import type { AppointmentWithRelations } from "@/lib/services/appointments";

type Props = {
	appointment: AppointmentWithRelations;
	summaryCollapsed?: boolean;
	onToggleSummaryCollapse?: () => void;
};

function appointmentLabel(a: AppointmentWithRelations): string {
	if (a.is_time_block) return a.block_title || "Time block";
	if (a.customer)
		return `${a.customer.first_name} ${a.customer.last_name ?? ""}`.trim();
	return a.lead_name ?? "Walk-in";
}

export function DetailHeader({
	appointment,
	summaryCollapsed = false,
	onToggleSummaryCollapse,
}: Props) {
	const router = useRouter();
	const path = useOutletPath();

	const handleBack = () => {
		if (window.history.length > 1) router.back();
		else router.push(path("/appointments"));
	};

	const label = appointmentLabel(appointment);

	return (
		<div className="flex min-w-0 items-center gap-3">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={handleBack}
				className="shrink-0 gap-1"
			>
				<ArrowLeft className="size-4" />
				Back
			</Button>
			<div className="flex min-w-0 items-center gap-1">
				<div className="min-w-0">
					<div className="truncate text-lg font-semibold leading-tight">
						{label}
					</div>
					<div className="text-muted-foreground text-xs tabular-nums">
						{appointment.booking_ref}
					</div>
				</div>
				{onToggleSummaryCollapse && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
								onClick={onToggleSummaryCollapse}
								aria-label={
									summaryCollapsed
										? "Expand customer and appointment summary"
										: "Collapse customer and appointment summary"
								}
							>
								{summaryCollapsed ? (
									<ChevronDown className="size-4" />
								) : (
									<ChevronUp className="size-4" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{summaryCollapsed ? "Expand summary" : "Collapse summary"}
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</div>
	);
}
