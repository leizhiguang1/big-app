"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mars, Venus } from "lucide-react";
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
	createEmployeeAction,
	updateEmployeeAction,
} from "@/lib/actions/employees";
import { deleteMediaObjectAction } from "@/lib/actions/storage";
import {
	type EmployeeFormInput,
	employeeFormSchema,
	type Gender,
	SALUTATIONS,
} from "@/lib/schemas/employees";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import type { Position } from "@/lib/services/positions";
import type { Role } from "@/lib/services/roles";
import { cn } from "@/lib/utils";

type Props = {
	open: boolean;
	employee: EmployeeWithRelations | null;
	roles: Role[];
	positions: Position[];
	outlets: OutletWithRoomCount[];
	onClose: () => void;
};

const SELECT_CLASS =
	"h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const EMPTY: EmployeeFormInput = {
	salutation: "Mr",
	first_name: "",
	last_name: "",
	gender: "male",
	date_of_birth: "",
	profile_image_path: null,
	id_type: "ic",
	id_number: "",
	email: "",
	phone: "",
	phone2: "",
	role_id: "",
	position_id: "",
	start_date: "",
	appointment_sequencing: undefined as unknown as number,
	monthly_sales_target: 0,
	is_bookable: true,
	is_online_bookable: true,
	web_login_enabled: true,
	mfa_enabled: false,
	mobile_app_enabled: true,
	password: undefined,
	password_confirm: undefined,
	has_existing_auth: false,
	pin: undefined,
	address1: undefined,
	address2: undefined,
	address3: undefined,
	postcode: undefined,
	city: undefined,
	state: undefined,
	country: "Malaysia",
	language: undefined,
	is_active: true,
	outlet_ids: [],
	primary_outlet_id: null,
};

function fromEmployee(e: EmployeeWithRelations | null): EmployeeFormInput {
	if (!e) return EMPTY;
	const links = e.outlets ?? [];
	const outlet_ids = links.map((l) => l.outlet_id);
	const primary_outlet_id =
		links.find((l) => l.is_primary)?.outlet_id ?? outlet_ids[0] ?? null;
	return {
		salutation: (e.salutation as EmployeeFormInput["salutation"]) ?? "Mr",
		first_name: e.first_name,
		last_name: e.last_name,
		gender: (e.gender as Gender) ?? "male",
		date_of_birth: e.date_of_birth ?? "",
		profile_image_path: e.profile_image_path ?? null,
		id_type: (e.id_type as EmployeeFormInput["id_type"]) ?? "ic",
		id_number: e.id_number ?? "",
		email: e.email ?? "",
		phone: e.phone ?? "",
		phone2: e.phone2 ?? "",
		role_id: e.role_id ?? "",
		position_id: e.position_id ?? "",
		start_date: e.start_date ?? "",
		appointment_sequencing:
			e.appointment_sequencing ?? (undefined as unknown as number),
		monthly_sales_target: Number(e.monthly_sales_target ?? 0),
		is_bookable: e.is_bookable,
		is_online_bookable: e.is_online_bookable,
		web_login_enabled: e.web_login_enabled,
		mfa_enabled: e.mfa_enabled,
		mobile_app_enabled: e.mobile_app_enabled,
		password: undefined,
		password_confirm: undefined,
		has_existing_auth: Boolean(e.auth_user_id),
		pin: undefined,
		address1: e.address1 ?? undefined,
		address2: e.address2 ?? undefined,
		address3: e.address3 ?? undefined,
		postcode: e.postcode ?? undefined,
		city: e.city ?? undefined,
		state: e.state ?? undefined,
		country: e.country ?? "Malaysia",
		language: e.language ?? undefined,
		is_active: e.is_active,
		outlet_ids,
		primary_outlet_id,
	};
}

type IcParseResult =
	| { ok: true; dob: string; gender: Gender }
	| { ok: false; reason: "empty" | "length" | "date" };

function parseMalaysianIc(raw: string): IcParseResult {
	const digits = raw.replace(/\D/g, "");
	if (digits.length === 0) return { ok: false, reason: "empty" };
	if (digits.length !== 12) return { ok: false, reason: "length" };
	const yy = Number.parseInt(digits.slice(0, 2), 10);
	const mm = Number.parseInt(digits.slice(2, 4), 10);
	const dd = Number.parseInt(digits.slice(4, 6), 10);
	if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
		return { ok: false, reason: "date" };
	}
	const currentYY = new Date().getFullYear() % 100;
	const fullYear = yy <= currentYY ? 2000 + yy : 1900 + yy;
	const date = new Date(Date.UTC(fullYear, mm - 1, dd));
	if (
		date.getUTCFullYear() !== fullYear ||
		date.getUTCMonth() !== mm - 1 ||
		date.getUTCDate() !== dd
	) {
		return { ok: false, reason: "date" };
	}
	const dob = `${fullYear.toString().padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
	const lastDigit = Number.parseInt(digits.slice(11, 12), 10);
	const gender: Gender = lastDigit % 2 === 0 ? "female" : "male";
	return { ok: true, dob, gender };
}

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

function GenderPicker({
	value,
	onChange,
}: {
	value: Gender | null | undefined;
	onChange: (g: Gender) => void;
}) {
	return (
		<div className="flex h-9 items-center gap-2 rounded-md border bg-background px-2">
			<button
				type="button"
				aria-label="Male"
				aria-pressed={value === "male"}
				onClick={() => onChange("male")}
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
				onClick={() => onChange("female")}
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

function SidebarToggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label className="flex items-center gap-2.5 text-sm">
			<input
				type="checkbox"
				className="size-4 accent-emerald-500"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<span
				className={cn(
					"transition",
					checked ? "text-foreground" : "text-muted-foreground",
				)}
			>
				{label}
			</span>
		</label>
	);
}

export function EmployeeFormDialog({
	open,
	employee,
	roles,
	positions,
	outlets,
	onClose,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);
	const [pendingId, setPendingId] = useState<string | null>(null);
	const savedRef = useRef(false);

	const form = useForm<EmployeeFormInput>({
		// @ts-expect-error — @hookform/resolvers v5 Resolver type conflicts with RHF v7's on complex schemas (extend + superRefine)
		resolver: zodResolver(employeeFormSchema),
		defaultValues: EMPTY,
	});

	const idType = form.watch("id_type");
	const idNumber = form.watch("id_number");
	const gender = form.watch("gender");
	const firstName = form.watch("first_name");
	const lastName = form.watch("last_name");
	const webLoginEnabled = form.watch("web_login_enabled");
	const isBookable = form.watch("is_bookable");
	const isOnlineBookable = form.watch("is_online_bookable");
	const mobileAppEnabled = form.watch("mobile_app_enabled");
	const selectedOutletIds = form.watch("outlet_ids") ?? [];
	const primaryOutletId = form.watch("primary_outlet_id") ?? null;

	useEffect(() => {
		if (open) {
			const base = fromEmployee(employee);
			if (!employee) {
				const id = crypto.randomUUID();
				base.id = id;
				setPendingId(id);
			} else {
				setPendingId(null);
			}
			savedRef.current = false;
			form.reset(base);
			setServerError(null);
		}
	}, [open, employee, form]);

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
				const {
					password,
					password_confirm: _pc,
					has_existing_auth: _hea,
					pin,
					...rest
				} = values;
				if (employee) {
					await updateEmployeeAction(employee.id, rest, password, pin);
				} else {
					await createEmployeeAction(
						{ ...rest, id: pendingId ?? undefined },
						password,
						pin,
					);
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

	const handleClose = () => {
		if (!employee && !savedRef.current) {
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

	const displayName =
		[firstName, lastName].filter(Boolean).join(" ") || "Add Employee";

	const roleOptions = roles.filter(
		(r) => r.is_active || r.id === employee?.role_id,
	);
	const positionOptions = positions.filter(
		(p) => p.is_active || p.id === employee?.position_id,
	);

	return (
		<Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
			<DialogContent className="flex h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
				<DialogHeader className="sr-only">
					<DialogTitle>
						{employee ? "Edit employee" : "New employee"}
					</DialogTitle>
					<DialogDescription>
						{employee
							? `Editing ${employee.code}.`
							: "The employee code is auto-generated on save."}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex min-h-0 flex-1">
						{/* Sidebar */}
						<aside className="flex w-64 shrink-0 flex-col border-r bg-muted/30">
							<div className="flex flex-col items-center gap-2 p-5 text-center">
								<ImageUpload
									value={form.watch("profile_image_path") ?? null}
									onChange={(path) =>
										form.setValue("profile_image_path", path, {
											shouldDirty: true,
										})
									}
									entity="employees"
									entityId={employee?.id ?? pendingId}
									sizeClass="size-20"
									layout="stacked"
								/>
								<p className="font-semibold text-sm leading-tight">
									{displayName}
								</p>
								<p className="text-muted-foreground text-xs">
									{employee ? employee.code : "Account Information"}
								</p>
							</div>
							<div className="flex flex-col gap-3 border-t px-5 py-4">
								<SidebarToggle
									label="Mobile app"
									checked={mobileAppEnabled}
									onChange={(v) =>
										form.setValue("mobile_app_enabled", v, {
											shouldDirty: true,
										})
									}
								/>
								<SidebarToggle
									label="Web Login"
									checked={webLoginEnabled}
									onChange={(v) =>
										form.setValue("web_login_enabled", v, {
											shouldDirty: true,
										})
									}
								/>
								<SidebarToggle
									label="Bookable"
									checked={isBookable}
									onChange={(v) =>
										form.setValue("is_bookable", v, { shouldDirty: true })
									}
								/>
								<SidebarToggle
									label="Online Bookable"
									checked={isOnlineBookable}
									onChange={(v) =>
										form.setValue("is_online_bookable", v, {
											shouldDirty: true,
										})
									}
								/>
							</div>
						</aside>

						{/* Main pane */}
						<div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
							<div className="flex flex-col gap-5 p-6">
								<h2 className="font-semibold text-base">Employee Details</h2>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<Field
										label="First Name"
										htmlFor="emp-first"
										required
										error={errors.first_name?.message}
									>
										<Input
											id="emp-first"
											placeholder="Eg. SOPHIE"
											{...form.register("first_name")}
										/>
									</Field>
									<Field
										label="Last Name"
										htmlFor="emp-last"
										required
										error={errors.last_name?.message}
									>
										<Input
											id="emp-last"
											placeholder="Eg. WONG"
											{...form.register("last_name")}
										/>
									</Field>

									<div className="flex flex-col gap-1.5">
										<div className="flex items-center justify-between gap-2">
											<label
												htmlFor="emp-idno"
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
											id="emp-idno"
											placeholder={
												idType === "passport" ? "A12345678" : "Eg. 900101101234"
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

									<Field
										label="Email Address"
										htmlFor="emp-email"
										required
										error={errors.email?.message}
									>
										<Input
											id="emp-email"
											type="email"
											placeholder="EG. SOPHIE.WONG@KORUNO.COM"
											{...form.register("email")}
										/>
									</Field>

									<Field
										label="Date of Birth"
										htmlFor="emp-dob"
										required
										error={errors.date_of_birth?.message}
									>
										<Input
											id="emp-dob"
											type="date"
											{...form.register("date_of_birth")}
										/>
									</Field>
									<Field label="Gender" required error={errors.gender?.message}>
										<GenderPicker
											value={gender}
											onChange={(g) =>
												form.setValue("gender", g, { shouldValidate: true })
											}
										/>
									</Field>

									<Field
										label="Salutation"
										htmlFor="emp-salutation"
										required
										error={errors.salutation?.message}
									>
										<select
											id="emp-salutation"
											className={SELECT_CLASS}
											{...form.register("salutation")}
										>
											{SALUTATIONS.map((s) => (
												<option key={s} value={s}>
													{s.toUpperCase()}
												</option>
											))}
										</select>
									</Field>

									<Field
										label="Contact Number 1"
										htmlFor="emp-phone"
										required
										error={errors.phone?.message}
									>
										<Input
											id="emp-phone"
											placeholder="+60 12-345 6789"
											{...form.register("phone")}
										/>
									</Field>
									<Field
										label="Contact Number 2"
										htmlFor="emp-phone2"
										error={errors.phone2?.message}
									>
										<Input
											id="emp-phone2"
											placeholder="+60 12-345 6789"
											{...form.register("phone2")}
										/>
									</Field>

									<Field
										label="Appointment Sequencing"
										htmlFor="emp-seq"
										full
										error={errors.appointment_sequencing?.message}
									>
										<Input
											id="emp-seq"
											type="number"
											min={1}
											max={999}
											placeholder="EG. 1 - 999"
											{...form.register("appointment_sequencing", {
												setValueAs: (v) =>
													v === "" || v === null || v === undefined
														? undefined
														: Number(v),
											})}
										/>
									</Field>

									<Field
										label="Role"
										htmlFor="emp-role"
										required
										error={errors.role_id?.message}
									>
										<select
											id="emp-role"
											className={SELECT_CLASS}
											{...form.register("role_id")}
										>
											<option value="">Please Choose…</option>
											{roleOptions.map((r) => (
												<option key={r.id} value={r.id}>
													{r.name}
												</option>
											))}
										</select>
									</Field>
									<Field
										label="Position"
										htmlFor="emp-position"
										required
										error={errors.position_id?.message}
									>
										<select
											id="emp-position"
											className={SELECT_CLASS}
											{...form.register("position_id")}
										>
											<option value="">Please Choose…</option>
											{positionOptions.map((p) => (
												<option key={p.id} value={p.id}>
													{p.name}
												</option>
											))}
										</select>
									</Field>

									<Field
										label="Start Date"
										htmlFor="emp-start"
										full
										error={errors.start_date?.message}
									>
										<Input
											id="emp-start"
											type="date"
											{...form.register("start_date")}
										/>
									</Field>

									{webLoginEnabled && (
										<>
											<Field
												label={
													employee?.auth_user_id
														? "New Password (optional)"
														: "Password"
												}
												htmlFor="emp-password"
												required={!employee?.auth_user_id}
												error={errors.password?.message}
											>
												<Input
													id="emp-password"
													type="password"
													autoComplete="new-password"
													{...form.register("password")}
												/>
											</Field>
											<Field
												label="Confirm Password"
												htmlFor="emp-password-confirm"
												required={!employee?.auth_user_id}
												error={errors.password_confirm?.message}
											>
												<Input
													id="emp-password-confirm"
													type="password"
													autoComplete="new-password"
													{...form.register("password_confirm")}
												/>
											</Field>
										</>
									)}

									<Field
										label={
											employee ? "Set / Reset PIN (6 digits)" : "PIN (6 digits)"
										}
										htmlFor="emp-pin"
										full
										error={errors.pin?.message}
									>
										<Input
											id="emp-pin"
											type="password"
											inputMode="numeric"
											autoComplete="off"
											maxLength={6}
											placeholder={
												employee ? "Leave blank to keep current" : "••••••"
											}
											{...form.register("pin")}
										/>
									</Field>
								</div>

								<div className="flex flex-col gap-3 border-t pt-5">
									<h3 className="font-semibold text-sm">Outlets</h3>
									<p className="text-muted-foreground text-xs">
										Pick the outlets this employee works at, then mark one as
										primary.
									</p>
									{outlets.length === 0 ? (
										<p className="text-muted-foreground text-xs">
											No outlets yet — create one in Config → Outlets first.
										</p>
									) : (
										<div className="flex flex-col gap-1.5">
											{outlets.map((o) => {
												const checked = selectedOutletIds.includes(o.id);
												const isPrimary = primaryOutletId === o.id;
												return (
													<div
														key={o.id}
														className={cn(
															"flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition",
															checked ? "bg-muted/40" : "bg-background",
														)}
													>
														<label className="flex min-w-0 flex-1 items-center gap-2.5 text-sm">
															<input
																type="checkbox"
																className="size-4 accent-emerald-500"
																checked={checked}
																onChange={(e) => {
																	const next = e.target.checked
																		? [...selectedOutletIds, o.id]
																		: selectedOutletIds.filter(
																				(id) => id !== o.id,
																			);
																	form.setValue("outlet_ids", next, {
																		shouldDirty: true,
																	});
																	if (
																		!e.target.checked &&
																		primaryOutletId === o.id
																	) {
																		form.setValue(
																			"primary_outlet_id",
																			next[0] ?? null,
																			{ shouldDirty: true },
																		);
																	} else if (
																		e.target.checked &&
																		!primaryOutletId
																	) {
																		form.setValue("primary_outlet_id", o.id, {
																			shouldDirty: true,
																		});
																	}
																}}
															/>
															<span className="truncate">{o.name}</span>
														</label>
														<button
															type="button"
															disabled={!checked}
															onClick={() =>
																form.setValue("primary_outlet_id", o.id, {
																	shouldDirty: true,
																})
															}
															className={cn(
																"rounded-full px-2.5 py-0.5 text-xs font-medium transition",
																isPrimary
																	? "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-300"
																	: "text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
															)}
														>
															{isPrimary ? "Primary" : "Set primary"}
														</button>
													</div>
												);
											})}
										</div>
									)}
								</div>

								<div className="flex flex-col gap-3 border-t pt-5">
									<h3 className="font-semibold text-sm">Address</h3>
									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<Field
											label="Country"
											htmlFor="emp-country"
											required
											full
											error={errors.country?.message}
										>
											<Input id="emp-country" {...form.register("country")} />
										</Field>
										<Field label="Address Line 1" htmlFor="emp-addr1" full>
											<Input id="emp-addr1" {...form.register("address1")} />
										</Field>
										<Field label="Address Line 2" htmlFor="emp-addr2" full>
											<Input id="emp-addr2" {...form.register("address2")} />
										</Field>
										<Field label="Address Line 3" htmlFor="emp-addr3" full>
											<Input id="emp-addr3" {...form.register("address3")} />
										</Field>
										<Field label="Postcode" htmlFor="emp-postcode">
											<Input id="emp-postcode" {...form.register("postcode")} />
										</Field>
										<Field label="City" htmlFor="emp-city">
											<Input id="emp-city" {...form.register("city")} />
										</Field>
										<Field label="State" htmlFor="emp-state" full>
											<Input id="emp-state" {...form.register("state")} />
										</Field>
									</div>
								</div>

								<div className="flex flex-col gap-3 border-t pt-5">
									<h3 className="font-semibold text-sm">Language</h3>
									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<Field label="Language" htmlFor="emp-language" full>
											<Input
												id="emp-language"
												placeholder="English"
												{...form.register("language")}
											/>
										</Field>
									</div>
								</div>

								{serverError && (
									<p className="text-destructive text-sm">{serverError}</p>
								)}
							</div>
						</div>
					</div>

					<DialogFooter className="border-t bg-muted/20 px-4 py-3">
						<Button type="button" variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={pending}>
							{pending
								? "Saving…"
								: employee
									? "Save changes"
									: "Create employee"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function NewEmployeeButton({
	roles,
	positions,
	outlets,
}: {
	roles: Role[];
	positions: Position[];
	outlets: OutletWithRoomCount[];
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<CreateButton onClick={() => setOpen(true)}>New employee</CreateButton>
			<EmployeeFormDialog
				open={open}
				employee={null}
				roles={roles}
				positions={positions}
				outlets={outlets}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
