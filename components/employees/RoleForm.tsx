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

type SectionStyle = {
	label: string;
	pillOn: string;
	pillOff: string;
	strip: string;
};

const SECTION_STYLES: Record<
	(typeof PERMISSION_SECTIONS)[number]["key"],
	SectionStyle
> = {
	clinical: {
		label: "bg-red-100 text-red-900 border-red-200",
		pillOn: "bg-red-500 text-white border-red-500",
		pillOff: "bg-white text-red-900 border-red-200 hover:bg-red-50",
		strip: "bg-red-50/40",
	},
	appointments: {
		label: "bg-blue-100 text-blue-900 border-blue-200",
		pillOn: "bg-blue-500 text-white border-blue-500",
		pillOff: "bg-white text-blue-900 border-blue-200 hover:bg-blue-50",
		strip: "bg-blue-50/40",
	},
	customers: {
		label: "bg-green-100 text-green-900 border-green-200",
		pillOn: "bg-green-600 text-white border-green-600",
		pillOff: "bg-white text-green-900 border-green-200 hover:bg-green-50",
		strip: "bg-green-50/40",
	},
	sales: {
		label: "bg-orange-100 text-orange-900 border-orange-200",
		pillOn: "bg-orange-500 text-white border-orange-500",
		pillOff: "bg-white text-orange-900 border-orange-200 hover:bg-orange-50",
		strip: "bg-orange-50/40",
	},
	roster: {
		label: "bg-violet-100 text-violet-900 border-violet-200",
		pillOn: "bg-violet-500 text-white border-violet-500",
		pillOff: "bg-white text-violet-900 border-violet-200 hover:bg-violet-50",
		strip: "bg-violet-50/40",
	},
	services: {
		label: "bg-slate-200 text-slate-900 border-slate-300",
		pillOn: "bg-slate-600 text-white border-slate-600",
		pillOff: "bg-white text-slate-900 border-slate-300 hover:bg-slate-100",
		strip: "bg-slate-50",
	},
	inventory: {
		label: "bg-yellow-100 text-yellow-900 border-yellow-200",
		pillOn: "bg-yellow-500 text-white border-yellow-500",
		pillOff: "bg-white text-yellow-900 border-yellow-200 hover:bg-yellow-50",
		strip: "bg-yellow-50/40",
	},
	staff: {
		label: "bg-pink-100 text-pink-900 border-pink-200",
		pillOn: "bg-pink-500 text-white border-pink-500",
		pillOff: "bg-white text-pink-900 border-pink-200 hover:bg-pink-50",
		strip: "bg-pink-50/40",
	},
	system: {
		label: "bg-indigo-100 text-indigo-900 border-indigo-200",
		pillOn: "bg-indigo-500 text-white border-indigo-500",
		pillOff: "bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-50",
		strip: "bg-indigo-50/40",
	},
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

	const totalEnabled = PERMISSION_SECTIONS.reduce(
		(n, s) =>
			n + countSection(permissions?.[s.key] as Record<string, boolean>),
		0,
	);

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-5xl">
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
							</div>
						</div>

						<div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
							<span className="font-medium">Permissions</span>
							<span className="text-muted-foreground">
								{totalEnabled} / {TOTAL_PERMISSION_FLAGS} enabled
							</span>
						</div>

						<div className="overflow-hidden rounded-lg border">
							{PERMISSION_SECTIONS.map((section, idx) => {
								const styles = SECTION_STYLES[section.key];
								const enabled = countSection(
									permissions?.[section.key] as Record<string, boolean>,
								);
								return (
									<div
										key={section.key}
										className={`flex items-stretch ${styles.strip} ${
											idx > 0 ? "border-t" : ""
										}`}
									>
										<div
											className={`flex w-40 shrink-0 flex-col justify-center gap-1 border-r px-3 py-3 ${styles.label}`}
										>
											<div className="font-semibold text-xs uppercase tracking-wide">
												{section.label}
											</div>
											<div className="flex items-center justify-between gap-2 text-[11px] opacity-80">
												<span>
													{enabled}/{section.flags.length}
												</span>
												<span className="inline-flex gap-1.5">
													<button
														type="button"
														className="underline-offset-2 hover:underline"
														onClick={() =>
															toggleSectionAll(section.key, true)
														}
													>
														All
													</button>
													<span>·</span>
													<button
														type="button"
														className="underline-offset-2 hover:underline"
														onClick={() =>
															toggleSectionAll(section.key, false)
														}
													>
														None
													</button>
												</span>
											</div>
										</div>
										<div className="min-w-0 flex-1 overflow-x-auto">
											<div className="flex items-center gap-2 p-3">
												{section.flags.map((flag) => (
													<Controller
														key={flag.key}
														control={form.control}
														name={
															`permissions.${section.key}.${flag.key}` as never
														}
														render={({ field }) => {
															const on = Boolean(field.value);
															return (
																<button
																	type="button"
																	onClick={() => field.onChange(!on)}
																	aria-pressed={on}
																	className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
																		on ? styles.pillOn : styles.pillOff
																	}`}
																>
																	{flag.label}
																</button>
															);
														}}
													/>
												))}
											</div>
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
