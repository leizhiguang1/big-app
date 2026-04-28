"use client";

import { Search, UserRound, X } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import { mediaPublicUrl } from "@/lib/storage/urls";
import { cn } from "@/lib/utils";

type PickableEmployee = Pick<
	EmployeeWithRelations,
	"id" | "first_name" | "last_name" | "profile_image_path" | "is_active"
> & {
	position: { id: string; name: string } | null;
};

type Props = {
	employees: PickableEmployee[];
	value: string | null;
	onChange: (employeeId: string | null) => void;
	placeholder?: string;
	title?: string;
	description?: ReactNode;
	allowClear?: boolean;
	disabled?: boolean;
	className?: string;
	size?: "sm" | "md";
	highlightEmpty?: boolean;
};

export function EmployeePicker({
	employees,
	value,
	onChange,
	placeholder = "Select employee",
	title = "Select employee",
	description,
	allowClear = true,
	disabled = false,
	className,
	size = "md",
	highlightEmpty = false,
}: Props) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const selectable = useMemo(
		() => employees.filter((e) => e.is_active),
		[employees],
	);
	const selected = useMemo(
		() => employees.find((e) => e.id === value) ?? null,
		[employees, value],
	);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const sorted = [...selectable].sort((a, b) =>
			employeeLabel(a).localeCompare(employeeLabel(b)),
		);
		if (!q) return sorted;
		return sorted.filter((e) => {
			const name = employeeLabel(e).toLowerCase();
			const pos = (e.position?.name ?? "").toLowerCase();
			return name.includes(q) || pos.includes(q);
		});
	}, [selectable, query]);

	const openPicker = () => {
		if (disabled) return;
		setQuery("");
		setOpen(true);
	};

	return (
		<>
			<div
				className={cn(
					"inline-flex max-w-full items-stretch rounded-full border transition",
					disabled && "pointer-events-none opacity-60",
					selected
						? "border-blue-200 bg-blue-50 text-blue-800"
						: highlightEmpty
							? "border-dashed border-amber-300 bg-background text-amber-700 hover:border-amber-400 hover:bg-amber-50"
							: "border-dashed border-input bg-background text-muted-foreground hover:border-ring hover:bg-accent",
					className,
				)}
			>
				<button
					type="button"
					onClick={openPicker}
					disabled={disabled}
					className={cn(
						"flex min-w-0 items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
						size === "sm" ? "h-7 pl-1 pr-2.5 text-[11px]" : "h-9 pl-1.5 pr-3 text-sm",
						selected && allowClear && "rounded-r-none pr-2",
						selected && "hover:bg-blue-100",
					)}
				>
					{selected ? (
						<>
							<EmployeeAvatar
								employee={selected}
								size={size === "sm" ? 20 : 26}
							/>
							<span className="truncate font-medium">
								{employeeLabel(selected)}
							</span>
						</>
					) : (
						<>
							<UserRound className={size === "sm" ? "size-3.5" : "size-4"} />
							<span className="truncate">{placeholder}</span>
						</>
					)}
				</button>
				{selected && allowClear && (
					<button
						type="button"
						aria-label="Clear selection"
						onClick={() => onChange(null)}
						disabled={disabled}
						className={cn(
							"flex items-center justify-center rounded-r-full border-l border-blue-200/70 px-1.5 text-blue-400 outline-none hover:bg-blue-100 hover:text-blue-800 focus-visible:ring-2 focus-visible:ring-ring/50",
							size === "sm" ? "h-7" : "h-9",
						)}
					>
						<X className="size-3.5" />
					</button>
				)}
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-lg">
					<DialogHeader className="border-b">
						<DialogTitle>{title}</DialogTitle>
						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}
					</DialogHeader>
					<div className="border-b p-3">
						<div className="relative">
							<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								autoFocus
								placeholder="Search name or position…"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								className="h-9 pl-8"
							/>
						</div>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{filtered.length === 0 ? (
							<div className="py-12 text-center text-muted-foreground text-sm">
								{query
									? `No employees match "${query}"`
									: "No employees available"}
							</div>
						) : (
							<ul className="divide-y divide-border">
								{filtered.map((e) => {
									const isSelected = e.id === value;
									return (
										<li key={e.id}>
											<button
												type="button"
												onClick={() => {
													onChange(e.id);
													setOpen(false);
												}}
												className={cn(
													"flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-accent",
													isSelected && "bg-blue-50/70 hover:bg-blue-100/60",
												)}
											>
												<EmployeeAvatar employee={e} size={36} />
												<div className="min-w-0 flex-1">
													<div className="truncate font-medium text-sm">
														{employeeLabel(e)}
													</div>
													{e.position?.name && (
														<div className="truncate text-muted-foreground text-xs">
															{e.position.name}
														</div>
													)}
												</div>
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

function employeeLabel(e: {
	first_name: string;
	last_name: string | null;
}): string {
	return `${e.first_name} ${e.last_name ?? ""}`.trim();
}

function EmployeeAvatar({
	employee,
	size,
}: {
	employee: {
		first_name: string;
		last_name: string | null;
		profile_image_path: string | null;
	};
	size: number;
}) {
	const url = mediaPublicUrl(employee.profile_image_path);
	const initials =
		`${employee.first_name?.[0] ?? ""}${employee.last_name?.[0] ?? ""}`.toUpperCase();
	return (
		<div
			className="relative shrink-0 overflow-hidden rounded-full border bg-muted"
			style={{ width: size, height: size }}
		>
			{url ? (
				<Image
					src={url}
					alt=""
					fill
					sizes={`${size}px`}
					className="object-cover"
					unoptimized
				/>
			) : (
				<div className="flex size-full items-center justify-center font-medium text-[10px] text-muted-foreground">
					{initials || "?"}
				</div>
			)}
		</div>
	);
}
