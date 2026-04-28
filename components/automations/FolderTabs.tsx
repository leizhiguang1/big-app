"use client";

import { Folder, MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Automation, AutomationFolder } from "@/components/chats/types";

type Props = {
	folders: AutomationFolder[];
	automations: Automation[];
	activeFolder: string | null;
	onActivate: (id: string | null) => void;
	onCreate: (name: string) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
	onMoveWorkflow: (workflowId: string, folderId: string) => void;
};

export function FolderTabs({
	folders,
	automations,
	activeFolder,
	onActivate,
	onCreate,
	onRename,
	onDelete,
	onMoveWorkflow,
}: Props) {
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState("");
	const [draftFolder, setDraftFolder] = useState<string | null>(null);
	const [dragOverId, setDragOverId] = useState<string | null>(null);
	const [confirmingDelete, setConfirmingDelete] =
		useState<AutomationFolder | null>(null);
	const renameInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (renamingId && renameInputRef.current) {
			renameInputRef.current.focus();
			renameInputRef.current.select();
		}
	}, [renamingId]);

	const handleDragOver = (e: React.DragEvent, folderId: string) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setDragOverId(folderId);
	};

	const handleDrop = (e: React.DragEvent, folderId: string) => {
		e.preventDefault();
		const wfId = e.dataTransfer.getData("text/plain");
		if (wfId) onMoveWorkflow(wfId, folderId);
		setDragOverId(null);
	};

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<button
				type="button"
				onClick={() => onActivate(null)}
				className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
					activeFolder === null
						? "border-foreground bg-foreground text-background"
						: "bg-card hover:bg-muted/50"
				}`}
			>
				All ({automations.length})
			</button>

			{folders.map((folder) => {
				const count = folder.workflowIds.filter((id) =>
					automations.some((a) => a.id === id),
				).length;
				const active = activeFolder === folder.id;
				const dragOver = dragOverId === folder.id;
				return (
					<div
						key={folder.id}
						onDragOver={(e) => handleDragOver(e, folder.id)}
						onDragLeave={() => setDragOverId(null)}
						onDrop={(e) => handleDrop(e, folder.id)}
						className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
							active
								? "border-foreground bg-foreground text-background"
								: "bg-card hover:bg-muted/50"
						} ${dragOver ? "ring-2 ring-sky-500/60" : ""}`}
					>
						<button
							type="button"
							onClick={() => onActivate(folder.id)}
							className="flex items-center gap-1 font-medium"
						>
							<Folder className="size-3.5" />
							{renamingId === folder.id ? (
								<Input
									ref={renameInputRef}
									value={renameValue}
									onChange={(e) => setRenameValue(e.target.value)}
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											const v = renameValue.trim();
											if (v) onRename(folder.id, v);
											setRenamingId(null);
										}
										if (e.key === "Escape") setRenamingId(null);
									}}
									onBlur={() => {
										const v = renameValue.trim();
										if (v) onRename(folder.id, v);
										setRenamingId(null);
									}}
									className="h-6 w-32 px-1 text-xs"
								/>
							) : (
								<span>
									{folder.name} ({count})
								</span>
							)}
						</button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									size="icon"
									variant="ghost"
									className={`size-5 ${active ? "text-background hover:bg-background/20" : ""}`}
									aria-label="Folder menu"
								>
									<MoreHorizontal className="size-3.5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								<DropdownMenuItem
									onClick={() => {
										setRenameValue(folder.name);
										setRenamingId(folder.id);
									}}
								>
									Rename
								</DropdownMenuItem>
								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									onClick={() => setConfirmingDelete(folder)}
								>
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			})}

			{folders.length > 0 && (
				<button
					type="button"
					onClick={() => onActivate("__uncategorized")}
					className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
						activeFolder === "__uncategorized"
							? "border-foreground bg-foreground text-background"
							: "bg-card hover:bg-muted/50"
					}`}
				>
					Uncategorized
				</button>
			)}

			{draftFolder !== null ? (
				<Input
					autoFocus
					value={draftFolder}
					onChange={(e) => setDraftFolder(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							const v = draftFolder.trim();
							if (v) onCreate(v);
							setDraftFolder(null);
						}
						if (e.key === "Escape") setDraftFolder(null);
					}}
					onBlur={() => {
						const v = draftFolder.trim();
						if (v) onCreate(v);
						setDraftFolder(null);
					}}
					placeholder="Folder name"
					className="h-7 w-36 px-2 text-xs"
				/>
			) : (
				<Button
					size="sm"
					variant="ghost"
					onClick={() => setDraftFolder("")}
					className="h-7"
				>
					<Plus className="size-3.5" /> Folder
				</Button>
			)}

			<ConfirmDialog
				open={!!confirmingDelete}
				onOpenChange={(o) => !o && setConfirmingDelete(null)}
				title="Delete folder?"
				description={
					confirmingDelete
						? `"${confirmingDelete.name}" will be removed. Workflows inside move to "All".`
						: ""
				}
				confirmLabel="Delete"
				variant="destructive"
				onConfirm={() => {
					if (confirmingDelete) onDelete(confirmingDelete.id);
					setConfirmingDelete(null);
				}}
			/>
		</div>
	);
}
