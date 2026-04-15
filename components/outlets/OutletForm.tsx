"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreateButton } from "@/components/ui/create-button";
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
	createOutletAction,
	createRoomAction,
	deleteRoomAction,
	listRoomsAction,
	updateOutletAction,
	updateRoomAction,
} from "@/lib/actions/outlets";
import {
	type OutletCreateInput,
	outletCreateSchema,
} from "@/lib/schemas/outlets";
import type { Outlet, Room } from "@/lib/services/outlets";

type Props = {
	open: boolean;
	outlet: Outlet | null;
	onClose: () => void;
};

const EMPTY: OutletCreateInput = {
	code: "",
	name: "",
	address1: "",
	address2: "",
	city: "",
	state: "",
	postcode: "",
	country: "Malaysia",
	phone: "",
	email: "",
	is_active: true,
};

export function OutletFormDialog({ open, outlet, onClose }: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<OutletCreateInput>({
		resolver: zodResolver(outletCreateSchema),
		defaultValues: EMPTY,
	});

	useEffect(() => {
		if (open) {
			form.reset({
				code: outlet?.code ?? "",
				name: outlet?.name ?? "",
				address1: outlet?.address1 ?? "",
				address2: outlet?.address2 ?? "",
				city: outlet?.city ?? "",
				state: outlet?.state ?? "",
				postcode: outlet?.postcode ?? "",
				country: outlet?.country ?? "Malaysia",
				phone: outlet?.phone ?? "",
				email: outlet?.email ?? "",
				is_active: outlet?.is_active ?? true,
			});
			setServerError(null);
		}
	}, [open, outlet, form]);

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				if (outlet) {
					const { code: _omit, ...rest } = values;
					await updateOutletAction(outlet.id, rest);
				} else {
					await createOutletAction(values);
				}
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	});

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{outlet ? "Edit outlet" : "New outlet"}</DialogTitle>
					<DialogDescription>
						Branches are referenced by appointments, customers, and sales.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-code" className="font-medium text-sm">
									Code
								</label>
								<Input
									id="outlet-code"
									placeholder="BDK"
									disabled={!!outlet}
									{...form.register("code")}
								/>
								{form.formState.errors.code && (
									<p className="text-destructive text-xs">
										{form.formState.errors.code.message}
									</p>
								)}
								{outlet && (
									<p className="text-muted-foreground text-xs">
										Code is immutable after create.
									</p>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-name" className="font-medium text-sm">
									Name
								</label>
								<Input id="outlet-name" {...form.register("name")} />
								{form.formState.errors.name && (
									<p className="text-destructive text-xs">
										{form.formState.errors.name.message}
									</p>
								)}
							</div>
						</div>

						<div className="flex flex-col gap-1.5">
							<label htmlFor="outlet-address1" className="font-medium text-sm">
								Address line 1
							</label>
							<Input id="outlet-address1" {...form.register("address1")} />
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="outlet-address2" className="font-medium text-sm">
								Address line 2
							</label>
							<Input id="outlet-address2" {...form.register("address2")} />
						</div>
						<div className="grid grid-cols-3 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-city" className="font-medium text-sm">
									City
								</label>
								<Input id="outlet-city" {...form.register("city")} />
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-state" className="font-medium text-sm">
									State
								</label>
								<Input id="outlet-state" {...form.register("state")} />
							</div>
							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="outlet-postcode"
									className="font-medium text-sm"
								>
									Postcode
								</label>
								<Input id="outlet-postcode" {...form.register("postcode")} />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-country" className="font-medium text-sm">
									Country
								</label>
								<Input id="outlet-country" {...form.register("country")} />
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-phone" className="font-medium text-sm">
									Phone
								</label>
								<Input id="outlet-phone" {...form.register("phone")} />
							</div>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="outlet-email" className="font-medium text-sm">
								Email
							</label>
							<Input
								id="outlet-email"
								type="email"
								{...form.register("email")}
							/>
							{form.formState.errors.email && (
								<p className="text-destructive text-xs">
									{form.formState.errors.email.message}
								</p>
							)}
						</div>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								{...form.register("is_active")}
								className="size-4"
							/>
							Active
						</label>

						{serverError && (
							<p className="text-destructive text-sm">{serverError}</p>
						)}

						{outlet && <RoomsEditor outletId={outlet.id} />}
					</div>
					<DialogFooter className="border-t">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={pending}>
							{pending ? "Saving…" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function NewOutletButton() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<CreateButton onClick={() => setOpen(true)}>New outlet</CreateButton>
			<OutletFormDialog
				open={open}
				outlet={null}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}

function RoomsEditor({ outletId }: { outletId: string }) {
	const [rooms, setRooms] = useState<Room[] | null>(null);
	const [newName, setNewName] = useState("");
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [removing, setRemoving] = useState<Room | null>(null);

	useEffect(() => {
		let cancelled = false;
		listRoomsAction(outletId).then((data) => {
			if (!cancelled) setRooms(data);
		});
		return () => {
			cancelled = true;
		};
	}, [outletId]);

	const refresh = async () => {
		const data = await listRoomsAction(outletId);
		setRooms(data);
	};

	const addRoom = () => {
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
				await refresh();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to add room");
			}
		});
	};

	const renameRoom = (room: Room, name: string) => {
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
				await refresh();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to rename room");
			}
		});
	};

	const confirmRemove = (room: Room) => {
		setError(null);
		startTransition(async () => {
			try {
				await deleteRoomAction(outletId, room.id);
				await refresh();
				setRemoving(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to remove room");
			}
		});
	};

	return (
		<div className="flex flex-col gap-2 rounded-md border p-3">
			<div className="flex items-center justify-between">
				<h3 className="font-medium text-sm">Rooms</h3>
				<span className="text-muted-foreground text-xs">
					{rooms?.length ?? 0}
				</span>
			</div>
			{rooms === null ? (
				<p className="text-muted-foreground text-xs">Loading…</p>
			) : rooms.length === 0 ? (
				<p className="text-muted-foreground text-xs">No rooms yet.</p>
			) : (
				<ul className="flex flex-col gap-1">
					{rooms.map((room) => (
						<li key={room.id} className="flex items-center gap-2">
							<Input
								defaultValue={room.name}
								className="h-8"
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
					className="h-8"
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
		</div>
	);
}
