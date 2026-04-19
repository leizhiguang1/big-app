"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	createRoomAction,
	deleteRoomAction,
	listRoomsAction,
	updateRoomAction,
} from "@/lib/actions/outlets";
import type { Room } from "@/lib/services/outlets";

type Props = {
	open: boolean;
	outletId: string | null;
	outletName: string;
	onClose: () => void;
};

export function RoomsDialog({ open, outletId, outletName, onClose }: Props) {
	const router = useRouter();
	const [rooms, setRooms] = useState<Room[] | null>(null);
	const [newName, setNewName] = useState("");
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [removing, setRemoving] = useState<Room | null>(null);
	const [touched, setTouched] = useState(false);

	useEffect(() => {
		if (!open || !outletId) return;
		let cancelled = false;
		setRooms(null);
		setNewName("");
		setError(null);
		setTouched(false);
		listRoomsAction(outletId).then((data) => {
			if (!cancelled) setRooms(data);
		});
		return () => {
			cancelled = true;
		};
	}, [open, outletId]);

	const refresh = async () => {
		if (!outletId) return;
		const data = await listRoomsAction(outletId);
		setRooms(data);
	};

	const addRoom = () => {
		if (!outletId) return;
		const name = newName.trim();
		if (!name) return;
		setError(null);
		startTransition(async () => {
			try {
				await createRoomAction(outletId, {
					name,
					sort_order: (rooms?.length ?? 0) + 1,
					is_active: true,
				});
				setNewName("");
				setTouched(true);
				await refresh();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to add room");
			}
		});
	};

	const renameRoom = (room: Room, name: string) => {
		if (!outletId) return;
		const trimmed = name.trim();
		if (!trimmed || trimmed === room.name) return;
		setError(null);
		startTransition(async () => {
			try {
				await updateRoomAction(outletId, room.id, {
					name: trimmed,
					sort_order: room.sort_order,
					is_active: room.is_active,
				});
				setTouched(true);
				await refresh();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to rename room");
			}
		});
	};

	const confirmRemove = (room: Room) => {
		if (!outletId) return;
		setError(null);
		startTransition(async () => {
			try {
				await deleteRoomAction(outletId, room.id);
				setTouched(true);
				await refresh();
				setRemoving(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to remove room");
			}
		});
	};

	const handleClose = () => {
		if (touched) router.refresh();
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Rooms · {outletName}</DialogTitle>
					<DialogDescription>
						Each outlet must keep at least one room.
					</DialogDescription>
				</DialogHeader>
				<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
					{rooms === null ? (
						<p className="text-muted-foreground text-xs">Loading…</p>
					) : rooms.length === 0 ? (
						<p className="text-muted-foreground text-xs">No rooms yet.</p>
					) : (
						<ul className="flex flex-col gap-1.5">
							{rooms.map((room) => (
								<li key={room.id} className="flex items-center gap-2">
									<Input
										defaultValue={room.name}
										className="h-9"
										onBlur={(e) => renameRoom(room, e.currentTarget.value)}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										disabled={pending}
										onClick={() => setRemoving(room)}
										aria-label="Remove"
									>
										<Trash2 />
									</Button>
								</li>
							))}
						</ul>
					)}
					<div className="flex items-center gap-2">
						<Input
							placeholder="New room name"
							value={newName}
							className="h-9"
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addRoom();
								}
							}}
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={pending || !newName.trim()}
							onClick={addRoom}
						>
							<Plus />
							Add
						</Button>
					</div>
					{error && <p className="text-destructive text-xs">{error}</p>}
				</div>
				<DialogFooter className="border-t">
					<Button type="button" onClick={handleClose}>
						Done
					</Button>
				</DialogFooter>
				<ConfirmDialog
					open={!!removing}
					onOpenChange={(o) => {
						if (!o) setRemoving(null);
					}}
					title="Remove room?"
					description={
						removing
							? `"${removing.name}" will be removed from this outlet.`
							: undefined
					}
					confirmLabel="Remove"
					pending={pending}
					onConfirm={() => removing && confirmRemove(removing)}
				/>
			</DialogContent>
		</Dialog>
	);
}
