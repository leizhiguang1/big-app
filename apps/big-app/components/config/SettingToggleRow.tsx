"use client";

import { Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function SettingToggleRow({
	label,
	hint,
	defaultChecked = false,
	indent = false,
	disabled = false,
}: {
	label: string;
	hint?: string;
	defaultChecked?: boolean;
	indent?: boolean;
	disabled?: boolean;
}) {
	const row = (
		<div
			className={cn(
				"flex items-center gap-3 py-0.5",
				indent && "ml-7",
				disabled && "opacity-50",
			)}
		>
			<Switch defaultChecked={defaultChecked} disabled={disabled} />
			<span className="flex-1 text-sm">{label}</span>
			{disabled && (
				<span className="shrink-0 rounded border border-dashed border-muted-foreground/40 px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase tracking-wide">
					Planned
				</span>
			)}
			{hint && !disabled && (
				<Tooltip>
					<TooltipTrigger asChild>
						<Info className="size-3.5 shrink-0 cursor-help text-muted-foreground" />
					</TooltipTrigger>
					<TooltipContent className="max-w-xs">{hint}</TooltipContent>
				</Tooltip>
			)}
		</div>
	);

	if (!disabled) return row;
	return (
		<Tooltip>
			<TooltipTrigger asChild>{row}</TooltipTrigger>
			<TooltipContent className="max-w-xs">
				{hint ?? "Not wired up yet — shipping in a later pass."}
			</TooltipContent>
		</Tooltip>
	);
}
