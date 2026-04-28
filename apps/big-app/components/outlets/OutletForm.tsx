"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CreateButton } from "@/components/ui/create-button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	createOutletAction,
	updateOutletAction,
} from "@/lib/actions/outlets";
import { ImageUpload } from "@/components/ui/image-upload";
import {
	type OutletCreateInput,
	outletCreateSchema,
} from "@/lib/schemas/outlets";
import type { Outlet } from "@/lib/services/outlets";

type Props = {
	open: boolean;
	outlet: Outlet | null;
	onClose: () => void;
};

const EMPTY: OutletCreateInput = {
	code: "",
	name: "",
	nick_name: "",
	company_reg_number: "",
	company_reg_name: "",
	show_reg_number_on_invoice: false,
	tax_number: "",
	show_tax_number_on_invoice: false,
	address1: "",
	address2: "",
	postcode: "",
	country: "Malaysia",
	state: "",
	city: "",
	phone: "",
	phone2: "",
	email: "",
	bank_name: "",
	bank_account_number: "",
	waze_name: "",
	location_video_url: "",
	location_link: "",
	logo_url: "",
	is_active: true,
};

export function OutletFormDialog({ open, outlet, onClose }: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);
	const pendingId = useRef(crypto.randomUUID());

	const form = useForm<OutletCreateInput>({
		resolver: zodResolver(outletCreateSchema),
		defaultValues: EMPTY,
	});

	useEffect(() => {
		if (open) {
			form.reset({
				code: outlet?.code ?? "",
				name: outlet?.name ?? "",
				nick_name: outlet?.nick_name ?? "",
				company_reg_number: outlet?.company_reg_number ?? "",
				company_reg_name: outlet?.company_reg_name ?? "",
				show_reg_number_on_invoice: outlet?.show_reg_number_on_invoice ?? false,
				tax_number: outlet?.tax_number ?? "",
				show_tax_number_on_invoice: outlet?.show_tax_number_on_invoice ?? false,
				address1: outlet?.address1 ?? "",
				address2: outlet?.address2 ?? "",
				postcode: outlet?.postcode ?? "",
				country: outlet?.country ?? "Malaysia",
				state: outlet?.state ?? "",
				city: outlet?.city ?? "",
				phone: outlet?.phone ?? "",
				phone2: outlet?.phone2 ?? "",
				email: outlet?.email ?? "",
				bank_name: outlet?.bank_name ?? "",
				bank_account_number: outlet?.bank_account_number ?? "",
				waze_name: outlet?.waze_name ?? "",
				location_video_url: outlet?.location_video_url ?? "",
				location_link: outlet?.location_link ?? "",
				logo_url: outlet?.logo_url ?? "",
				is_active: outlet?.is_active ?? true,
			});
			setServerError(null);
		}
	}, [open, outlet, form]);

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				if (outlet) {
					const { code: _omit, ...rest } = values;
					await updateOutletAction(outlet.id, rest);
				} else {
					await createOutletAction(values);
				}
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	});

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent
				preventOutsideClose
				className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-2xl"
			>
				<DialogHeader>
					<DialogTitle>{outlet ? "Edit outlet" : "New outlet"}</DialogTitle>
					<DialogDescription>
						Branches are referenced by appointments, customers, and sales.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">

						{/* Logo */}
					<div className="flex flex-col items-center gap-2 border-b pb-4">
						<p className="text-muted-foreground text-xs">Outlet Logo</p>
						<ImageUpload
							value={form.watch("logo_url") || null}
							onChange={(path) => form.setValue("logo_url", path ?? "")}
							entity="outlets"
							entityId={outlet?.id ?? pendingId.current}
							shape="square"
							sizeClass="size-24"
							layout="stacked"
						/>
						<p className="text-muted-foreground text-xs">
							JPG, PNG, or WebP · max 5 MB
						</p>
					</div>

					{/* Code + Name + Nick Name */}
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-code" className="font-medium text-sm">
									Code <span className="text-destructive">*</span>
								</label>
								<Input
									id="outlet-code"
									placeholder="BDK"
									disabled={!!outlet}
									{...form.register("code")}
								/>
								{form.formState.errors.code && (
									<p className="text-destructive text-xs">
										{form.formState.errors.code.message}
									</p>
								)}
								<p className="text-muted-foreground text-xs">
									{outlet
										? "Code is immutable after create."
										: "2–6 uppercase letters/digits. Used as the prefix for every customer registered at this outlet (e.g. BDK-000001)."}
								</p>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-nick-name" className="font-medium text-sm">
									Outlet Nick Name
								</label>
								<Input
									id="outlet-nick-name"
									placeholder="BDK"
									{...form.register("nick_name")}
								/>
							</div>
						</div>

						<div className="flex flex-col gap-1.5">
							<label htmlFor="outlet-name" className="font-medium text-sm">
								Outlet Name <span className="text-destructive">*</span>
							</label>
							<Input id="outlet-name" {...form.register("name")} />
							{form.formState.errors.name && (
								<p className="text-destructive text-xs">
									{form.formState.errors.name.message}
								</p>
							)}
						</div>

						{/* Company Registration */}
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-company-reg-number" className="font-medium text-sm">
									Company Registration #
								</label>
								<Input
									id="outlet-company-reg-number"
									placeholder="202501031998 (1633410)"
									{...form.register("company_reg_number")}
								/>
								<label className="flex items-center gap-2 text-xs text-muted-foreground">
									<input
										type="checkbox"
										{...form.register("show_reg_number_on_invoice")}
										className="size-3.5"
									/>
									Show in Invoices / Receipts
								</label>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-company-reg-name" className="font-medium text-sm">
									Company Registration Name
								</label>
								<Input
									id="outlet-company-reg-name"
									placeholder="BIG DENTAL GROUP SDN. BHD."
									{...form.register("company_reg_name")}
								/>
							</div>
						</div>

						{/* Tax Number + Email */}
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-tax-number" className="font-medium text-sm">
									Tax Number
								</label>
								<Input
									id="outlet-tax-number"
									placeholder="C 60274199080"
									{...form.register("tax_number")}
								/>
								<label className="flex items-center gap-2 text-xs text-muted-foreground">
									<input
										type="checkbox"
										{...form.register("show_tax_number_on_invoice")}
										className="size-3.5"
									/>
									Show in Invoices / Receipts
								</label>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-email" className="font-medium text-sm">
									Outlet Email Address
								</label>
								<Input
									id="outlet-email"
									type="email"
									{...form.register("email")}
								/>
								{form.formState.errors.email && (
									<p className="text-destructive text-xs">
										{form.formState.errors.email.message}
									</p>
								)}
							</div>
						</div>

						{/* Phone 1 + Phone 2 */}
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-phone" className="font-medium text-sm">
									Contact Number
								</label>
								<Input
									id="outlet-phone"
									placeholder="+60169339931"
									{...form.register("phone")}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-phone2" className="font-medium text-sm">
									Contact Number 2
								</label>
								<Input
									id="outlet-phone2"
									placeholder="+60 12-345 6789"
									{...form.register("phone2")}
								/>
							</div>
						</div>

						{/* Address */}
						<div className="flex flex-col gap-1.5">
							<label htmlFor="outlet-address1" className="font-medium text-sm">
								Address 1
							</label>
							<Input
								id="outlet-address1"
								placeholder="NO.28(GROUND FLOOR), JALAN LANG KUNING"
								{...form.register("address1")}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="outlet-address2" className="font-medium text-sm">
								Address 2
							</label>
							<Input
								id="outlet-address2"
								placeholder="EG: JALAN PJU 1A/2"
								{...form.register("address2")}
							/>
						</div>

						{/* Postcode + Country */}
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-postcode" className="font-medium text-sm">
									Post Code
								</label>
								<Input id="outlet-postcode" placeholder="52100" {...form.register("postcode")} />
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-country" className="font-medium text-sm">
									Country
								</label>
								<Input id="outlet-country" {...form.register("country")} />
							</div>
						</div>

						{/* State + City */}
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-state" className="font-medium text-sm">
									State
								</label>
								<Input id="outlet-state" {...form.register("state")} />
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-city" className="font-medium text-sm">
									City
								</label>
								<Input id="outlet-city" {...form.register("city")} />
							</div>
						</div>

						{/* Bank */}
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-bank-name" className="font-medium text-sm">
									Bank Name
								</label>
								<Input
									id="outlet-bank-name"
									placeholder="EG: Maybank"
									{...form.register("bank_name")}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-bank-account" className="font-medium text-sm">
									Bank Account Number
								</label>
								<Input
									id="outlet-bank-account"
									placeholder="EG: 114521114523"
									{...form.register("bank_account_number")}
								/>
							</div>
						</div>

						{/* Waze + Location Video */}
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-waze-name" className="font-medium text-sm">
									Outlet Name In Waze
								</label>
								<Input
									id="outlet-waze-name"
									placeholder="EG: Big Dental Kepong"
									{...form.register("waze_name")}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="outlet-location-video" className="font-medium text-sm">
									Outlet Location Video
								</label>
								<Input
									id="outlet-location-video"
									placeholder="EG: https://youtu.be/..."
									{...form.register("location_video_url")}
								/>
							</div>
						</div>

						{/* Location Link */}
						<div className="flex flex-col gap-1.5">
							<label htmlFor="outlet-location-link" className="font-medium text-sm">
								Outlet Location Link
							</label>
							<Input
								id="outlet-location-link"
								placeholder="EG: https://maps.app.goo.gl/..."
								{...form.register("location_link")}
							/>
						</div>

						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								{...form.register("is_active")}
								className="size-4"
							/>
							Active
						</label>

						{serverError && (
							<p className="text-destructive text-sm">{serverError}</p>
						)}
					</div>
					<DialogFooter className="border-t">
						<Button type="button" variant="outline" onClick={onClose}>
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

export function NewOutletButton() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<CreateButton onClick={() => setOpen(true)}>New outlet</CreateButton>
			<OutletFormDialog
				open={open}
				outlet={null}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
