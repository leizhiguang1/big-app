"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ServiceWithCategory } from "@/lib/services/services";
import { cn } from "@/lib/utils";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	services: ServiceWithCategory[];
	onSelect: (service: ServiceWithCategory) => void;
	selectedId?: string | null;
};

export function ServicePickerDialog({
	open,
	onOpenChange,
	services,
	onSelect,
	selectedId,
}: Props) {
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return services;
		return services.filter((s) => {
			const haystack = [
				s.name,
				s.sku,
				s.category?.name ?? "",
				s.type,
			].join(" ").toLowerCase();
			return haystack.includes(q);
		});
	}, [services, query]);

	const handleSelect = (s: ServiceWithCategory) => {
		onSelect(s);
		onOpenChange(false);
		setQuery("");
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-0 p-0">
				<DialogHeader className="border-b px-5 pt-5 pb-3">
					<DialogTitle className="text-base">Select a service</DialogTitle>
					<DialogDescription className="sr-only">
						Search and pick a service to add to this billing line.
					</DialogDescription>
					<div className="relative mt-3">
						<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							autoFocus
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by name, SKU, or category…"
							className="h-10 pl-9"
						/>
					</div>
					<div className="mt-2 text-muted-foreground text-xs">
						{filtered.length} of {services.length}
					</div>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto">
					{filtered.length === 0 ? (
						<div className="p-10 text-center text-muted-foreground text-sm">
							No services match “{query}”.
						</div>
					) : (
						<ul className="divide-y">
							{filtered.map((s) => {
								const isSelected = s.id === selectedId;
								return (
									<li key={s.id}>
										<button
											type="button"
											onClick={() => handleSelect(s)}
											className={cn(
												"flex w-full items-start justify-between gap-4 px-5 py-3 text-left transition hover:bg-muted/60",
												isSelected && "bg-primary/5",
											)}
										>
											<div className="flex min-w-0 flex-col gap-0.5">
												<div className="flex items-center gap-2">
													<span className="truncate font-semibold text-sm">
														{s.name}
													</span>
													<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
														{s.sku}
													</span>
												</div>
												<div className="flex items-center gap-2 text-muted-foreground text-xs">
													{s.category?.name && (
														<span className="rounded bg-muted/60 px-1.5 py-0.5">
															{s.category.name}
														</span>
													)}
													<span>{s.duration_min} min</span>
													<span className="uppercase">{s.type}</span>
												</div>
											</div>
											<div className="shrink-0 text-right">
												<div className="font-semibold text-sm tabular-nums">
													MYR {Number(s.price).toFixed(2)}
												</div>
											</div>
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
