"use client";

import { useEffect, useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import {
	createBrandConfigItemAction,
	updateBrandConfigItemAction,
} from "@/lib/actions/brand-config";
import {
	type BrandConfigCategory,
	getCategoryDef,
} from "@/lib/brand-config/categories";
import type { BrandConfigItem } from "@/lib/services/brand-config";

type Props = {
	open: boolean;
	onClose: () => void;
	category: BrandConfigCategory;
	item?: BrandConfigItem | null;
};

export function BrandConfigItemDialog({
	open,
	onClose,
	category,
	item,
}: Props) {
	const def = getCategoryDef(category);
	const isEdit = !!item;
	const [label, setLabel] = useState("");
	const [color, setColor] = useState("#60a5fa");
	const [serverError, setServerError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	useEffect(() => {
		if (!open) return;
		setServerError(null);
		if (item) {
			setLabel(item.label);
			setColor(item.color ?? "#60a5fa");
		} else {
			setLabel("");
			setColor("#60a5fa");
		}
	}, [open, item]);

	const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		startTransition(async () => {
			try {
				if (isEdit && item) {
					await updateBrandConfigItemAction(item.id, {
						label,
						color: def.hasColor ? color : null,
					});
				} else {
					await createBrandConfigItemAction({
						category,
						label,
						color: def.hasColor ? color : null,
					});
				}
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	};

	const noun = (def.singularLabel ?? def.label).toLowerCase();

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? `Edit ${noun}` : `New ${noun}`}
					</DialogTitle>
					<DialogDescription>
						{isEdit
							? def.storage === "live"
								? "Renames apply to every existing record using this item."
								: `Rename this ${noun}. Past records keep their original wording.`
							: (def.hint ?? `Type the ${noun} and save.`)}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="bc-label">
								{def.singularLabel ?? "Label"}
							</Label>
							<Input
								id="bc-label"
								value={label}
								onChange={(e) => setLabel(e.target.value)}
								placeholder={`e.g. ${def.singularLabel ?? def.label}`}
								required
							/>
						</div>
						{def.hasColor && (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="bc-color">Color</Label>
								<div className="flex items-center gap-2">
									<input
										id="bc-color"
										type="color"
										value={color}
										onChange={(e) => setColor(e.target.value)}
										className="h-9 w-12 cursor-pointer rounded border"
									/>
									<Input
										value={color}
										onChange={(e) => setColor(e.target.value)}
										className="font-mono"
										maxLength={7}
									/>
								</div>
							</div>
						)}
						{serverError && (
							<p className="text-destructive text-sm">{serverError}</p>
						)}
					</div>
					<DialogFooter className="border-t">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={pending}>
							{pending ? "Saving…" : isEdit ? "Save" : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
