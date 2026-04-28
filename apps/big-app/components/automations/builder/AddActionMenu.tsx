"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ACTION_TYPES } from "@/components/automations/automation-constants";

type Props = {
	trigger: React.ReactNode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onPick: (type: string) => void;
};

export function AddActionMenu({ trigger, open, onOpenChange, onPick }: Props) {
	const [query, setQuery] = useState("");

	const groups = useMemo(() => {
		const q = query.trim().toLowerCase();
		const groupMap = new Map<
			string,
			Array<{ key: string; label: string; icon: string }>
		>();
		for (const [key, def] of Object.entries(ACTION_TYPES)) {
			const matches =
				q === "" ||
				def.label.toLowerCase().includes(q) ||
				key.toLowerCase().includes(q);
			if (!matches) continue;
			const arr = groupMap.get(def.group) ?? [];
			arr.push({ key, label: def.label, icon: def.icon });
			groupMap.set(def.group, arr);
		}
		return Array.from(groupMap.entries());
	}, [query]);

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent
				align="start"
				className="flex w-80 flex-col gap-2 p-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<div className="border-b px-3 py-2">
					<div className="flex items-center gap-2">
						<Search className="size-4 text-muted-foreground" />
						<Input
							autoFocus
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search actions…"
							className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
						/>
					</div>
				</div>
				<div className="max-h-80 overflow-y-auto px-2 pb-2">
					{groups.length === 0 && (
						<p className="px-2 py-4 text-center text-muted-foreground text-xs">
							No actions match "{query}".
						</p>
					)}
					{groups.map(([group, items]) => (
						<div key={group} className="mb-2">
							<div className="px-2 pt-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
								{group}
							</div>
							<div className="grid grid-cols-1 gap-0.5">
								{items.map((it) => (
									<button
										type="button"
										key={it.key}
										onClick={() => {
											onPick(it.key);
											onOpenChange(false);
											setQuery("");
										}}
										className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
									>
										<span className="text-base" aria-hidden>
											{it.icon}
										</span>
										{it.label}
									</button>
								))}
							</div>
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
