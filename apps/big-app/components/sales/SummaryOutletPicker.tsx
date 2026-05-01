"use client";

import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type SummaryOutletOption = { code: string; name: string };

export function SummaryOutletPicker({
	outlets,
	value,
}: {
	outlets: SummaryOutletOption[];
	value: "all" | string;
}) {
	const router = useRouter();
	const pathname = usePathname() ?? "";
	const sp = useSearchParams();
	const [pending, startTransition] = useTransition();

	const select = (next: "all" | string) => {
		if (next === value) return;
		const params = new URLSearchParams(sp?.toString() ?? "");
		params.set("tab", "summary");
		params.set("o", next);
		startTransition(() => router.replace(`${pathname}?${params.toString()}`));
	};

	const activeLabel =
		value === "all"
			? "All Outlets"
			: (outlets.find((o) => o.code === value)?.name ?? value);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn("gap-2", pending && "opacity-70")}
				>
					{value === "all" ? (
						<Globe className="size-3.5" />
					) : (
						<span className="size-1.5 rounded-full bg-primary" />
					)}
					<span className="max-w-[12rem] truncate font-medium">
						{activeLabel}
					</span>
					<ChevronsUpDown className="size-3.5 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
					Scope
				</DropdownMenuLabel>
				<DropdownMenuItem
					onSelect={() => select("all")}
					className="flex items-center gap-2"
				>
					<Globe className="size-4" />
					<span className="flex-1">All Outlets</span>
					{value === "all" && <Check className="size-4" />}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
					Single outlet
				</DropdownMenuLabel>
				{outlets.map((o) => {
					const selected = o.code === value;
					return (
						<DropdownMenuItem
							key={o.code}
							onSelect={() => select(o.code)}
							className={cn(
								"flex items-center gap-2",
								selected && "bg-muted/60",
							)}
						>
							<span className="size-1.5 shrink-0 rounded-full bg-primary" />
							<div className="flex min-w-0 flex-1 flex-col leading-tight">
								<span className="truncate text-sm">{o.name}</span>
								<span className="truncate text-[11px] text-muted-foreground">
									{o.code}
								</span>
							</div>
							{selected && <Check className="size-4 shrink-0" />}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
