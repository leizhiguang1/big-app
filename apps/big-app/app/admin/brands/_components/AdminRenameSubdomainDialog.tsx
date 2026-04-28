"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
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
import { adminRenameSubdomainAction } from "@/lib/actions/admin-brands";
import {
	type AdminRenameSubdomainInput,
	adminRenameSubdomainSchema,
} from "@/lib/schemas/admin-brands";
import type { AdminBrandRow } from "@/lib/services/platform-admin";

type Props = {
	open: boolean;
	onClose: () => void;
	brand: AdminBrandRow | null;
	rootHost: string;
};

export function AdminRenameSubdomainDialog({
	open,
	onClose,
	brand,
	rootHost,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [submitError, setSubmitError] = useState<string | null>(null);
	const form = useForm<AdminRenameSubdomainInput>({
		resolver: zodResolver(adminRenameSubdomainSchema),
		defaultValues: {
			brand_id: "",
			subdomain: "",
			confirm_subdomain: "",
		},
		mode: "onBlur",
	});

	useEffect(() => {
		if (open && brand) {
			form.reset({
				brand_id: brand.id,
				subdomain: "",
				confirm_subdomain: "",
			});
			setSubmitError(null);
		}
	}, [open, brand, form]);

	const onSubmit = form.handleSubmit((values) => {
		setSubmitError(null);
		startTransition(async () => {
			try {
				await adminRenameSubdomainAction(values);
				onClose();
			} catch (e) {
				setSubmitError(
					e instanceof Error ? e.message : "Failed to rename subdomain",
				);
			}
		});
	});

	const errors = form.formState.errors;
	const watched = form.watch("subdomain");
	const preview = watched
		? `${watched}.${rootHost.split(":")[0] || "—"}`
		: "—";

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle>Rename subdomain</DialogTitle>
					<DialogDescription>
						{brand ? (
							<>
								Current:{" "}
								<span className="font-mono">
									{brand.subdomain}.{rootHost.split(":")[0]}
								</span>
							</>
						) : null}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={onSubmit} className="flex flex-1 flex-col">
					<div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
						<div>
							<Label htmlFor="rename-sub">New subdomain</Label>
							<Input
								id="rename-sub"
								{...form.register("subdomain")}
								className="font-mono lowercase"
								placeholder="new-subdomain"
							/>
							<p className="mt-1 text-xs text-muted-foreground">
								New URL: <span className="font-mono">{preview}</span>
							</p>
							{errors.subdomain && (
								<p className="mt-1 text-xs text-destructive">
									{errors.subdomain.message}
								</p>
							)}
						</div>

						<div>
							<Label htmlFor="rename-sub-confirm">Type it again to confirm</Label>
							<Input
								id="rename-sub-confirm"
								{...form.register("confirm_subdomain")}
								className="font-mono lowercase"
							/>
							{errors.confirm_subdomain && (
								<p className="mt-1 text-xs text-destructive">
									{errors.confirm_subdomain.message}
								</p>
							)}
						</div>

						<p className="text-xs text-muted-foreground">
							The old subdomain will 301-redirect to the new one for 30 days,
							then become reusable by another brand.
						</p>

						{submitError && (
							<div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
								{submitError}
							</div>
						)}
					</div>

					<DialogFooter className="border-t px-6 py-4">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={pending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={pending}>
							{pending ? "Renaming…" : "Rename subdomain"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
