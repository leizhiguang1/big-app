"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createRoleAction, updateRoleAction } from "@/lib/actions/roles";
import {
	emptyPermissions,
	PERMISSION_SECTIONS,
	type RolePermissions,
	TOTAL_PERMISSION_FLAGS,
} from "@/lib/schemas/role-permissions";
import { type RoleInput, roleInputSchema } from "@/lib/schemas/roles";
import type { Role } from "@/lib/services/roles";

type Props = {
	open: boolean;
	value: Role | null;
	onClose: () => void;
};

const SECTION_STYLES: Record<
	(typeof PERMISSION_SECTIONS)[number]["key"],
	{ header: string; bullet: string }
> = {
	clinical: { header: "bg-red-50 text-red-900", bullet: "bg-red-500" },
	appointments: { header: "bg-blue-50 text-blue-900", bullet: "bg-blue-500" },
	customers: { header: "bg-green-50 text-green-900", bullet: "bg-green-500" },
	sales: { header: "bg-orange-50 text-orange-900", bullet: "bg-orange-500" },
	roster: { header: "bg-violet-50 text-violet-900", bullet: "bg-violet-500" },
	services: { header: "bg-slate-100 text-slate-900", bullet: "bg-slate-500" },
	inventory: {
		header: "bg-yellow-50 text-yellow-900",
		bullet: "bg-yellow-500",
	},
	staff: { header: "bg-pink-50 text-pink-900", bullet: "bg-pink-500" },
	system: { header: "bg-indigo-50 text-indigo-900", bullet: "bg-indigo-500" },
};

function countSection(bucket: Record<string, boolean> | undefined): number {
	if (!bucket) return 0;
	return Object.values(bucket).filter(Boolean).length;
}

export function RoleFormDialog({ open, value: role, onClose }: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<RoleInput>({
		resolver: zodResolver(roleInputSchema),
		defaultValues: {
			name: "",
			is_active: true,
			permissions: emptyPermissions(),
		},
	});

	const allAccess = form.watch("permissions.all");
	const permissions = form.watch("permissions") as RolePermissions;

	useEffect(() => {
		if (open) {
			form.reset({
				name: role?.name ?? "",
				is_active: role?.is_active ?? true,
				permissions: role?.permissions ?? emptyPermissions(),
			});
			setServerError(null);
		}
	}, [open, role, form]);

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				if (role) {
					await updateRoleAction(role.id, values);
				} else {
					await createRoleAction(values);
				}
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	});

	const toggleSectionAll = (
		sectionKey: keyof RolePermissions,
		next: boolean,
	) => {
		if (sectionKey === "all") return;
		const section = PERMISSION_SECTIONS.find((s) => s.key === sectionKey);
		if (!section) return;
		const bucket: Record<string, boolean> = {};
		for (const f of section.flags) bucket[f.key] = next;
		form.setValue(`permissions.${sectionKey}` as const, bucket as never, {
			shouldDirty: true,
		});
	};

	const totalEnabled = allAccess
		? TOTAL_PERMISSION_FLAGS
		: PERMISSION_SECTIONS.reduce(
				(n, s) =>
					n + countSection(permissions?.[s.key] as Record<string, boolean>),
				0,
			);

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>{role ? "Edit role" : "New role"}</DialogTitle>
					<DialogDescription>
						Permission flags are stored but not yet enforced. Turn them on now
						so the data is ready when the gate lands.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={onSubmit}
					className="flex min-h-0 flex-1 flex-col overflow-hidden"
				>
					<div className="flex-1 space-y-5 overflow-y-auto p-4">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="role-name" className="font-medium text-sm">
									Name
								</label>
								<Input id="role-name" {...form.register("name")} />
								{form.formState.errors.name && (
									<p className="text-destructive text-xs">
										{form.formState.errors.name.message}
									</p>
								)}
							</div>
							<div className="flex items-end gap-4">
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										{...form.register("is_active")}
										className="size-4"
									/>
									Active
								</label>
								<Controller
									control={form.control}
									name="permissions.all"
									render={({ field }) => (
										<label className="flex items-center gap-2 text-sm font-medium">
											<input
												type="checkbox"
												className="size-4"
												checked={field.value}
												onChange={(e) => field.onChange(e.target.checked)}
											/>
											Full access (grant everything)
										</label>
									)}
								/>
							</div>
						</div>

						<div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
							<span className="font-medium">Permissions</span>
							<span className="text-muted-foreground">
								{totalEnabled} / {TOTAL_PERMISSION_FLAGS} enabled
							</span>
						</div>

						<div
							className={`space-y-4 transition-opacity ${
								allAccess ? "pointer-events-none opacity-40" : ""
							}`}
						>
							{PERMISSION_SECTIONS.map((section) => {
								const styles = SECTION_STYLES[section.key];
								const enabled = countSection(
									permissions?.[section.key] as Record<string, boolean>,
								);
								return (
									<div
										key={section.key}
										className="overflow-hidden rounded-lg border"
									>
										<div
											className={`flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide ${styles.header}`}
										>
											<span className="inline-flex items-center gap-2">
												<span
													className={`inline-block size-2 rounded-full ${styles.bullet}`}
												/>
												{section.label}
												<span className="font-normal normal-case opacity-70">
													({enabled}/{section.flags.length})
												</span>
											</span>
											<div className="inline-flex gap-2 text-[11px] font-normal normal-case">
												<button
													type="button"
													className="underline-offset-2 hover:underline"
													onClick={() => toggleSectionAll(section.key, true)}
												>
													All
												</button>
												<span>·</span>
												<button
													type="button"
													className="underline-offset-2 hover:underline"
													onClick={() => toggleSectionAll(section.key, false)}
												>
													None
												</button>
											</div>
										</div>
										<div className="grid grid-cols-1 gap-x-4 gap-y-1.5 p-3 sm:grid-cols-2">
											{section.flags.map((flag) => (
												<Controller
													key={flag.key}
													control={form.control}
													name={
														`permissions.${section.key}.${flag.key}` as never
													}
													render={({ field }) => (
														<label className="flex items-center gap-2 text-sm">
															<input
																type="checkbox"
																className="size-4"
																checked={Boolean(field.value)}
																onChange={(e) =>
																	field.onChange(e.target.checked)
																}
															/>
															{flag.label}
														</label>
													)}
												/>
											))}
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{serverError && (
						<p className="px-4 pb-2 text-destructive text-sm">{serverError}</p>
					)}
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

export function NewRoleButton() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button onClick={() => setOpen(true)}>New role</Button>
			<RoleFormDialog open={open} value={null} onClose={() => setOpen(false)} />
		</>
	);
}
