"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CrmContact } from "@/components/chats/types";

type Props = {
	contacts: CrmContact[];
	onRenameTag: (oldTag: string, newTag: string) => void;
	onDeleteTag: (tag: string) => void;
};

export function TagManagerPanel({
	contacts,
	onRenameTag,
	onDeleteTag,
}: Props) {
	const [renaming, setRenaming] = useState<{ tag: string; val: string } | null>(
		null,
	);
	const [deleting, setDeleting] = useState<string | null>(null);

	const tagsWithCount = useMemo(() => {
		const map = new Map<string, number>();
		contacts.forEach((c) =>
			(c.tags || []).forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)),
		);
		return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
	}, [contacts]);

	return (
		<section className="rounded-lg border bg-card">
			<header className="flex items-center justify-between gap-2 border-b px-5 py-3">
				<div>
					<h3 className="font-semibold text-sm">Tag Manager</h3>
					<p className="text-muted-foreground text-xs">
						Rename or delete tags across every CRM contact.
					</p>
				</div>
				<Badge variant="secondary">{tagsWithCount.length}</Badge>
			</header>

			<div className="flex flex-col divide-y">
				{tagsWithCount.length === 0 && (
					<p className="px-5 py-6 text-center text-muted-foreground text-sm">
						No tags yet — add them from the Contacts tab.
					</p>
				)}
				{tagsWithCount.map(([tag, count]) => (
					<div key={tag} className="flex items-center gap-3 px-5 py-3">
						{renaming?.tag === tag ? (
							<Input
								autoFocus
								value={renaming.val}
								onChange={(e) =>
									setRenaming({ ...renaming, val: e.target.value })
								}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										const trimmed = renaming.val.trim();
										if (trimmed && trimmed !== tag) onRenameTag(tag, trimmed);
										setRenaming(null);
									}
									if (e.key === "Escape") setRenaming(null);
								}}
								className="max-w-xs"
							/>
						) : (
							<span className="flex-1 text-sm">{tag}</span>
						)}
						<span className="text-muted-foreground text-xs">
							{count} contact{count !== 1 ? "s" : ""}
						</span>
						{renaming?.tag === tag ? (
							<>
								<Button
									size="sm"
									onClick={() => {
										const trimmed = renaming.val.trim();
										if (trimmed && trimmed !== tag) onRenameTag(tag, trimmed);
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
											onClick={() => setRenaming({ tag, val: tag })}
											aria-label="Rename tag"
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
											onClick={() => setDeleting(tag)}
											aria-label="Delete tag"
										>
											<Trash2 className="size-4 text-destructive" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Delete from all contacts</TooltipContent>
								</Tooltip>
							</>
						)}
					</div>
				))}
			</div>

			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => !o && setDeleting(null)}
				title="Delete tag?"
				description={
					deleting
						? `"${deleting}" will be removed from every contact that has it.`
						: ""
				}
				confirmLabel="Delete"
				variant="destructive"
				onConfirm={() => {
					if (deleting) onDeleteTag(deleting);
					setDeleting(null);
				}}
			/>
		</section>
	);
}
