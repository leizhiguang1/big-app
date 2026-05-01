"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { startNavProgress } from "@/components/shell/nav-progress";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { outletPath } from "@/lib/outlet-path";
import { cn } from "@/lib/utils";

export type OutletNavItem = {
	id: string;
	code: string;
	name: string;
	nick_name: string | null;
};

const AVATAR_PALETTE = [
	"bg-sky-500",
	"bg-emerald-500",
	"bg-violet-500",
	"bg-amber-500",
	"bg-rose-500",
	"bg-cyan-500",
	"bg-fuchsia-500",
	"bg-lime-600",
	"bg-indigo-500",
	"bg-orange-500",
];

function avatarColor(id: string): string {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
	return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function initial(name: string): string {
	const trimmed = name.trim();
	return trimmed ? trimmed[0].toUpperCase() : "?";
}

function OutletAvatar({
	outlet,
	size = "md",
}: {
	outlet: OutletNavItem;
	size?: "sm" | "md";
}) {
	const dim = size === "sm" ? "size-6 text-[11px]" : "size-7 text-xs";
	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center rounded-md font-semibold text-white",
				avatarColor(outlet.id),
				dim,
			)}
			aria-hidden
		>
			{initial(outlet.nick_name ?? outlet.name)}
		</span>
	);
}

function swapOutletInPath(pathname: string, newCode: string): string {
	const m = pathname.match(/^\/o\/[^/]+(\/.*)?$/);
	const sub = m?.[1] ?? "/dashboard";
	return outletPath(newCode, sub);
}

export function OutletSelector({
	outlets,
	activeOutletCode,
}: {
	outlets: OutletNavItem[];
	activeOutletCode: string;
}) {
	const router = useRouter();
	const pathname = usePathname() ?? "";
	const [pending, startTransition] = useTransition();

	if (outlets.length === 0) return null;

	const active =
		outlets.find((o) => o.code === activeOutletCode) ?? outlets[0];

	if (outlets.length === 1) {
		return (
			<div className="flex h-9 items-center gap-2 rounded-md px-2 text-sm">
				<OutletAvatar outlet={active} />
				<div className="flex min-w-0 flex-col leading-tight">
					<span className="truncate font-medium">{active.name}</span>
					<span className="truncate text-[10px] text-muted-foreground">
						Workspace
					</span>
				</div>
			</div>
		);
	}

	const handleSelect = (code: string) => {
		if (code === activeOutletCode) return;
		const next = swapOutletInPath(pathname, code);
		startNavProgress();
		startTransition(() => router.replace(next));
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className={cn(
						"-ml-1 h-10 gap-2 rounded-md px-2 hover:bg-muted",
						pending && "opacity-70",
					)}
				>
					<OutletAvatar outlet={active} />
					<div className="flex min-w-0 flex-col items-start leading-tight">
						<span className="max-w-[10rem] truncate font-medium text-sm">
							{active.name}
						</span>
						<span className="text-[10px] text-muted-foreground">
							Active workspace
						</span>
					</div>
					<ChevronsUpDown className="ml-1 size-3.5 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-72 p-1.5">
				<DropdownMenuLabel className="px-2 pt-1 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
					Switch workspace
				</DropdownMenuLabel>
				<DropdownMenuSeparator className="mb-1" />
				{outlets.map((outlet) => {
					const selected = outlet.code === activeOutletCode;
					return (
						<DropdownMenuItem
							key={outlet.id}
							onSelect={() => handleSelect(outlet.code)}
							className={cn(
								"flex items-center gap-2.5 rounded-md px-2 py-2",
								selected && "bg-muted/60",
							)}
						>
							<OutletAvatar outlet={outlet} />
							<div className="flex min-w-0 flex-1 flex-col leading-tight">
								<span className="truncate font-medium text-sm">
									{outlet.name}
								</span>
								<span className="truncate text-[11px] text-muted-foreground">
									{outlet.code}
								</span>
							</div>
							{selected && (
								<Check className="size-4 shrink-0 text-foreground" />
							)}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
