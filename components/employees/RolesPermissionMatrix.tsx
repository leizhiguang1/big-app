"use client";

import { ArrowDownUp, Check, Pencil, Trash2, X } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteRoleAction, updateRoleAction } from "@/lib/actions/roles";
import {
	PERMISSION_SECTIONS,
	type PermissionSectionKey,
	type RolePermissions,
} from "@/lib/schemas/role-permissions";
import type { Role } from "@/lib/services/roles";
import { RoleFormDialog } from "./RoleForm";

type SectionStyle = {
	header: string;
	subHeader: string;
	cellHover: string;
	cellOn: string;
};

const SECTION_STYLES: Record<PermissionSectionKey, SectionStyle> = {
	clinical: {
		header: "bg-red-200 text-red-900",
		subHeader: "bg-red-50 text-red-900",
		cellHover: "hover:bg-red-50/60",
		cellOn: "text-red-600",
	},
	appointments: {
		header: "bg-blue-200 text-blue-900",
		subHeader: "bg-blue-50 text-blue-900",
		cellHover: "hover:bg-blue-50/60",
		cellOn: "text-blue-600",
	},
	customers: {
		header: "bg-green-200 text-green-900",
		subHeader: "bg-green-50 text-green-900",
		cellHover: "hover:bg-green-50/60",
		cellOn: "text-green-600",
	},
	sales: {
		header: "bg-orange-200 text-orange-900",
		subHeader: "bg-orange-50 text-orange-900",
		cellHover: "hover:bg-orange-50/60",
		cellOn: "text-orange-600",
	},
	roster: {
		header: "bg-violet-200 text-violet-900",
		subHeader: "bg-violet-50 text-violet-900",
		cellHover: "hover:bg-violet-50/60",
		cellOn: "text-violet-600",
	},
	services: {
		header: "bg-slate-300 text-slate-900",
		subHeader: "bg-slate-100 text-slate-900",
		cellHover: "hover:bg-slate-100/60",
		cellOn: "text-slate-700",
	},
	inventory: {
		header: "bg-yellow-200 text-yellow-900",
		subHeader: "bg-yellow-50 text-yellow-900",
		cellHover: "hover:bg-yellow-50/60",
		cellOn: "text-yellow-700",
	},
	staff: {
		header: "bg-pink-200 text-pink-900",
		subHeader: "bg-pink-50 text-pink-900",
		cellHover: "hover:bg-pink-50/60",
		cellOn: "text-pink-600",
	},
	system: {
		header: "bg-indigo-200 text-indigo-900",
		subHeader: "bg-indigo-50 text-indigo-900",
		cellHover: "hover:bg-indigo-50/60",
		cellOn: "text-indigo-600",
	},
};

type FlatFlag = {
	sectionKey: PermissionSectionKey;
	flagKey: string;
	label: string;
	style: SectionStyle;
};

const FLAT_FLAGS: FlatFlag[] = PERMISSION_SECTIONS.flatMap((section) =>
	section.flags.map((flag) => ({
		sectionKey: section.key,
		flagKey: flag.key,
		label: flag.label,
		style: SECTION_STYLES[section.key],
	})),
);

function isFlagOn(
	permissions: RolePermissions,
	sectionKey: PermissionSectionKey,
	flagKey: string,
): boolean {
	const bucket = permissions[sectionKey] as
		| Record<string, boolean>
		| undefined;
	return Boolean(bucket?.[flagKey]);
}

type PendingToggle = {
	role: Role;
	sectionKey: PermissionSectionKey;
	flagKey: string;
	label: string;
	nextValue: boolean;
};

export function RolesPermissionMatrix({ roles }: { roles: Role[] }) {
	const [editing, setEditing] = useState<Role | null>(null);
	const [deleting, setDeleting] = useState<Role | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const [headerOrientation, setHeaderOrientation] = useState<
		"vertical" | "horizontal"
	>("vertical");
	const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(
		null,
	);
	const [optimisticRoles, applyOptimistic] = useOptimistic(
		roles,
		(state, patch: { id: string; permissions: RolePermissions }) =>
			state.map((r) =>
				r.id === patch.id ? { ...r, permissions: patch.permissions } : r,
			),
	);

	const persist = (role: Role, nextPermissions: RolePermissions) => {
		startTransition(async () => {
			applyOptimistic({ id: role.id, permissions: nextPermissions });
			try {
				await updateRoleAction(role.id, {
					name: role.name,
					is_active: role.is_active,
					permissions: nextPermissions,
				});
			} catch (err) {
				console.error(err);
			}
		});
	};

	const requestToggle = (
		role: Role,
		sectionKey: PermissionSectionKey,
		flagKey: string,
		label: string,
	) => {
		const currentOn = isFlagOn(role.permissions, sectionKey, flagKey);
		setPendingToggle({
			role,
			sectionKey,
			flagKey,
			label,
			nextValue: !currentOn,
		});
	};

	const confirmToggle = () => {
		if (!pendingToggle) return;
		const { role, sectionKey, flagKey, nextValue } = pendingToggle;
		const next = structuredClone(role.permissions);
		const bucket = ((next[sectionKey] ??= {}) as Record<string, boolean>);
		bucket[flagKey] = nextValue;
		persist(role, next);
		setPendingToggle(null);
	};

	if (optimisticRoles.length === 0) {
		return (
			<div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">
				No roles yet. Click “New role” to create one.
			</div>
		);
	}

	const isVertical = headerOrientation === "vertical";

	return (
		<>
			<div className="mb-2 flex items-center justify-end">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() =>
						setHeaderOrientation((o) =>
							o === "vertical" ? "horizontal" : "vertical",
						)
					}
				>
					<ArrowDownUp />
					{isVertical ? "Horizontal headers" : "Vertical headers"}
				</Button>
			</div>
			<div className="overflow-x-auto rounded-lg border">
				<table className="border-collapse text-sm">
					<thead>
						<tr>
							<th
								rowSpan={2}
								className="sticky left-0 z-20 w-48 border-r border-b bg-slate-100 px-3 py-2 text-left align-bottom font-semibold"
							>
								Role
							</th>
							{PERMISSION_SECTIONS.map((section) => {
								const styles = SECTION_STYLES[section.key];
								return (
									<th
										key={section.key}
										colSpan={section.flags.length}
										className={`border-r border-b px-2 py-1.5 text-center font-semibold text-[11px] uppercase tracking-wide last:border-r-0 ${styles.header}`}
									>
										{section.label}
									</th>
								);
							})}
							<th
								rowSpan={2}
								className="w-20 border-b bg-slate-100 px-2 py-2 text-center align-bottom font-semibold text-xs"
							>
								Actions
							</th>
						</tr>
						<tr>
							{FLAT_FLAGS.map((f, i) => {
								const nextDifferent =
									FLAT_FLAGS[i + 1]?.sectionKey !== f.sectionKey;
								return (
									<th
										key={`${f.sectionKey}-${f.flagKey}`}
										className={`border-b px-0 align-bottom font-normal text-xs ${
											f.style.subHeader
										} ${nextDifferent ? "border-r" : ""} ${
											isVertical ? "h-40" : "h-12"
										}`}
									>
										{isVertical ? (
											<div className="mx-auto flex h-40 w-8 items-end justify-center pb-2">
												<span
													className="whitespace-nowrap"
													style={{
														writingMode: "vertical-rl",
														transform: "rotate(180deg)",
													}}
												>
													{f.label}
												</span>
											</div>
										) : (
											<div className="mx-auto flex h-12 min-w-[120px] items-center justify-center px-2 text-center leading-tight">
												{f.label}
											</div>
										)}
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{optimisticRoles.map((role) => (
							<tr key={role.id}>
								<th className="sticky left-0 z-10 border-r border-b bg-white px-3 py-2 text-left font-medium">
									<div className="flex flex-col">
										<span>{role.name}</span>
										{!role.is_active && (
											<span className="text-[10px] text-muted-foreground">
												Inactive
											</span>
										)}
									</div>
								</th>
								{FLAT_FLAGS.map((f, i) => {
									const on = isFlagOn(
										role.permissions,
										f.sectionKey,
										f.flagKey,
									);
									const nextDifferent =
										FLAT_FLAGS[i + 1]?.sectionKey !== f.sectionKey;
									return (
										<td
											key={`${role.id}-${f.sectionKey}-${f.flagKey}`}
											className={`border-b p-0 text-center ${
												nextDifferent ? "border-r" : ""
											}`}
										>
											<button
												type="button"
												onClick={() =>
													requestToggle(
														role,
														f.sectionKey,
														f.flagKey,
														f.label,
													)
												}
												aria-pressed={on}
												aria-label={`${f.label}: ${on ? "on" : "off"}`}
												className={`flex h-9 w-full min-w-[32px] items-center justify-center transition-colors ${f.style.cellHover}`}
											>
												{on ? (
													<Check className={`size-4 ${f.style.cellOn}`} />
												) : (
													<X className="size-3 text-muted-foreground/40" />
												)}
											</button>
										</td>
									);
								})}
								<td className="border-b px-2 py-1 text-center">
									<div className="inline-flex gap-0.5">
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => setEditing(role)}
											aria-label={`Edit ${role.name}`}
										>
											<Pencil />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => {
												setActionError(null);
												setDeleting(role);
											}}
											aria-label={`Delete ${role.name}`}
										>
											<Trash2 />
										</Button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{pending && (
				<p className="mt-2 text-muted-foreground text-xs">Saving…</p>
			)}

			<ConfirmDialog
				open={!!pendingToggle}
				onOpenChange={(o) => {
					if (!o) setPendingToggle(null);
				}}
				title={pendingToggle ? "Update permission?" : ""}
				description={
					pendingToggle
						? `${pendingToggle.nextValue ? "Grant" : "Revoke"} "${pendingToggle.label}" for role "${pendingToggle.role.name}"?`
						: undefined
				}
				variant="default"
				confirmLabel={pendingToggle?.nextValue ? "Grant" : "Revoke"}
				onConfirm={confirmToggle}
			/>

			<RoleFormDialog
				open={!!editing}
				value={editing}
				onClose={() => setEditing(null)}
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete role?"
				description={
					deleting
						? `"${deleting.name}" will be permanently removed. This cannot be undone.${actionError ? ` — ${actionError}` : ""}`
						: undefined
				}
				confirmLabel="Delete"
				pending={pending}
				onConfirm={() => {
					if (!deleting) return;
					const target = deleting;
					setActionError(null);
					startTransition(async () => {
						try {
							await deleteRoleAction(target.id);
							setDeleting(null);
						} catch (err) {
							setActionError(
								err instanceof Error ? err.message : "Failed to delete",
							);
						}
					});
				}}
			/>
		</>
	);
}
