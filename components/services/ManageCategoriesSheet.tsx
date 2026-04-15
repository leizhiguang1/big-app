"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	createCategoryAction,
	deleteCategoryAction,
	updateCategoryAction,
} from "@/lib/actions/services";
import type { ServiceCategory } from "@/lib/services/services";

export function ManageCategoriesSheet({
	open,
	onOpenChange,
	categories: initialCategories,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	categories: ServiceCategory[];
}) {
	const [categories, setCategories] =
		useState<ServiceCategory[]>(initialCategories);
	const [newName, setNewName] = useState("");
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [removing, setRemoving] = useState<ServiceCategory | null>(null);

	useEffect(() => {
		if (open) {
			setCategories(initialCategories);
			setError(null);
			setNewName("");
		}
	}, [open, initialCategories]);

	const addCategory = () => {
		const name = newName.trim();
		if (!name) return;
		setError(null);
		startTransition(async () => {
			try {
				const created = await createCategoryAction({
					name,
					sort_order: (categories.at(-1)?.sort_order ?? 0) + 10,
					is_active: true,
				});
				setCategories((prev) => [...prev, created]);
				setNewName("");
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to add category");
			}
		});
	};

	const rename = (category: ServiceCategory, nextName: string) => {
		const trimmed = nextName.trim();
		if (!trimmed || trimmed === category.name) return;
		setError(null);
		startTransition(async () => {
			try {
				const updated = await updateCategoryAction(category.id, {
					name: trimmed,
					sort_order: category.sort_order,
					is_active: category.is_active,
				});
				setCategories((prev) =>
					prev.map((c) => (c.id === updated.id ? updated : c)),
				);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to rename category",
				);
			}
		});
	};

	const confirmRemove = (category: ServiceCategory) => {
		setError(null);
		startTransition(async () => {
			try {
				await deleteCategoryAction(category.id);
				setCategories((prev) => prev.filter((c) => c.id !== category.id));
				setRemoving(null);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to remove category",
				);
			}
		});
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Manage Categories</SheetTitle>
					<SheetDescription>
						Used to group services in the catalog and billing picker.
					</SheetDescription>
				</SheetHeader>
				<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
					{categories.length === 0 ? (
						<p className="text-muted-foreground text-xs">No categories yet.</p>
					) : (
						<ul className="flex flex-col gap-1.5">
							{categories.map((category) => (
								<li key={category.id} className="flex items-center gap-2">
									<Input
										defaultValue={category.name}
										className="h-9"
										onBlur={(e) => rename(category, e.currentTarget.value)}
									/>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												disabled={pending}
												onClick={() => setRemoving(category)}
												aria-label="Remove"
											>
												<Trash2 />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Remove</TooltipContent>
									</Tooltip>
								</li>
							))}
						</ul>
					)}
					<div className="flex items-center gap-2">
						<Input
							placeholder="New category name"
							value={newName}
							className="h-9"
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addCategory();
								}
							}}
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={pending || !newName.trim()}
							onClick={addCategory}
						>
							<Plus />
							Add
						</Button>
					</div>
					{error && <p className="text-destructive text-xs">{error}</p>}
				</div>
				<ConfirmDialog
					open={!!removing}
					onOpenChange={(o) => {
						if (!o) setRemoving(null);
					}}
					title="Remove category?"
					description={
						removing
							? `"${removing.name}" will be removed. Services using it will become uncategorized.`
							: undefined
					}
					confirmLabel="Remove"
					pending={pending}
					onConfirm={() => removing && confirmRemove(removing)}
				/>
			</SheetContent>
		</Sheet>
	);
}
