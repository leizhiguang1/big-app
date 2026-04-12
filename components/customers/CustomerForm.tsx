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
import {
	createCustomerAction,
	updateCustomerAction,
} from "@/lib/actions/customers";
import {
	type CustomerInput,
	customerInputSchema,
	SALUTATIONS,
	SOURCES,
} from "@/lib/schemas/customers";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount } from "@/lib/services/outlets";

type Props = {
	open: boolean;
	customer: CustomerWithRelations | null;
	outlets: OutletWithRoomCount[];
	employees: EmployeeWithRelations[];
	defaultConsultantId: string | null;
	onClose: () => void;
};

const SELECT_CLASS =
	"h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const EMPTY: CustomerInput = {
	salutation: "Mr",
	first_name: "",
	last_name: undefined,
	gender: null,
	date_of_birth: undefined,
	profile_image_url: undefined,
	id_type: "ic",
	id_number: undefined,
	phone: "",
	phone2: undefined,
	email: undefined,
	country_of_origin: "Malaysia",
	address1: undefined,
	address2: undefined,
	city: undefined,
	state: undefined,
	postcode: undefined,
	home_outlet_id: "",
	consultant_id: "",
	source: null,
	external_code: undefined,
	is_vip: false,
	allergies: undefined,
	opt_in_notifications: true,
	opt_in_marketing: true,
	join_date: undefined,
};

function fromCustomer(c: CustomerWithRelations | null): CustomerInput {
	if (!c) return EMPTY;
	return {
		salutation: (c.salutation as CustomerInput["salutation"]) ?? "Mr",
		first_name: c.first_name,
		last_name: c.last_name ?? undefined,
		gender: (c.gender as CustomerInput["gender"]) ?? null,
		date_of_birth: c.date_of_birth ?? undefined,
		profile_image_url: c.profile_image_url ?? undefined,
		id_type: (c.id_type as CustomerInput["id_type"]) ?? "ic",
		id_number: c.id_number ?? undefined,
		phone: c.phone,
		phone2: c.phone2 ?? undefined,
		email: c.email ?? undefined,
		country_of_origin: c.country_of_origin ?? "Malaysia",
		address1: c.address1 ?? undefined,
		address2: c.address2 ?? undefined,
		city: c.city ?? undefined,
		state: c.state ?? undefined,
		postcode: c.postcode ?? undefined,
		home_outlet_id: c.home_outlet_id,
		consultant_id: c.consultant_id,
		source: (c.source as CustomerInput["source"]) ?? null,
		external_code: c.external_code ?? undefined,
		is_vip: c.is_vip,
		allergies: c.allergies ?? undefined,
		opt_in_notifications: c.opt_in_notifications,
		opt_in_marketing: c.opt_in_marketing,
		join_date: c.join_date ?? undefined,
	};
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<fieldset className="rounded-lg border p-4">
			<legend className="px-2 font-medium text-sm">{title}</legend>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
		</fieldset>
	);
}

function Field({
	label,
	htmlFor,
	error,
	full,
	children,
}: {
	label: string;
	htmlFor?: string;
	error?: string;
	full?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
			<label htmlFor={htmlFor} className="font-medium text-sm">
				{label}
			</label>
			{children}
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
}

export function CustomerFormDialog({
	open,
	customer,
	outlets,
	employees,
	defaultConsultantId,
	onClose,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<CustomerInput>({
		resolver: zodResolver(customerInputSchema),
		defaultValues: EMPTY,
	});

	const idType = form.watch("id_type");

	useEffect(() => {
		if (open) {
			const base = fromCustomer(customer);
			if (!customer) {
				if (defaultConsultantId) base.consultant_id = defaultConsultantId;
				if (outlets.length === 1) base.home_outlet_id = outlets[0].id;
			}
			form.reset(base);
			setServerError(null);
		}
	}, [open, customer, form, defaultConsultantId, outlets]);

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				if (customer) {
					await updateCustomerAction(customer.id, values);
				} else {
					await createCustomerAction(values);
				}
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	});

	const errors = form.formState.errors;

	const consultantOptions = employees.filter(
		(e) => e.is_active || e.id === customer?.consultant_id,
	);
	const outletOptions = outlets.filter(
		(o) => o.is_active || o.id === customer?.home_outlet_id,
	);

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>{customer ? "Edit customer" : "New customer"}</DialogTitle>
					<DialogDescription>
						{customer
							? `Editing ${customer.code}.`
							: "The customer code is auto-generated (CUS-00000001) on save."}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={onSubmit}
					className="flex min-h-0 flex-1 flex-col"
				>
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
					<Section title="Identity">
						<Field
							label="Salutation"
							htmlFor="cus-salutation"
							error={errors.salutation?.message}
						>
							<select
								id="cus-salutation"
								className={SELECT_CLASS}
								{...form.register("salutation")}
							>
								{SALUTATIONS.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</Field>
						<Field label="Gender" htmlFor="cus-gender">
							<select
								id="cus-gender"
								className={SELECT_CLASS}
								{...form.register("gender")}
							>
								<option value="">— Select —</option>
								<option value="male">Male</option>
								<option value="female">Female</option>
							</select>
						</Field>
						<Field
							label="First name"
							htmlFor="cus-first"
							error={errors.first_name?.message}
						>
							<Input id="cus-first" {...form.register("first_name")} />
						</Field>
						<Field
							label="Last name"
							htmlFor="cus-last"
							error={errors.last_name?.message}
						>
							<Input id="cus-last" {...form.register("last_name")} />
						</Field>
						<Field
							label="Date of birth"
							htmlFor="cus-dob"
							error={errors.date_of_birth?.message}
						>
							<Input
								id="cus-dob"
								type="date"
								{...form.register("date_of_birth")}
							/>
						</Field>
					</Section>

					<Section title="Identification">
						<Field label="ID type" htmlFor="cus-idtype" full>
							<div className="flex gap-4 text-sm">
								<label className="flex items-center gap-2">
									<input
										type="radio"
										value="ic"
										className="size-4"
										{...form.register("id_type")}
									/>
									IC
								</label>
								<label className="flex items-center gap-2">
									<input
										type="radio"
										value="passport"
										className="size-4"
										{...form.register("id_type")}
									/>
									Passport
								</label>
							</div>
						</Field>
						<Field
							label={idType === "passport" ? "Passport number" : "IC number"}
							htmlFor="cus-idno"
							full
							error={errors.id_number?.message}
						>
							<Input
								id="cus-idno"
								placeholder={
									idType === "passport" ? "A12345678" : "YYMMDD-PB-####"
								}
								{...form.register("id_number")}
							/>
						</Field>
					</Section>

					<Section title="Contact">
						<Field
							label="Phone"
							htmlFor="cus-phone"
							error={errors.phone?.message}
						>
							<Input
								id="cus-phone"
								placeholder="+60 12-345 6789"
								{...form.register("phone")}
							/>
						</Field>
						<Field label="Secondary phone" htmlFor="cus-phone2">
							<Input
								id="cus-phone2"
								placeholder="+60 12-345 6789"
								{...form.register("phone2")}
							/>
						</Field>
						<Field
							label="Email"
							htmlFor="cus-email"
							error={errors.email?.message}
						>
							<Input id="cus-email" type="email" {...form.register("email")} />
						</Field>
						<Field label="Country of origin" htmlFor="cus-country">
							<Input id="cus-country" {...form.register("country_of_origin")} />
						</Field>
					</Section>

					<Section title="Address">
						<Field label="Address line 1" htmlFor="cus-addr1" full>
							<Input id="cus-addr1" {...form.register("address1")} />
						</Field>
						<Field label="Address line 2" htmlFor="cus-addr2" full>
							<Input id="cus-addr2" {...form.register("address2")} />
						</Field>
						<Field label="Postcode" htmlFor="cus-postcode">
							<Input id="cus-postcode" {...form.register("postcode")} />
						</Field>
						<Field label="City" htmlFor="cus-city">
							<Input id="cus-city" {...form.register("city")} />
						</Field>
						<Field label="State" htmlFor="cus-state" full>
							<Input id="cus-state" {...form.register("state")} />
						</Field>
					</Section>

					<Section title="Clinic">
						<Field
							label="Home outlet"
							htmlFor="cus-outlet"
							error={errors.home_outlet_id?.message}
						>
							<select
								id="cus-outlet"
								className={SELECT_CLASS}
								{...form.register("home_outlet_id")}
							>
								<option value="">— Select —</option>
								{outletOptions.map((o) => (
									<option key={o.id} value={o.id}>
										{o.name}
									</option>
								))}
							</select>
						</Field>
						<Field
							label="Consultant"
							htmlFor="cus-consultant"
							error={errors.consultant_id?.message}
						>
							<select
								id="cus-consultant"
								className={SELECT_CLASS}
								{...form.register("consultant_id")}
							>
								<option value="">— Select —</option>
								{consultantOptions.map((e) => (
									<option key={e.id} value={e.id}>
										{e.first_name} {e.last_name}
									</option>
								))}
							</select>
						</Field>
						<Field label="Source" htmlFor="cus-source">
							<select
								id="cus-source"
								className={SELECT_CLASS}
								{...form.register("source")}
							>
								<option value="">— Select —</option>
								{SOURCES.map((s) => (
									<option key={s} value={s}>
										{s.replace("_", " ")}
									</option>
								))}
							</select>
						</Field>
						<Field
							label="External code"
							htmlFor="cus-ext"
							error={errors.external_code?.message}
						>
							<Input
								id="cus-ext"
								maxLength={15}
								{...form.register("external_code")}
							/>
						</Field>
						<Field
							label="Join date"
							htmlFor="cus-join"
							error={errors.join_date?.message}
						>
							<Input
								id="cus-join"
								type="date"
								{...form.register("join_date")}
							/>
						</Field>
						<Field label="VIP">
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									className="size-4"
									{...form.register("is_vip")}
								/>
								Mark as VIP
							</label>
						</Field>
					</Section>

					<Section title="Medical">
						<Field
							label="Allergies / alerts"
							htmlFor="cus-allergies"
							full
							error={errors.allergies?.message}
						>
							<textarea
								id="cus-allergies"
								rows={3}
								className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
								{...form.register("allergies")}
							/>
						</Field>
					</Section>

					<Section title="Notifications">
						<Field label="Preferences" full>
							<div className="flex flex-col gap-1.5 text-sm">
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										className="size-4"
										{...form.register("opt_in_notifications")}
									/>
									Transactional notifications
								</label>
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										className="size-4"
										{...form.register("opt_in_marketing")}
									/>
									Marketing messages
								</label>
							</div>
						</Field>
					</Section>

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

export function NewCustomerButton({
	outlets,
	employees,
	defaultConsultantId,
}: {
	outlets: OutletWithRoomCount[];
	employees: EmployeeWithRelations[];
	defaultConsultantId: string | null;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button onClick={() => setOpen(true)}>New customer</Button>
			<CustomerFormDialog
				open={open}
				customer={null}
				outlets={outlets}
				employees={employees}
				defaultConsultantId={defaultConsultantId}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
