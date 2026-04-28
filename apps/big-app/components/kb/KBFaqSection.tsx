"use client";

import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { type KBFaq, uid } from "./kb-types";

type Props = {
	faqs: KBFaq[];
	onChange: (next: KBFaq[]) => void;
};

export function KBFaqSection({ faqs, onChange }: Props) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editItem, setEditItem] = useState<KBFaq | null>(null);

	const startEdit = (f: KBFaq) => {
		setEditingId(f.id);
		setEditItem(f);
	};

	const commit = () => {
		if (!editItem || !editingId) return;
		onChange(faqs.map((f) => (f.id === editingId ? editItem : f)));
		setEditingId(null);
		setEditItem(null);
	};

	const add = () => {
		const item: KBFaq = { id: uid(), question: "", answer: "" };
		onChange([...faqs, item]);
		setEditingId(item.id);
		setEditItem(item);
	};

	const remove = (id: string) => {
		onChange(faqs.filter((f) => f.id !== id));
		if (editingId === id) {
			setEditingId(null);
			setEditItem(null);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{faqs.length === 0 && (
				<p className="rounded-md border bg-muted/20 px-3 py-6 text-center text-muted-foreground text-sm">
					No FAQs yet.
				</p>
			)}
			{faqs.map((f) => {
				if (editingId === f.id && editItem) {
					return (
						<div
							key={f.id}
							className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3"
						>
							<div className="flex items-start gap-2">
								<span className="mt-2 inline-flex size-6 items-center justify-center rounded-full bg-sky-500 font-semibold text-white text-xs">
									Q
								</span>
								<Input
									value={editItem.question}
									autoFocus
									placeholder="Question…"
									onChange={(e) =>
										setEditItem({ ...editItem, question: e.target.value })
									}
								/>
							</div>
							<div className="flex items-start gap-2">
								<span className="mt-2 inline-flex size-6 items-center justify-center rounded-full bg-emerald-500 font-semibold text-white text-xs">
									A
								</span>
								<Textarea
									rows={3}
									value={editItem.answer}
									placeholder="Answer…"
									onChange={(e) =>
										setEditItem({ ...editItem, answer: e.target.value })
									}
								/>
							</div>
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
						key={f.id}
						className="flex flex-col gap-1.5 rounded-md border p-3 hover:bg-muted/30"
					>
						<div className="flex items-start gap-2">
							<span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-sky-500/15 font-semibold text-[11px] text-sky-700">
								Q
							</span>
							<span className="flex-1 font-medium text-sm">
								{f.question || (
									<span className="italic text-muted-foreground">
										Untitled question
									</span>
								)}
							</span>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => startEdit(f)}
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
										onClick={() => remove(f.id)}
										aria-label="Delete"
									>
										<Trash2 className="size-4 text-destructive" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete</TooltipContent>
							</Tooltip>
						</div>
						<div className="flex items-start gap-2">
							<span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/15 font-semibold text-[11px] text-emerald-700">
								A
							</span>
							<p className="text-muted-foreground text-sm">
								{f.answer || (
									<span className="italic">No answer yet.</span>
								)}
							</p>
						</div>
					</div>
				);
			})}
			<div>
				<Button variant="outline" size="sm" onClick={add}>
					<Plus className="size-4" /> Add FAQ
				</Button>
			</div>
		</div>
	);
}
