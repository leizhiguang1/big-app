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
import { renameSubdomainAction } from "@/lib/actions/admin-brands";
import {
	type RenameSubdomainInput,
	renameSubdomainSchema,
} from "@/lib/schemas/admin-brands";

type Props = {
	open: boolean;
	onClose: () => void;
	currentSubdomain: string;
	rootDomainLabel: string;
};

export function SubdomainRenameDialog({
	open,
	onClose,
	currentSubdomain,
	rootDomainLabel,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [submitError, setSubmitError] = useState<string | null>(null);
	const form = useForm<RenameSubdomainInput>({
		resolver: zodResolver(renameSubdomainSchema),
		defaultValues: { subdomain: "", confirm_subdomain: "" },
		mode: "onBlur",
	});

	useEffect(() => {
		if (open) {
			form.reset({ subdomain: "", confirm_subdomain: "" });
			setSubmitError(null);
		}
	}, [open, form]);

	const onSubmit = form.handleSubmit((values) => {
		setSubmitError(null);
		startTransition(async () => {
			try {
				// On a real rename, the action redirects to the new subdomain
				// before this resolves — so the success path is "page navigates".
				await renameSubdomainAction(values);
				onClose();
			} catch (e) {
				setSubmitError(
					e instanceof Error ? e.message : "Failed to rename subdomain",
				);
			}
		});
	});

	const watchedSubdomain = form.watch("subdomain");
	const errors = form.formState.errors;

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle>Rename subdomain</DialogTitle>
					<DialogDescription>
						Your workspace will move from{" "}
						<span className="font-mono text-foreground">
							{currentSubdomain}.{rootDomainLabel}
						</span>{" "}
						to the new subdomain. Old links 301 to the new one for 30 days, then
						return a not-found page. The old subdomain enters a 30-day cooldown
						before anyone else can claim it.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={onSubmit} className="flex flex-1 flex-col">
					<div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
						<div>
							<Label htmlFor="rename-new">New subdomain</Label>
							<div className="flex">
								<Input
									id="rename-new"
									{...form.register("subdomain")}
									placeholder="newname"
									className="rounded-r-none font-mono lowercase"
									autoComplete="off"
								/>
								<span className="inline-flex items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm text-muted-foreground">
									.{rootDomainLabel}
								</span>
							</div>
							{errors.subdomain && (
								<p className="mt-1 text-xs text-destructive">
									{errors.subdomain.message}
								</p>
							)}
						</div>

						<div>
							<Label htmlFor="rename-confirm">Type again to confirm</Label>
							<Input
								id="rename-confirm"
								{...form.register("confirm_subdomain")}
								placeholder={watchedSubdomain || "newname"}
								className="font-mono lowercase"
								autoComplete="off"
							/>
							{errors.confirm_subdomain && (
								<p className="mt-1 text-xs text-destructive">
									{errors.confirm_subdomain.message}
								</p>
							)}
						</div>

						<div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
							After rename you&apos;ll be redirected to the new subdomain. Your
							session follows you (cookies are workspace-wide).
						</div>

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
