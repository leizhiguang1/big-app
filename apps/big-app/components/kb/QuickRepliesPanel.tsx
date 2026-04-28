"use client";

import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/wa-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { QuickReply } from "@aimbig/wa-client";

const STORAGE_KEY = "wa_quick_replies";

const DEFAULT_REPLIES: QuickReply[] = [
	{
		id: "1",
		shortcut: "hello",
		text: "Hello! How can we help you today?",
	},
	{
		id: "2",
		shortcut: "hours",
		text: "We're open Mon–Fri 9am–6pm and Sat 9am–2pm.",
	},
	{
		id: "3",
		shortcut: "appt",
		text: "To book an appointment, please share your preferred date and time, and the service you need.",
	},
];

function loadLocal(): QuickReply[] {
	if (typeof window === "undefined") return DEFAULT_REPLIES;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as QuickReply[]) : DEFAULT_REPLIES;
	} catch {
		return DEFAULT_REPLIES;
	}
}

function saveLocal(list: QuickReply[]) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	} catch {}
}

function uid() {
	return Math.random().toString(36).slice(2, 9);
}

export function QuickRepliesPanel() {
	const [replies, setReplies] = useState<QuickReply[]>(loadLocal);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editItem, setEditItem] = useState<QuickReply | null>(null);

	useEffect(() => {
		const sock = getSocket();
		const onConnect = () => {
			sock.emit("get_quick_replies", (list: QuickReply[] | null) => {
				if (Array.isArray(list) && list.length > 0) {
					setReplies(list);
					saveLocal(list);
				}
			});
		};
		if (sock.connected) onConnect();
		else sock.on("connect", onConnect);
		return () => {
			sock.off("connect", onConnect);
		};
	}, []);

	const persist = (next: QuickReply[]) => {
		setReplies(next);
		saveLocal(next);
		getSocket().emit("save_quick_replies", next);
	};

	const startEdit = (r: QuickReply) => {
		setEditingId(r.id);
		setEditItem(r);
	};

	const commit = () => {
		if (!editItem || !editingId) return;
		persist(
			replies.map((r) =>
				r.id === editingId
					? {
							...editItem,
							shortcut: editItem.shortcut.trim().toLowerCase(),
							updatedAt: Date.now(),
						}
					: r,
			),
		);
		setEditingId(null);
		setEditItem(null);
	};

	const add = () => {
		const r: QuickReply = { id: uid(), shortcut: "", text: "" };
		persist([...replies, r]);
		setEditingId(r.id);
		setEditItem(r);
	};

	const remove = (id: string) => {
		persist(replies.filter((r) => r.id !== id));
		if (editingId === id) {
			setEditingId(null);
			setEditItem(null);
		}
	};

	return (
		<section className="rounded-lg border bg-card">
			<header className="flex items-center justify-between gap-2 border-b px-5 py-3">
				<div>
					<h3 className="font-semibold text-sm">Quick Replies</h3>
					<p className="text-muted-foreground text-xs">
						Type <kbd className="rounded bg-muted px-1 font-mono">/</kbd> +
						shortcut in a chat to expand.
					</p>
				</div>
				<Badge variant="secondary">{replies.length}</Badge>
			</header>

			<div className="flex flex-col divide-y">
				{replies.length === 0 && (
					<p className="px-5 py-6 text-center text-muted-foreground text-sm">
						No quick replies yet.
					</p>
				)}
				{replies.map((r) => {
					if (editingId === r.id && editItem) {
						return (
							<div
								key={r.id}
								className="flex flex-col gap-2 bg-muted/20 px-5 py-3"
							>
								<div className="flex gap-2">
									<Input
										value={editItem.shortcut}
										autoFocus
										placeholder="shortcut"
										onChange={(e) =>
											setEditItem({ ...editItem, shortcut: e.target.value })
										}
										className="max-w-[180px] font-mono"
									/>
								</div>
								<Textarea
									rows={3}
									value={editItem.text}
									placeholder="Reply text"
									onChange={(e) =>
										setEditItem({ ...editItem, text: e.target.value })
									}
								/>
								<div className="flex justify-end gap-2">
									<Button
										size="sm"
										variant="ghost"
										onClick={() => {
											setEditingId(null);
											setEditItem(null);
										}}
									>
										Cancel
									</Button>
									<Button size="sm" onClick={commit}>
										<Check className="size-4" /> Save
									</Button>
								</div>
							</div>
						);
					}
					return (
						<div
							key={r.id}
							className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30"
						>
							<code className="mt-0.5 rounded bg-muted px-1.5 py-0.5 text-xs">
								/{r.shortcut}
							</code>
							<p className="flex-1 text-muted-foreground text-sm">
								{r.text || (
									<span className="italic">Empty reply</span>
								)}
							</p>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => startEdit(r)}
										aria-label="Edit"
									>
										<Pencil className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Edit</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => remove(r.id)}
										aria-label="Delete"
									>
										<Trash2 className="size-4 text-destructive" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete</TooltipContent>
							</Tooltip>
						</div>
					);
				})}
			</div>

			<div className="border-t bg-muted/20 px-5 py-3">
				<Button size="sm" variant="outline" onClick={add}>
					<Plus className="size-4" /> Add quick reply
				</Button>
			</div>
		</section>
	);
}
