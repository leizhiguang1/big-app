"use client";

import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import type { CrmContact } from "@aimbig/wa-client";
import { TagChip } from "./TagChip";

type Props = {
	contacts: CrmContact[];
	primaryJid: string | null;
	secondaryJidPreset?: string | null;
	onClose: () => void;
	onConfirm: (primaryJid: string, secondaryJid: string) => void;
};

type MergePreview = {
	primary: CrmContact;
	secondary: CrmContact;
	mergedTags: string[];
	mergedNotes: string;
};

function buildPreview(
	contacts: CrmContact[],
	primaryJid: string,
	secondaryJid: string,
): MergePreview | null {
	const primary = contacts.find((c) => c.jid === primaryJid);
	const secondary = contacts.find((c) => c.jid === secondaryJid);
	if (!primary || !secondary) return null;
	const mergedTags = Array.from(
		new Set([...(primary.tags ?? []), ...(secondary.tags ?? [])]),
	);
	const mergedNotes = [primary.notes?.trim(), secondary.notes?.trim()]
		.filter(Boolean)
		.join("\n---\n");
	return { primary, secondary, mergedTags, mergedNotes };
}

export function MergeContactsDialog({
	contacts,
	primaryJid,
	secondaryJidPreset,
	onClose,
	onConfirm,
}: Props) {
	const [search, setSearch] = useState("");
	const [step, setStep] = useState<"pick" | "preview">(
		secondaryJidPreset ? "preview" : "pick",
	);
	const [secondaryJid, setSecondaryJid] = useState<string | null>(
		secondaryJidPreset ?? null,
	);

	const primary = useMemo(
		() => contacts.find((c) => c.jid === primaryJid) ?? null,
		[contacts, primaryJid],
	);

	const candidates = useMemo(() => {
		if (!primaryJid) return [];
		const q = search.toLowerCase();
		return contacts
			.filter(
				(c) =>
					c.jid !== primaryJid &&
					(q === "" ||
						c.name?.toLowerCase().includes(q) ||
						c.phone?.includes(q)),
			)
			.slice(0, 30);
	}, [contacts, search, primaryJid]);

	const preview =
		step === "preview" && primaryJid && secondaryJid
			? buildPreview(contacts, primaryJid, secondaryJid)
			: null;

	const open = !!primaryJid;
	const handleClose = () => {
		setSearch("");
		setSecondaryJid(null);
		setStep("pick");
		onClose();
	};

	const handleConfirm = () => {
		if (primaryJid && secondaryJid) {
			onConfirm(primaryJid, secondaryJid);
			handleClose();
		}
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
			<DialogContent
				preventOutsideClose
				className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl"
			>
				<DialogHeader className="border-b px-5 py-4">
					<DialogTitle className="flex items-center gap-2">
						<ArrowLeftRight className="size-4" />
						{step === "pick" ? "Merge contact" : "Merge preview"}
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
					{step === "pick" && primary && (
						<>
							<p className="text-muted-foreground text-sm">
								Keep{" "}
								<strong>{primary.name || `+${primary.phone}`}</strong> as the
								primary. Pick the contact to merge in — its tags and notes
								will be combined, then it will be removed.
							</p>
							<div>
								<Label htmlFor="merge-search">Search</Label>
								<Input
									id="merge-search"
									autoFocus
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search by name or phone…"
									className="mt-1.5"
								/>
							</div>
							<div className="flex max-h-72 flex-col divide-y overflow-y-auto rounded-md border">
								{candidates.length === 0 && (
									<p className="px-3 py-4 text-center text-muted-foreground text-sm">
										No candidates.
									</p>
								)}
								{candidates.map((c) => (
									<button
										type="button"
										key={c.jid}
										onClick={() => {
											setSecondaryJid(c.jid);
											setStep("preview");
										}}
										className="flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/40"
									>
										<Avatar size="sm">
											<AvatarFallback className="font-semibold">
												{(c.name || c.phone || "?")[0]?.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<div className="truncate font-medium text-sm">
												{c.name || `+${c.phone}`}
											</div>
											<div className="truncate text-muted-foreground text-xs">
												{c.phone ? `+${c.phone}` : "no phone"}
												{(c.tags?.length ?? 0) > 0 &&
													` · ${c.tags?.join(", ")}`}
											</div>
										</div>
										<ChevronRight className="size-4 text-muted-foreground" />
									</button>
								))}
							</div>
						</>
					)}

					{step === "preview" && preview && (
						<>
							<p className="text-muted-foreground text-sm">
								Review what the merged contact will look like.
							</p>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
								<MergeColumn
									label="Keep (Primary)"
									tone="primary"
									contact={preview.primary}
								/>
								<div className="flex items-center justify-center text-muted-foreground">
									<ArrowLeftRight className="size-4" />
								</div>
								<MergeColumn
									label="Merge in (will be removed)"
									tone="secondary"
									contact={preview.secondary}
								/>
							</div>

							<div className="rounded-md border bg-muted/30 px-3 py-3">
								<div className="font-semibold text-sm">Result after merge</div>
								<div className="mt-2 text-sm">
									<span className="mr-2 font-medium">Tags:</span>
									{preview.mergedTags.length === 0 ? (
										<span className="text-muted-foreground">none</span>
									) : (
										<span className="inline-flex flex-wrap gap-1.5 align-middle">
											{preview.mergedTags.map((t) => (
												<TagChip key={t} tag={t} />
											))}
										</span>
									)}
								</div>
								<div className="mt-2 flex items-start gap-2 text-sm">
									<span className="font-medium">Notes:</span>
									<span className="flex-1 whitespace-pre-wrap text-muted-foreground">
										{preview.mergedNotes || "none"}
									</span>
								</div>
							</div>
						</>
					)}
				</div>

				<DialogFooter className="border-t bg-muted/20 px-5 py-3">
					{step === "preview" ? (
						<>
							<Button variant="ghost" onClick={() => setStep("pick")}>
								← Back
							</Button>
							<Button onClick={handleConfirm}>Confirm Merge</Button>
						</>
					) : (
						<Button variant="ghost" onClick={handleClose}>
							Cancel
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function MergeColumn({
	label,
	tone,
	contact,
}: {
	label: string;
	tone: "primary" | "secondary";
	contact: CrmContact;
}) {
	return (
		<div
			className={`flex flex-col gap-1.5 rounded-md border p-3 ${
				tone === "primary"
					? "border-emerald-200 bg-emerald-50"
					: "border-rose-200 bg-rose-50"
			}`}
		>
			<div
				className={`font-medium text-xs uppercase tracking-wide ${
					tone === "primary" ? "text-emerald-700" : "text-rose-700"
				}`}
			>
				{label}
			</div>
			<div className="font-semibold text-sm">
				{contact.name || `+${contact.phone}`}
			</div>
			<div className="font-mono text-muted-foreground text-xs">
				+{contact.phone}
			</div>
			<div className="mt-1 text-muted-foreground text-xs uppercase">Tags</div>
			<div className="flex flex-wrap gap-1">
				{(contact.tags ?? []).length === 0 ? (
					<span className="text-muted-foreground text-xs">none</span>
				) : (
					(contact.tags ?? []).map((t) => <TagChip key={t} tag={t} />)
				)}
			</div>
			<div className="mt-1 text-muted-foreground text-xs uppercase">Notes</div>
			<p className="whitespace-pre-wrap text-xs">
				{contact.notes || (
					<span className="text-muted-foreground">none</span>
				)}
			</p>
		</div>
	);
}
