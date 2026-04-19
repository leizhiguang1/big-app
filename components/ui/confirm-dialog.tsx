"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "default" | "destructive";
	pending?: boolean;
	onConfirm: () => void;
	altLabel?: string;
	onAlt?: () => void;
};

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	variant = "destructive",
	pending = false,
	onConfirm,
	altLabel,
	onAlt,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex flex-col gap-0 p-0 sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				<DialogFooter className="border-t">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={pending}
					>
						{cancelLabel}
					</Button>
					{altLabel && onAlt && (
						<Button
							type="button"
							variant="secondary"
							onClick={onAlt}
							disabled={pending}
						>
							{altLabel}
						</Button>
					)}
					<Button
						type="button"
						variant={variant}
						onClick={onConfirm}
						disabled={pending}
					>
						{pending ? "Working…" : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
