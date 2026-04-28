"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

const DEFAULT_STATUSES = [
	"New Lead",
	"Contacted",
	"Interested",
	"Customer",
	"VIP",
	"Inactive",
];
const STORAGE_KEY = "wa_crm_statuses";

function loadStatuses(): string[] {
	if (typeof window === "undefined") return DEFAULT_STATUSES;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as string[]) : DEFAULT_STATUSES;
	} catch {
		return DEFAULT_STATUSES;
	}
}

export function StatusManagerPanel() {
	const [statuses, setStatuses] = useState<string[]>(loadStatuses);
	const [draft, setDraft] = useState("");
	const [renaming, setRenaming] = useState<{ idx: number; val: string } | null>(
		null,
	);

	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
		} catch {}
	}, [statuses]);

	const add = (e: React.FormEvent) => {
		e.preventDefault();
		const v = draft.trim();
		if (!v || statuses.includes(v)) return;
		setStatuses((prev) => [...prev, v]);
		setDraft("");
	};

	return (
		<section className="rounded-lg border bg-card">
			<header className="flex items-center justify-between gap-2 border-b px-5 py-3">
				<div>
					<h3 className="font-semibold text-sm">Contact Status / Stage</h3>
					<p className="text-muted-foreground text-xs">
						CRM pipeline stages. Assigned per contact from the Contacts panel.
					</p>
				</div>
				<Badge variant="secondary">{statuses.length}</Badge>
			</header>

			<div className="flex flex-col divide-y">
				{statuses.map((status, idx) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: position is stable for this list
						key={`${status}-${idx}`}
						className="flex items-center gap-3 px-5 py-3"
					>
						{renaming?.idx === idx ? (
							<Input
								autoFocus
								value={renaming.val}
								onChange={(e) =>
									setRenaming({ ...renaming, val: e.target.value })
								}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										const v = renaming.val.trim();
										if (v && v !== statuses[idx]) {
											setStatuses((prev) => {
												const next = [...prev];
												next[idx] = v;
												return next;
											});
										}
										setRenaming(null);
									}
									if (e.key === "Escape") setRenaming(null);
								}}
								className="max-w-xs"
							/>
						) : (
							<span className="flex-1 text-sm">{status}</span>
						)}
						{renaming?.idx === idx ? (
							<>
								<Button
									size="sm"
									onClick={() => {
										const v = renaming.val.trim();
										if (v && v !== statuses[idx]) {
											setStatuses((prev) => {
												const next = [...prev];
												next[idx] = v;
												return next;
											});
										}
										setRenaming(null);
									}}
								>
									Save
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setRenaming(null)}
								>
									Cancel
								</Button>
							</>
						) : (
							<>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											size="icon"
											variant="ghost"
											onClick={() => setRenaming({ idx, val: status })}
											aria-label="Rename status"
										>
											<Pencil className="size-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Rename</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											size="icon"
											variant="ghost"
											onClick={() =>
												setStatuses((prev) => prev.filter((_, i) => i !== idx))
											}
											aria-label="Delete status"
										>
											<Trash2 className="size-4 text-destructive" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Delete</TooltipContent>
								</Tooltip>
							</>
						)}
					</div>
				))}
			</div>

			<form
				onSubmit={add}
				className="flex items-center gap-2 border-t bg-muted/20 px-5 py-3"
			>
				<Input
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder="New status (e.g. Awaiting Review)"
					className="flex-1"
				/>
				<Button type="submit" disabled={!draft.trim()}>
					<Plus className="size-4" /> Add Status
				</Button>
			</form>
		</section>
	);
}
