"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Link2, MapPin, ShoppingBag } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateBrandAction } from "@/lib/actions/brands";
import {
	type BrandUpdateInput,
	brandUpdateSchema,
	SUPPORTED_CURRENCIES,
} from "@/lib/schemas/brands";
import type { Brand } from "@/lib/services/brands";
import { SubdomainRenameDialog } from "./SubdomainRenameDialog";

const SOCIAL_PLATFORMS = [
	{
		id: "facebook",
		label: "Facebook",
		icon: Link2,
		prefix: null,
		placeholder: "facebook.com/yourpage",
	},
	{
		id: "instagram",
		label: "Instagram",
		icon: Link2,
		prefix: null,
		placeholder: "instagram.com/yourhandle",
	},
	{
		id: "linkedin",
		label: "LinkedIn",
		icon: Link2,
		prefix: null,
		placeholder: "linkedin.com/company/yourco",
	},
	{
		id: "pinterest",
		label: "Pinterest",
		icon: Link2,
		prefix: null,
		placeholder: "pinterest.com/yourboard",
	},
	{
		id: "twitter",
		label: "Twitter / X",
		icon: Link2,
		prefix: null,
		placeholder: "twitter.com/yourhandle",
	},
	{
		id: "website",
		label: "Website",
		icon: Globe,
		prefix: "http://",
		placeholder: "yourdomain.com",
	},
	{
		id: "tripadvisor",
		label: "TripAdvisor",
		icon: MapPin,
		prefix: "tripadvisor.com/",
		placeholder: "restaurant/your-listing",
	},
	{
		id: "lazada",
		label: "Lazada",
		icon: ShoppingBag,
		prefix: null,
		placeholder: "lazada.com.my/shop/yourshop",
	},
	{
		id: "shopee",
		label: "Shopee",
		icon: ShoppingBag,
		prefix: null,
		placeholder: "shopee.com.my/yourshop",
	},
] as const;

function brandToValues(brand: Brand): BrandUpdateInput {
	return {
		name: brand.name,
		nickname: brand.nickname ?? "",
		logo_url: brand.logo_url ?? "",
		contact_phone: brand.contact_phone ?? "",
		currency_code:
			(brand.currency_code as BrandUpdateInput["currency_code"]) ?? "MYR",
		subdomain: brand.subdomain ?? "",
		registered_name: brand.registered_name ?? "",
		registration_number: brand.registration_number ?? "",
		tax_id: brand.tax_id ?? "",
		address: brand.address ?? "",
		email: brand.email ?? "",
		website: brand.website ?? "",
		tagline: brand.tagline ?? "",
	};
}

type GeneralTabProps = {
	brand: Brand;
	rootDomainLabel: string;
};

export function GeneralTab({ brand, rootDomainLabel }: GeneralTabProps) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [renameOpen, setRenameOpen] = useState(false);

	const form = useForm<BrandUpdateInput>({
		resolver: zodResolver(brandUpdateSchema),
		defaultValues: brandToValues(brand),
	});

	useEffect(() => {
		form.reset(brandToValues(brand));
	}, [brand, form]);

	const onSubmit = form.handleSubmit((values) => {
		setServerError(null);
		setSaved(false);
		startTransition(async () => {
			try {
				await updateBrandAction(values);
				setSaved(true);
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Could not save brand",
				);
			}
		});
	});

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div className="grid gap-4 lg:grid-cols-2">
				{/* Business Details */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Business Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-col items-center gap-2 pb-2">
							<ImageUpload
								value={form.watch("logo_url") || null}
								onChange={(path) =>
									form.setValue("logo_url", path ?? "", { shouldDirty: true })
								}
								entity="brands"
								entityId={brand.id}
								shape="square"
								sizeClass="size-24"
								layout="stacked"
							/>
							<p className="text-muted-foreground text-xs">
								Logo shown on receipts, invoices, and printable docs.
							</p>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="biz-name">
									Business Name <span className="text-destructive">*</span>
								</Label>
								<Input id="biz-name" {...form.register("name")} />
								{form.formState.errors.name && (
									<p className="text-destructive text-xs">
										{form.formState.errors.name.message}
									</p>
								)}
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="biz-nickname">Nickname</Label>
								<Input
									id="biz-nickname"
									placeholder="Short label, e.g. BIG"
									{...form.register("nickname")}
								/>
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="biz-contact">Contact Phone</Label>
								<Input
									id="biz-contact"
									placeholder="+60123456789"
									{...form.register("contact_phone")}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="biz-email">Email</Label>
								<Input
									id="biz-email"
									type="email"
									placeholder="hello@yourbrand.com"
									{...form.register("email")}
								/>
								{form.formState.errors.email && (
									<p className="text-destructive text-xs">
										{form.formState.errors.email.message}
									</p>
								)}
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="biz-subdomain">Sub-Domain</Label>
								<div className="flex">
									<Input
										id="biz-subdomain"
										value={brand.subdomain}
										readOnly
										className="rounded-r-none font-mono"
									/>
									<span className="inline-flex items-center rounded-r-md border border-l-0 bg-muted px-3 text-muted-foreground text-sm">
										.{rootDomainLabel}
									</span>
								</div>
								<button
									type="button"
									onClick={() => setRenameOpen(true)}
									className="text-xs text-primary hover:underline"
								>
									Rename subdomain…
								</button>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="currency">
									Currency <span className="text-destructive">*</span>
								</Label>
								<Select
									value={form.watch("currency_code")}
									onValueChange={(v) =>
										form.setValue(
											"currency_code",
											v as BrandUpdateInput["currency_code"],
											{ shouldDirty: true },
										)
									}
								>
									<SelectTrigger id="currency">
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

						<div className="space-y-1.5">
							<Label htmlFor="biz-address">Address</Label>
							<Textarea
								id="biz-address"
								rows={2}
								placeholder="Street, city, state, postcode, country"
								{...form.register("address")}
							/>
						</div>

						<div className="border-t pt-4">
							<p className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
								Tax & Registration
							</p>
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="biz-reg-name">Registered Name</Label>
									<Input
										id="biz-reg-name"
										placeholder="Legal entity name"
										{...form.register("registered_name")}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="biz-reg-no">Registration No.</Label>
									<Input
										id="biz-reg-no"
										placeholder="SSM / UEN"
										{...form.register("registration_number")}
									/>
								</div>
							</div>
							<div className="mt-3 grid gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="biz-tax-id">Tax Registration No.</Label>
									<Input
										id="biz-tax-id"
										placeholder="SST / GST / VAT"
										{...form.register("tax_id")}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="biz-website">Website</Label>
									<Input
										id="biz-website"
										placeholder="https://yourbrand.com"
										{...form.register("website")}
									/>
								</div>
							</div>
							<div className="mt-3 space-y-1.5">
								<Label htmlFor="biz-tagline">Tagline</Label>
								<Input
									id="biz-tagline"
									placeholder="Optional — printed under the logo on receipts"
									{...form.register("tagline")}
								/>
							</div>
						</div>

						<div className="flex items-center justify-end gap-3 border-t pt-3">
							{serverError && (
								<p className="text-destructive text-xs">{serverError}</p>
							)}
							{saved && !pending && !form.formState.isDirty && (
								<p className="text-emerald-600 text-xs">Saved</p>
							)}
							<Button size="sm" type="submit" disabled={pending}>
								{pending ? "Saving…" : "Save"}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Social Media — UI mock, not yet persisted */}
				<Card className="opacity-90">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							Social Media
							<span className="rounded bg-muted px-1.5 py-0.5 font-normal text-[10px] text-muted-foreground uppercase tracking-wide">
								Coming soon
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{SOCIAL_PLATFORMS.map((p) => {
							const Icon = p.icon;
							return (
								<div key={p.id} className="flex items-center gap-2">
									<Icon className="size-5 shrink-0 text-muted-foreground" />
									{p.prefix ? (
										<div className="flex flex-1">
											<span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-2 text-muted-foreground text-xs">
												{p.prefix}
											</span>
											<Input
												className="rounded-l-none"
												placeholder={p.placeholder}
												disabled
											/>
										</div>
									) : (
										<Input
											className="flex-1"
											placeholder={p.placeholder}
											disabled
										/>
									)}
									<Switch disabled />
								</div>
							);
						})}
					</CardContent>
				</Card>
			</div>
			<SubdomainRenameDialog
				open={renameOpen}
				onClose={() => setRenameOpen(false)}
				currentSubdomain={brand.subdomain}
				rootDomainLabel={rootDomainLabel}
			/>
		</form>
	);
}
