"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createBrandAction } from "@/lib/actions/admin-brands";
import {
	type CreateBrandInput,
	createBrandSchema,
} from "@/lib/schemas/admin-brands";
import { SUPPORTED_CURRENCIES } from "@/lib/schemas/brands";

type Props = {
	open: boolean;
	onClose: () => void;
	rootHost: string;
};

const EMPTY: CreateBrandInput = {
	subdomain: "",
	code: "",
	name: "",
	currency_code: "MYR",
	admin_email: "",
	admin_password: "",
	admin_first_name: "",
	admin_last_name: "",
};

function deriveCodeFromName(name: string): string {
	const upper = name
		.toUpperCase()
		.replace(/[^A-Z0-9 ]+/g, " ")
		.trim();
	if (!upper) return "";
	const word = upper.split(/\s+/)[0] ?? "";
	return word.slice(0, 8);
}

function deriveSubdomainFromName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 30);
}

export function NewBrandDialog({ open, onClose, rootHost }: Props) {
	const [pending, startTransition] = useTransition();
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);
	const form = useForm<CreateBrandInput>({
		resolver: zodResolver(createBrandSchema),
		defaultValues: EMPTY,
		mode: "onBlur",
	});

	useEffect(() => {
		if (open) {
			form.reset(EMPTY);
			setSubmitError(null);
			setShowPassword(false);
		}
	}, [open, form]);

	const watchedName = form.watch("name");
	const watchedCode = form.watch("code");
	const watchedSubdomain = form.watch("subdomain");

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when name changes
	useEffect(() => {
		if (!watchedCode && watchedName) {
			form.setValue("code", deriveCodeFromName(watchedName), {
				shouldDirty: false,
			});
		}
		if (!watchedSubdomain && watchedName) {
			form.setValue("subdomain", deriveSubdomainFromName(watchedName), {
				shouldDirty: false,
			});
		}
	}, [watchedName]);

	const onSubmit = form.handleSubmit((values) => {
		setSubmitError(null);
		startTransition(async () => {
			try {
				await createBrandAction(values);
				onClose();
			} catch (e) {
				setSubmitError(
					e instanceof Error ? e.message : "Failed to create brand",
				);
			}
		});
	});

	const errors = form.formState.errors;
	const subdomainPreview = watchedSubdomain
		? `${watchedSubdomain}.${rootHost.split(":")[0] || "—"}`
		: "—";

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 p-0">
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle>New brand</DialogTitle>
					<DialogDescription>
						Creates the brand and provisions a brand-admin user. The admin
						signs in at the new subdomain with the email and password below
						and can change their password later.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={onSubmit} className="flex flex-1 flex-col">
					<div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
						<div>
							<Label htmlFor="brand-name">Brand name</Label>
							<Input
								id="brand-name"
								{...form.register("name")}
								placeholder="Sunshine Dental"
							/>
							{errors.name && (
								<p className="mt-1 text-xs text-destructive">
									{errors.name.message}
								</p>
							)}
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="brand-code">Code</Label>
								<Input
									id="brand-code"
									{...form.register("code")}
									placeholder="SUN"
									className="font-mono uppercase"
								/>
								<p className="mt-1 text-xs text-muted-foreground">
									Short uppercase identifier. Used internally.
								</p>
								{errors.code && (
									<p className="mt-1 text-xs text-destructive">
										{errors.code.message}
									</p>
								)}
							</div>
							<div>
								<Label htmlFor="brand-currency">Currency</Label>
								<Select
									value={form.watch("currency_code")}
									onValueChange={(v) =>
										form.setValue("currency_code", v, {
											shouldDirty: true,
										})
									}
								>
									<SelectTrigger id="brand-currency">
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
						</div>

						<div>
							<Label htmlFor="brand-subdomain">Subdomain</Label>
							<Input
								id="brand-subdomain"
								{...form.register("subdomain")}
								placeholder="sunshine-dental"
								className="font-mono lowercase"
							/>
							<p className="mt-1 text-xs text-muted-foreground">
								URL: <span className="font-mono">{subdomainPreview}</span>
							</p>
							{errors.subdomain && (
								<p className="mt-1 text-xs text-destructive">
									{errors.subdomain.message}
								</p>
							)}
						</div>

						<div className="border-t pt-4">
							<p className="text-sm font-medium">Brand admin</p>
							<p className="text-xs text-muted-foreground">
								A new user is created with these credentials. They sign in at
								the brand subdomain.
							</p>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="admin-first">First name</Label>
								<Input
									id="admin-first"
									{...form.register("admin_first_name")}
								/>
								{errors.admin_first_name && (
									<p className="mt-1 text-xs text-destructive">
										{errors.admin_first_name.message}
									</p>
								)}
							</div>
							<div>
								<Label htmlFor="admin-last">Last name</Label>
								<Input id="admin-last" {...form.register("admin_last_name")} />
								{errors.admin_last_name && (
									<p className="mt-1 text-xs text-destructive">
										{errors.admin_last_name.message}
									</p>
								)}
							</div>
						</div>

						<div>
							<Label htmlFor="admin-email">Admin email</Label>
							<Input
								id="admin-email"
								type="email"
								autoComplete="off"
								{...form.register("admin_email")}
								placeholder="admin@brand.com"
							/>
							{errors.admin_email && (
								<p className="mt-1 text-xs text-destructive">
									{errors.admin_email.message}
								</p>
							)}
						</div>

						<div>
							<Label htmlFor="admin-password">Admin password</Label>
							<div className="relative">
								<Input
									id="admin-password"
									type={showPassword ? "text" : "password"}
									autoComplete="new-password"
									{...form.register("admin_password")}
									placeholder="At least 8 characters"
								/>
								<button
									type="button"
									aria-label={
										showPassword ? "Hide password" : "Show password"
									}
									onClick={() => setShowPassword((v) => !v)}
									className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
							{errors.admin_password && (
								<p className="mt-1 text-xs text-destructive">
									{errors.admin_password.message}
								</p>
							)}
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
							{pending ? "Creating…" : "Create brand"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
