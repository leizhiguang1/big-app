"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { CrmContact, CrmContactPatch } from "@/components/chats/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Props = {
	contact: CrmContact | null;
	onClose: () => void;
	onSave: (patch: CrmContactPatch) => void;
};

type FormState = {
	tags: string[];
	notes: string;
	assignedUser: string;
	crmStatus: string;
	dnd: boolean;
};

const EMPTY: FormState = {
	tags: [],
	notes: "",
	assignedUser: "",
	crmStatus: "",
	dnd: false,
};

export function ContactEditDialog({ contact, onClose, onSave }: Props) {
	const [form, setForm] = useState<FormState>(EMPTY);
	const [tagDraft, setTagDraft] = useState("");

	useEffect(() => {
		if (contact) {
			setForm({
				tags: [...contact.tags],
				notes: contact.notes ?? "",
				assignedUser: contact.assignedUser ?? "",
				crmStatus: contact.crmStatus ?? "",
				dnd: contact.dnd ?? false,
			});
			setTagDraft("");
		}
	}, [contact]);

	if (!contact) return null;

	const addTag = () => {
		const t = tagDraft.trim();
		if (!t || form.tags.includes(t)) {
			setTagDraft("");
			return;
		}
		setForm((f) => ({ ...f, tags: [...f.tags, t] }));
		setTagDraft("");
	};

	const removeTag = (tag: string) => {
		setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== tag) }));
	};

	const handleSave = () => {
		onSave({
			jid: contact.jid,
			tags: form.tags,
			notes: form.notes,
			assignedUser: form.assignedUser,
			crmStatus: form.crmStatus,
			dnd: form.dnd,
		});
		onClose();
	};

	const title = contact.name || contact.phone || contact.jid;

	return (
		<Dialog open={!!contact} onOpenChange={(o) => !o && onClose()}>
			<DialogContent
				preventOutsideClose
				className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-xl"
			>
				<DialogHeader className="border-b px-5 py-4">
					<DialogTitle className="flex items-center gap-3">
						<Avatar>
							{contact.imgUrl && <AvatarImage src={contact.imgUrl} alt="" />}
							<AvatarFallback className="font-semibold">
								{(title ?? "?").slice(0, 1).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span>{title}</span>
							{contact.phone && (
								<span className="font-mono font-normal text-muted-foreground text-xs">
									+{contact.phone}
								</span>
							)}
						</div>
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
					<div className="flex flex-col gap-1.5">
						<Label>Tags</Label>
						<div className="flex flex-wrap gap-1.5 rounded-md border bg-background p-2">
							{form.tags.map((t) => (
								<span
									key={t}
									className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 font-medium text-[11px] text-sky-800"
								>
									{t}
									<button
										type="button"
										onClick={() => removeTag(t)}
										className="hover:text-sky-950"
										aria-label={`Remove ${t}`}
									>
										<X className="size-3" />
									</button>
								</span>
							))}
							<div className="flex items-center gap-1">
								<input
									value={tagDraft}
									onChange={(e) => setTagDraft(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											addTag();
										}
									}}
									placeholder="Add tag…"
									className="h-6 min-w-[80px] border-0 bg-transparent text-xs outline-none"
								/>
								<Button
									type="button"
									size="icon"
									variant="ghost"
									className="size-6"
									onClick={addTag}
									aria-label="Add tag"
								>
									<Plus className="size-3" />
								</Button>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="crmStatus">Status</Label>
							<Input
								id="crmStatus"
								value={form.crmStatus}
								onChange={(e) =>
									setForm((f) => ({ ...f, crmStatus: e.target.value }))
								}
								placeholder="e.g. lead, customer, lost"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="assignedUser">Assigned to</Label>
							<Input
								id="assignedUser"
								value={form.assignedUser}
								onChange={(e) =>
									setForm((f) => ({ ...f, assignedUser: e.target.value }))
								}
								placeholder="Staff name"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="notes">Notes</Label>
						<Textarea
							id="notes"
							rows={6}
							value={form.notes}
							onChange={(e) =>
								setForm((f) => ({ ...f, notes: e.target.value }))
							}
							placeholder="Internal notes about this contact…"
						/>
					</div>

					<label className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
						<div>
							<div className="font-medium text-sm">Do not disturb</div>
							<div className="text-muted-foreground text-xs">
								Automations skip contacts with DND on.
							</div>
						</div>
						<Switch
							checked={form.dnd}
							onCheckedChange={(v) => setForm((f) => ({ ...f, dnd: v }))}
						/>
					</label>
				</div>

				<DialogFooter className="border-t bg-muted/20 px-5 py-3">
					<Button type="button" variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button type="button" onClick={handleSave}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
