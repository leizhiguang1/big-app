"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { updateBrandAction } from "@/lib/actions/admin-brands";
import {
	type UpdateBrandInput,
	updateBrandSchema,
} from "@/lib/schemas/admin-brands";
import { SUPPORTED_CURRENCIES } from "@/lib/schemas/brands";
import type { AdminBrandRow } from "@/lib/services/platform-admin";

type Props = {
	open: boolean;
	onClose: () => void;
	brand: AdminBrandRow | null;
};

export function EditBrandDialog({ open, onClose, brand }: Props) {
	const [pending, startTransition] = useTransition();
	const [submitError, setSubmitError] = useState<string | null>(null);
	const form = useForm<UpdateBrandInput>({
		resolver: zodResolver(updateBrandSchema),
		defaultValues: {
			brand_id: "",
			name: "",
			nickname: "",
			currency_code: "MYR",
		},
		mode: "onBlur",
	});

	useEffect(() => {
		if (open && brand) {
			form.reset({
				brand_id: brand.id,
				name: brand.name,
				nickname: brand.nickname ?? "",
				currency_code: brand.currency_code,
			});
			setSubmitError(null);
		}
	}, [open, brand, form]);

	const onSubmit = form.handleSubmit((values) => {
		setSubmitError(null);
		startTransition(async () => {
			try {
				await updateBrandAction(values);
				onClose();
			} catch (e) {
				setSubmitError(e instanceof Error ? e.message : "Failed to save");
			}
		});
	});

	const errors = form.formState.errors;

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle>Edit brand</DialogTitle>
				</DialogHeader>

				<form onSubmit={onSubmit} className="flex flex-1 flex-col">
					<div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
						<div>
							<Label htmlFor="edit-name">
								Name
								<span className="ml-0.5 text-destructive">*</span>
							</Label>
							<Input id="edit-name" {...form.register("name")} />
							{errors.name && (
								<p className="mt-1 text-xs text-destructive">
									{errors.name.message}
								</p>
							)}
						</div>

						<div>
							<Label htmlFor="edit-nickname">
								Nickname{" "}
								<span className="text-muted-foreground">(optional)</span>
							</Label>
							<Input
								id="edit-nickname"
								{...form.register("nickname")}
								placeholder="Display name shown in lists"
							/>
						</div>

						<div>
							<Label htmlFor="edit-currency">
								Currency
								<span className="ml-0.5 text-destructive">*</span>
							</Label>
							<Select
								value={form.watch("currency_code")}
								onValueChange={(v) =>
									form.setValue("currency_code", v, { shouldDirty: true })
								}
							>
								<SelectTrigger id="edit-currency">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SUPPORTED_CURRENCIES.map((c) => (
										<SelectItem key={c.value} value={c.value}>
											{c.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<p className="text-xs text-muted-foreground">
							Subdomain renames go through a separate flow (cooldown checks).
							Code is immutable.
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
							{pending ? "Saving…" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
