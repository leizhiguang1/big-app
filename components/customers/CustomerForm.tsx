"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mars, ScanLine, Star, Venus } from "lucide-react";
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
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import {
	createCustomerAction,
	updateCustomerAction,
} from "@/lib/actions/customers";
import { deleteMediaObjectAction } from "@/lib/actions/storage";
import {
	MEDICAL_CONDITIONS,
	type MedicalCondition,
	SMOKER_LABELS,
	SMOKER_OPTIONS,
} from "@/lib/constants/medical";
import {
	type CustomerInput,
	customerInputSchema,
	type Gender,
	SALUTATIONS,
	SOURCES,
} from "@/lib/schemas/customers";
import type { Customer, CustomerWithRelations } from "@/lib/services/customers";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import { cn } from "@/lib/utils";

type Props = {
	open: boolean;
	customer: CustomerWithRelations | null;
	outlets: OutletWithRoomCount[];
	employees: EmployeeWithRelations[];
	defaultConsultantId: string | null;
	onClose: () => void;
	onCreated?: (customer: Customer) => void;
};

const SELECT_CLASS =
	"h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const EMPTY: CustomerInput = {
	salutation: "Mr",
	first_name: "",
	last_name: undefined,
	gender: null,
	date_of_birth: undefined,
	profile_image_path: null,
	id_type: "ic",
	id_number: undefined,
	passport_no: undefined,
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
	is_staff: false,
	tag: undefined,
	smoker: null,
	drug_allergies: undefined,
	medical_conditions: [],
	medical_alert: undefined,
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
		profile_image_path: c.profile_image_path ?? null,
		id_type: (c.id_type as CustomerInput["id_type"]) ?? "ic",
		id_number: c.id_number ?? undefined,
		passport_no: c.passport_no ?? undefined,
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
		is_staff: c.is_staff,
		tag: c.tag ?? undefined,
		smoker: (c.smoker as CustomerInput["smoker"]) ?? null,
		drug_allergies: c.drug_allergies ?? undefined,
		medical_conditions:
			(c.medical_conditions as MedicalCondition[] | null) ?? [],
		medical_alert: c.medical_alert ?? undefined,
		opt_in_notifications: c.opt_in_notifications,
		opt_in_marketing: c.opt_in_marketing,
		join_date: c.join_date ?? undefined,
	};
}

// Pivot: 2-digit years <= current YY → 20YY, else 19YY.
// Matches Malaysian convention well enough for living customers.
type IcParseResult =
	| { ok: true; digits: string; dob: string; gender: Gender }
	| { ok: false; digits: string; reason: "empty" | "length" | "date" };

function parseMalaysianIc(raw: string): IcParseResult {
	const digits = raw.replace(/\D/g, "");
	if (digits.length === 0) return { ok: false, digits, reason: "empty" };
	if (digits.length !== 12) return { ok: false, digits, reason: "length" };
	const yy = Number.parseInt(digits.slice(0, 2), 10);
	const mm = Number.parseInt(digits.slice(2, 4), 10);
	const dd = Number.parseInt(digits.slice(4, 6), 10);
	if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
		return { ok: false, digits, reason: "date" };
	}
	const currentYY = new Date().getFullYear() % 100;
	const fullYear = yy <= currentYY ? 2000 + yy : 1900 + yy;
	const date = new Date(Date.UTC(fullYear, mm - 1, dd));
	if (
		date.getUTCFullYear() !== fullYear ||
		date.getUTCMonth() !== mm - 1 ||
		date.getUTCDate() !== dd
	) {
		return { ok: false, digits, reason: "date" };
	}
	const dob = `${fullYear.toString().padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
	const lastDigit = Number.parseInt(digits.slice(11, 12), 10);
	const gender: Gender = lastDigit % 2 === 0 ? "female" : "male";
	return { ok: true, digits, dob, gender };
}

type SectionKey = "personal" | "address" | "medical" | "notifications";

const SECTIONS: { key: SectionKey; label: string }[] = [
	{ key: "personal", label: "Personal Information" },
	{ key: "address", label: "Address" },
	{ key: "medical", label: "Medical Information" },
	{ key: "notifications", label: "Notification & Marketing" },
];

function Field({
	label,
	htmlFor,
	error,
	required,
	full,
	children,
}: {
	label: string;
	htmlFor?: string;
	error?: string;
	required?: boolean;
	full?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
			<label
				htmlFor={htmlFor}
				className="font-medium text-muted-foreground text-xs uppercase tracking-wide"
			>
				{label}
				{required && <span className="ml-0.5 text-destructive">*</span>}
			</label>
			{children}
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
}

function MedicalConditionsPicker({
	value,
	onChange,
}: {
	value: MedicalCondition[];
	onChange: (v: MedicalCondition[]) => void;
}) {
	const selected = new Set(value);
	const toggle = (c: MedicalCondition) => {
		const next = new Set(selected);
		if (next.has(c)) next.delete(c);
		else next.add(c);
		onChange(MEDICAL_CONDITIONS.filter((x) => next.has(x)));
	};
	return (
		<div className="flex flex-wrap gap-1.5 rounded-md border bg-background p-2">
			{MEDICAL_CONDITIONS.map((c) => {
				const on = selected.has(c);
				return (
					<button
						key={c}
						type="button"
						onClick={() => toggle(c)}
						aria-pressed={on}
						className={cn(
							"rounded-full border px-2.5 py-1 font-medium text-[11px] transition",
							on
								? "border-amber-300 bg-amber-100 text-amber-900"
								: "border-border bg-background text-muted-foreground hover:bg-muted",
						)}
					>
						{c}
					</button>
				);
			})}
		</div>
	);
}

function GenderPicker({
	value,
	onChange,
}: {
	value: Gender | null | undefined;
	onChange: (g: Gender | null) => void;
}) {
	return (
		<div className="flex h-9 items-center gap-2 rounded-md border bg-background px-2">
			<button
				type="button"
				aria-label="Male"
				aria-pressed={value === "male"}
				onClick={() => onChange(value === "male" ? null : "male")}
				className={cn(
					"flex h-7 flex-1 items-center justify-center gap-1.5 rounded text-xs font-medium transition",
					value === "male"
						? "bg-sky-100 text-sky-700 ring-1 ring-sky-300"
						: "text-muted-foreground hover:bg-muted",
				)}
			>
				<Mars className="size-4" />
				Male
			</button>
			<button
				type="button"
				aria-label="Female"
				aria-pressed={value === "female"}
				onClick={() => onChange(value === "female" ? null : "female")}
				className={cn(
					"flex h-7 flex-1 items-center justify-center gap-1.5 rounded text-xs font-medium transition",
					value === "female"
						? "bg-pink-100 text-pink-700 ring-1 ring-pink-300"
						: "text-muted-foreground hover:bg-muted",
				)}
			>
				<Venus className="size-4" />
				Female
			</button>
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
	onCreated,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);
	const [section, setSection] = useState<SectionKey>("personal");
	const [pendingId, setPendingId] = useState<string | null>(null);
	const savedRef = useRef(false);

	const form = useForm<CustomerInput>({
		resolver: zodResolver(customerInputSchema),
		defaultValues: EMPTY,
	});

	const idType = form.watch("id_type");
	const idNumber = form.watch("id_number");
	const gender = form.watch("gender");
	const isVip = form.watch("is_vip");
	const firstName = form.watch("first_name");
	const lastName = form.watch("last_name");

	useEffect(() => {
		if (open) {
			const base = fromCustomer(customer);
			if (!customer) {
				if (defaultConsultantId) base.consultant_id = defaultConsultantId;
				if (outlets.length === 1) base.home_outlet_id = outlets[0].id;
				const id = crypto.randomUUID();
				base.id = id;
				setPendingId(id);
			} else {
				setPendingId(null);
			}
			savedRef.current = false;
			form.reset(base);
			setServerError(null);
			setSection("personal");
		}
	}, [open, customer, form, defaultConsultantId, outlets]);

	// Auto-derive DOB + gender from Malaysian IC.
	// Re-runs whenever the IC value changes so edits always re-sync the
	// derived fields. After this effect fires, the user can still manually
	// override DOB/gender — and those edits stick until they touch the IC
	// again.
	useEffect(() => {
		if (idType !== "ic" || !idNumber) return;
		const parsed = parseMalaysianIc(idNumber);
		if (!parsed.ok) return;
		form.setValue("date_of_birth", parsed.dob, { shouldValidate: true });
		form.setValue("gender", parsed.gender, { shouldValidate: true });
	}, [idType, idNumber, form]);

	const icParse =
		idType === "ic" && idNumber ? parseMalaysianIc(idNumber) : null;
	const icWarning: string | null = (() => {
		if (!icParse || icParse.ok) return null;
		if (icParse.reason === "empty") return null;
		if (icParse.reason === "length") {
			return "Malaysian IC must be 12 digits";
		}
		return "IC date portion is invalid";
	})();

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				if (customer) {
					await updateCustomerAction(customer.id, values);
				} else {
					const created = await createCustomerAction({
						...values,
						id: pendingId ?? undefined,
					});
					onCreated?.(created);
				}
				savedRef.current = true;
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	});

	// If the user uploaded a photo on a new-customer form and then closed
	// without saving, the object is orphaned — clean it up.
	const handleClose = () => {
		if (!customer && !savedRef.current) {
			const path = form.getValues("profile_image_path");
			if (path) {
				deleteMediaObjectAction(path).catch(() => {
					// orphan — not fatal
				});
			}
		}
		onClose();
	};

	const errors = form.formState.errors;

	const consultantOptions = employees.filter(
		(e) => e.is_active || e.id === customer?.consultant_id,
	);
	const outletOptions = outlets.filter(
		(o) => o.is_active || o.id === customer?.home_outlet_id,
	);

	const displayName =
		[firstName, lastName].filter(Boolean).join(" ") || "New Customer";

	return (
		<Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
			<DialogContent className="flex h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
				<DialogHeader className="sr-only">
					<DialogTitle>
						{customer ? "Edit customer" : "New customer"}
					</DialogTitle>
					<DialogDescription>
						{customer
							? `Editing ${customer.code}.`
							: "The customer code is auto-generated on save."}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex min-h-0 flex-1">
						{/* Sidebar */}
						<aside className="flex w-60 shrink-0 flex-col border-r bg-muted/30">
							<div className="flex flex-col items-center gap-2 p-5 text-center">
								<ImageUpload
									value={form.watch("profile_image_path") ?? null}
									onChange={(path) =>
										form.setValue("profile_image_path", path, {
											shouldDirty: true,
										})
									}
									entity="customers"
									entityId={customer?.id ?? pendingId}
									sizeClass="size-20"
									layout="stacked"
								/>
								<p className="font-semibold text-sm leading-tight">
									{displayName}
								</p>
								{customer && (
									<p className="text-muted-foreground text-xs">
										{customer.code}
									</p>
								)}
								<label className="mt-1 flex items-center gap-2 text-xs">
									<input
										type="checkbox"
										className="size-3.5"
										{...form.register("is_vip")}
									/>
									<span className="flex items-center gap-1">
										<Star
											className={cn(
												"size-3.5",
												isVip
													? "fill-amber-400 text-amber-500"
													: "text-muted-foreground",
											)}
										/>
										This customer is a VIP
									</span>
								</label>
								<label className="flex items-center gap-2 text-xs">
									<input
										type="checkbox"
										className="size-3.5"
										{...form.register("is_staff")}
									/>
									<span>Staff / family (auto 10% discount)</span>
								</label>
							</div>
							<nav className="flex flex-col px-2 pb-4 text-sm">
								{SECTIONS.map((s) => (
									<button
										key={s.key}
										type="button"
										onClick={() => setSection(s.key)}
										className={cn(
											"rounded-md px-3 py-2 text-left transition",
											section === s.key
												? "bg-background font-medium text-foreground shadow-sm"
												: "text-muted-foreground hover:bg-background/60",
										)}
									>
										{s.label}
									</button>
								))}
							</nav>
						</aside>

						{/* Main pane */}
						<div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
							{section === "personal" && (
								<div className="flex flex-col gap-5 p-6">
									<div className="flex items-center gap-3">
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
										>
											<ScanLine className="size-4" />
											Add via IC Scanner
										</Button>
									</div>

									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<Field
											label="Country of Origin"
											htmlFor="cus-country"
											required
											full
										>
											<Input
												id="cus-country"
												{...form.register("country_of_origin")}
											/>
										</Field>

										<Field
											label="First Name"
											htmlFor="cus-first"
											required
											error={errors.first_name?.message}
										>
											<Input
												id="cus-first"
												placeholder="Eg. JANE"
												{...form.register("first_name")}
											/>
										</Field>
										<Field
											label="Last Name"
											htmlFor="cus-last"
											required
											error={errors.last_name?.message}
										>
											<Input
												id="cus-last"
												placeholder="Eg. DOE"
												{...form.register("last_name")}
											/>
										</Field>

										<div className="flex flex-col gap-1.5">
											<div className="flex items-center justify-between gap-2">
												<label
													htmlFor="cus-idno"
													className="font-medium text-muted-foreground text-xs uppercase tracking-wide"
												>
													{idType === "passport"
														? "Passport Number"
														: "Identification Number"}
													<span className="ml-0.5 text-destructive">*</span>
												</label>
												<div className="inline-flex h-6 items-center rounded-md border bg-background p-0.5 text-xs">
													<button
														type="button"
														onClick={() =>
															form.setValue("id_type", "ic", {
																shouldValidate: true,
															})
														}
														className={cn(
															"rounded px-2 py-0.5 font-medium transition",
															idType === "ic"
																? "bg-primary text-primary-foreground"
																: "text-muted-foreground hover:text-foreground",
														)}
													>
														IC
													</button>
													<button
														type="button"
														onClick={() =>
															form.setValue("id_type", "passport", {
																shouldValidate: true,
															})
														}
														className={cn(
															"rounded px-2 py-0.5 font-medium transition",
															idType === "passport"
																? "bg-primary text-primary-foreground"
																: "text-muted-foreground hover:text-foreground",
														)}
													>
														Passport
													</button>
												</div>
											</div>
											<Input
												id="cus-idno"
												placeholder={
													idType === "passport"
														? "A12345678"
														: "Eg. 900101101234"
												}
												{...form.register("id_number")}
											/>
											{errors.id_number?.message ? (
												<p className="text-destructive text-xs">
													{errors.id_number.message}
												</p>
											) : icWarning ? (
												<p className="text-amber-600 text-xs">{icWarning}</p>
											) : null}
										</div>
										{idType === "ic" && (
											<Field
												label="Passport Number"
												htmlFor="cus-passport"
												error={errors.passport_no?.message}
											>
												<Input
													id="cus-passport"
													placeholder="Optional — for foreign travel records"
													{...form.register("passport_no")}
												/>
											</Field>
										)}
										<Field
											label="Email Address"
											htmlFor="cus-email"
											error={errors.email?.message}
										>
											<Input
												id="cus-email"
												type="email"
												placeholder="Eg. JANEDOE@GMAIL.COM"
												{...form.register("email")}
											/>
										</Field>

										<Field
											label="Date of Birth"
											htmlFor="cus-dob"
											error={errors.date_of_birth?.message}
										>
											<Input
												id="cus-dob"
												type="date"
												{...form.register("date_of_birth")}
											/>
										</Field>
										<Field label="Gender">
											<GenderPicker
												value={gender}
												onChange={(g) =>
													form.setValue("gender", g, {
														shouldValidate: true,
													})
												}
											/>
										</Field>
										<Field
											label="Salutation"
											htmlFor="cus-salutation"
											required
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

										<Field
											label="Contact Number 1"
											htmlFor="cus-phone"
											required
											error={errors.phone?.message}
										>
											<Input
												id="cus-phone"
												placeholder="+60 12-345 6789"
												{...form.register("phone")}
											/>
										</Field>
										<Field label="Contact Number 2" htmlFor="cus-phone2">
											<Input
												id="cus-phone2"
												placeholder="+60 12-345 6789"
												{...form.register("phone2")}
											/>
										</Field>

										<Field
											label="Customer's Consultant"
											htmlFor="cus-consultant"
											required
											full
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

										<Field label="Source" htmlFor="cus-source" required>
											<select
												id="cus-source"
												className={SELECT_CLASS}
												{...form.register("source")}
											>
												<option value="">— Select —</option>
												{SOURCES.map((s) => (
													<option key={s} value={s}>
														{s.replace("_", " ").toUpperCase()}
													</option>
												))}
											</select>
										</Field>
										<Field
											label="External Code"
											htmlFor="cus-ext"
											error={errors.external_code?.message}
										>
											<Input
												id="cus-ext"
												maxLength={15}
												placeholder="MAX 15 CHARACTERS"
												{...form.register("external_code")}
											/>
										</Field>

										<Field
											label="Home Outlet"
											htmlFor="cus-outlet"
											required
											full
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
									</div>
								</div>
							)}

							{section === "address" && (
								<div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
									<Field label="Address Line 1" htmlFor="cus-addr1" full>
										<Input id="cus-addr1" {...form.register("address1")} />
									</Field>
									<Field label="Address Line 2" htmlFor="cus-addr2" full>
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
								</div>
							)}

							{section === "medical" && (
								<div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
									<Field label="Smoker" htmlFor="cus-smoker">
										<select
											id="cus-smoker"
											className={SELECT_CLASS}
											value={form.watch("smoker") ?? ""}
											onChange={(e) =>
												form.setValue(
													"smoker",
													(e.target.value || null) as CustomerInput["smoker"],
													{ shouldValidate: true },
												)
											}
										>
											<option value="">— Please choose —</option>
											{SMOKER_OPTIONS.map((s) => (
												<option key={s} value={s}>
													{SMOKER_LABELS[s]}
												</option>
											))}
										</select>
									</Field>

									<Field label="Customer Tag" htmlFor="cus-tag">
										<Input
											id="cus-tag"
											placeholder="Eg. UNABLE TO WALK"
											{...form.register("tag")}
										/>
									</Field>

									<Field
										label="Drug Allergies"
										htmlFor="cus-drug-allergies"
										full
									>
										<Input
											id="cus-drug-allergies"
											placeholder="Eg. PENICILLIN, ASPIRIN"
											{...form.register("drug_allergies")}
										/>
									</Field>

									<Field label="Current Illness / Medical Condition" full>
										<MedicalConditionsPicker
											value={form.watch("medical_conditions") ?? []}
											onChange={(v) =>
												form.setValue("medical_conditions", v, {
													shouldValidate: true,
												})
											}
										/>
									</Field>

									<Field
										label="Alert / Known Allergies"
										htmlFor="cus-medical-alert"
										full
										error={errors.medical_alert?.message}
									>
										<textarea
											id="cus-medical-alert"
											rows={4}
											placeholder="Shown as a yellow banner on the appointment detail view"
											className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
											{...form.register("medical_alert")}
										/>
									</Field>

												</div>
							)}

							{section === "notifications" && (
								<div className="flex flex-col gap-4 p-6 text-sm">
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
							)}

							{serverError && (
								<p className="px-6 pb-2 text-destructive text-sm">
									{serverError}
								</p>
							)}
						</div>
					</div>

					<DialogFooter className="border-t bg-muted/20 px-4 py-3">
						<Button type="button" variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={pending}>
							{pending
								? "Saving…"
								: customer
									? "Save changes"
									: "Create customer"}
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
			<CreateButton onClick={() => setOpen(true)}>New customer</CreateButton>
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
