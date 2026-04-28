"use client";

import { BellOff, Pencil } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { TagChip } from "@/components/wa-contacts/TagChip";
import { ContactEditDialog } from "@/components/wa-contacts/ContactEditDialog";
import { getSocket } from "./socket";
import type { CrmContact, CrmContactPatch } from "./types";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	jid: string;
	chatName: string;
	imgUrl: string | null;
	contact: CrmContact | null;
};

export function ContactInfoSheet({
	open,
	onOpenChange,
	jid,
	chatName,
	imgUrl,
	contact,
}: Props) {
	const [editing, setEditing] = useState(false);

	const phone = contact?.phone ?? jid.replace(/@.*$/, "");

	const updateContact = (patch: CrmContactPatch) => {
		getSocket().emit("update_crm_contact", patch);
	};

	const toggleDnd = (v: boolean) => {
		updateContact({ jid, dnd: v });
	};

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent side="right" className="w-full sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Contact info</SheetTitle>
					</SheetHeader>

					<div className="flex flex-col gap-5 px-4 py-2">
						<div className="flex items-center gap-3">
							<Avatar className="size-14">
								{imgUrl && <AvatarImage src={imgUrl} alt="" />}
								<AvatarFallback className="text-lg font-semibold">
									{(contact?.name ?? chatName ?? "?").slice(0, 1).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<div className="truncate font-semibold text-base">
									{contact?.name || chatName}
								</div>
								<div className="font-mono text-muted-foreground text-xs">
									+{phone}
								</div>
							</div>
							<Button size="sm" variant="outline" onClick={() => setEditing(true)}>
								<Pencil className="size-4" /> Edit
							</Button>
						</div>

						<section>
							<div className="mb-1.5 text-muted-foreground text-xs uppercase">
								Tags
							</div>
							<div className="flex flex-wrap gap-1">
								{(contact?.tags ?? []).length === 0 ? (
									<span className="text-muted-foreground text-sm">
										None — click Edit to add tags.
									</span>
								) : (
									(contact?.tags ?? []).map((t) => <TagChip key={t} tag={t} />)
								)}
							</div>
						</section>

						<section className="grid grid-cols-2 gap-3">
							<div>
								<div className="mb-1 text-muted-foreground text-xs uppercase">
									Status
								</div>
								<div className="text-sm">
									{contact?.crmStatus || (
										<span className="text-muted-foreground">—</span>
									)}
								</div>
							</div>
							<div>
								<div className="mb-1 text-muted-foreground text-xs uppercase">
									Assigned
								</div>
								<div className="text-sm">
									{contact?.assignedUser || (
										<span className="text-muted-foreground">—</span>
									)}
								</div>
							</div>
						</section>

						<section>
							<div className="mb-1.5 text-muted-foreground text-xs uppercase">
								Notes
							</div>
							<p className="whitespace-pre-wrap rounded-md border bg-muted/30 px-3 py-2 text-sm">
								{contact?.notes || (
									<span className="text-muted-foreground italic">
										No notes yet.
									</span>
								)}
							</p>
						</section>

						<section className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-3">
							<div>
								<div className="flex items-center gap-1.5 font-medium text-sm">
									{contact?.dnd && (
										<BellOff className="size-3.5 text-amber-600" />
									)}
									Do not disturb
								</div>
								<p className="text-muted-foreground text-xs">
									Automations and AI replies are skipped for this contact.
								</p>
							</div>
							<Switch
								checked={!!contact?.dnd}
								onCheckedChange={toggleDnd}
								aria-label="Toggle DND"
							/>
						</section>
					</div>
				</SheetContent>
			</Sheet>

			<ContactEditDialog
				contact={editing ? (contact ?? null) : null}
				onClose={() => setEditing(false)}
				onSave={updateContact}
			/>
		</>
	);
}
