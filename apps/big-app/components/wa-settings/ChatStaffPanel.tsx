"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WATeamMember } from "@aimbig/wa-client";

type Props = {
	members: WATeamMember[];
	onAdd: (name: string) => void;
	onRemove: (id: string) => void;
};

export function ChatStaffPanel({ members, onAdd, onRemove }: Props) {
	const [draft, setDraft] = useState("");
	const [removing, setRemoving] = useState<WATeamMember | null>(null);

	return (
		<section className="rounded-lg border bg-card">
			<header className="flex items-center justify-between gap-2 border-b px-5 py-3">
				<div>
					<h3 className="font-semibold text-sm">Chat Staff</h3>
					<p className="text-muted-foreground text-xs">
						Names available for assigning conversations.
					</p>
				</div>
				<Badge variant="secondary">{members.length}</Badge>
			</header>

			<div className="flex flex-col divide-y">
				{members.length === 0 && (
					<p className="px-5 py-6 text-center text-muted-foreground text-sm">
						No staff added yet.
					</p>
				)}
				{members.map((m) => (
					<div key={m.id} className="flex items-center gap-3 px-5 py-3">
						<Avatar size="sm">
							<AvatarFallback className="font-semibold">
								{(m.name[0] ?? "?").toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span className="flex-1 text-sm">{m.name}</span>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="icon"
									variant="ghost"
									onClick={() => setRemoving(m)}
									aria-label="Remove staff"
								>
									<Trash2 className="size-4 text-destructive" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Remove</TooltipContent>
						</Tooltip>
					</div>
				))}
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					const name = draft.trim();
					if (!name) return;
					onAdd(name);
					setDraft("");
				}}
				className="flex items-center gap-2 border-t bg-muted/20 px-5 py-3"
			>
				<Input
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder="Staff name (e.g. Dr. Lim)"
					className="flex-1"
				/>
				<Button type="submit" disabled={!draft.trim()}>
					<Plus className="size-4" /> Add
				</Button>
			</form>

			<ConfirmDialog
				open={!!removing}
				onOpenChange={(o) => !o && setRemoving(null)}
				title="Remove staff?"
				description={
					removing
						? `"${removing.name}" will no longer appear in the assignee picker.`
						: ""
				}
				confirmLabel="Remove"
				variant="destructive"
				onConfirm={() => {
					if (removing) onRemove(removing.id);
					setRemoving(null);
				}}
			/>
		</section>
	);
}
