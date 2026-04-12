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
	createEmployeeAction,
	updateEmployeeAction,
} from "@/lib/actions/employees";
import {
	type EmployeeFormInput,
	employeeFormSchema,
} from "@/lib/schemas/employees";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { Position } from "@/lib/services/positions";
import type { Role } from "@/lib/services/roles";

type Props = {
	open: boolean;
	employee: EmployeeWithRelations | null;
	roles: Role[];
	positions: Position[];
	onClose: () => void;
};

const SELECT_CLASS =
	"h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const EMPTY: EmployeeFormInput = {
	salutation: undefined,
	first_name: "",
	last_name: "",
	gender: null,
	date_of_birth: undefined,
	id_type: "ic",
	id_number: undefined,
	email: "",
	phone: undefined,
	phone2: undefined,
	role_id: null,
	position_id: null,
	start_date: undefined,
	appointment_sequencing: null,
	monthly_sales_target: 0,
	is_bookable: true,
	is_online_bookable: false,
	web_login_enabled: false,
	mfa_enabled: false,
	mobile_app_enabled: false,
	password: undefined,
	password_confirm: undefined,
	address1: undefined,
	address2: undefined,
	address3: undefined,
	postcode: undefined,
	city: undefined,
	state: undefined,
	country: undefined,
	language: undefined,
	is_active: true,
};

function fromEmployee(e: EmployeeWithRelations | null): EmployeeFormInput {
	if (!e) return EMPTY;
	return {
		salutation: e.salutation ?? undefined,
		first_name: e.first_name,
		last_name: e.last_name,
		gender: (e.gender as EmployeeFormInput["gender"]) ?? null,
		date_of_birth: e.date_of_birth ?? undefined,
		id_type: (e.id_type as EmployeeFormInput["id_type"]) ?? "ic",
		id_number: e.id_number ?? undefined,
		email: e.email ?? "",
		phone: e.phone ?? undefined,
		phone2: e.phone2 ?? undefined,
		role_id: e.role_id ?? null,
		position_id: e.position_id ?? null,
		start_date: e.start_date ?? undefined,
		appointment_sequencing: e.appointment_sequencing ?? null,
		monthly_sales_target: Number(e.monthly_sales_target ?? 0),
		is_bookable: e.is_bookable,
		is_online_bookable: e.is_online_bookable,
		web_login_enabled: e.web_login_enabled,
		mfa_enabled: e.mfa_enabled,
		mobile_app_enabled: e.mobile_app_enabled,
		password: undefined,
		password_confirm: undefined,
		address1: e.address1 ?? undefined,
		address2: e.address2 ?? undefined,
		address3: e.address3 ?? undefined,
		postcode: e.postcode ?? undefined,
		city: e.city ?? undefined,
		state: e.state ?? undefined,
		country: e.country ?? undefined,
		language: e.language ?? undefined,
		is_active: e.is_active,
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

export function EmployeeFormDialog({
	open,
	employee,
	roles,
	positions,
	onClose,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<EmployeeFormInput>({
		resolver: zodResolver(employeeFormSchema),
		defaultValues: EMPTY,
	});

	const webLoginEnabled = form.watch("web_login_enabled");

	useEffect(() => {
		if (open) {
			form.reset(fromEmployee(employee));
			setServerError(null);
		}
	}, [open, employee, form]);

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				const { password, password_confirm: _pc, ...rest } = values;
				if (employee) {
					await updateEmployeeAction(employee.id, rest, password);
				} else {
					await createEmployeeAction(rest, password);
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

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>{employee ? "Edit employee" : "New employee"}</DialogTitle>
					<DialogDescription>
						{employee
							? `Editing ${employee.code}.`
							: "The employee code is auto-generated (EMP-0001) on save."}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={onSubmit}
					className="flex min-h-0 flex-1 flex-col"
				>
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
					<Section title="Identity">
						<Field label="Salutation" htmlFor="emp-salutation">
							<Input
								id="emp-salutation"
								placeholder="Mr / Ms / Dr"
								{...form.register("salutation")}
							/>
						</Field>
						<Field label="Gender" htmlFor="emp-gender">
							<select
								id="emp-gender"
								className={SELECT_CLASS}
								{...form.register("gender")}
							>
								<option value="">— Select —</option>
								<option value="male">Male</option>
								<option value="female">Female</option>
								<option value="other">Other</option>
							</select>
						</Field>
						<Field
							label="First name"
							htmlFor="emp-first"
							error={errors.first_name?.message}
						>
							<Input id="emp-first" {...form.register("first_name")} />
						</Field>
						<Field
							label="Last name"
							htmlFor="emp-last"
							error={errors.last_name?.message}
						>
							<Input id="emp-last" {...form.register("last_name")} />
						</Field>
						<Field
							label="Date of birth"
							htmlFor="emp-dob"
							error={errors.date_of_birth?.message}
						>
							<Input
								id="emp-dob"
								type="date"
								{...form.register("date_of_birth")}
							/>
						</Field>
						<Field label="ID type" htmlFor="emp-idtype">
							<select
								id="emp-idtype"
								className={SELECT_CLASS}
								{...form.register("id_type")}
							>
								<option value="ic">Identification Card</option>
								<option value="passport">Passport</option>
							</select>
						</Field>
						<Field
							label="ID number"
							htmlFor="emp-idno"
							full
							error={errors.id_number?.message}
						>
							<Input id="emp-idno" {...form.register("id_number")} />
						</Field>
					</Section>

					<Section title="Contact">
						<Field
							label="Email"
							htmlFor="emp-email"
							full
							error={errors.email?.message}
						>
							<Input id="emp-email" type="email" {...form.register("email")} />
						</Field>
						<Field label="Contact number 1" htmlFor="emp-phone">
							<Input
								id="emp-phone"
								placeholder="+60 12-345 6789"
								{...form.register("phone")}
							/>
						</Field>
						<Field label="Contact number 2" htmlFor="emp-phone2">
							<Input
								id="emp-phone2"
								placeholder="+60 12-345 6789"
								{...form.register("phone2")}
							/>
						</Field>
					</Section>

					<Section title="Employment">
						<Field label="Role" htmlFor="emp-role">
							<select
								id="emp-role"
								className={SELECT_CLASS}
								{...form.register("role_id")}
							>
								<option value="">— None —</option>
								{roles
									.filter((r) => r.is_active || r.id === employee?.role_id)
									.map((r) => (
										<option key={r.id} value={r.id}>
											{r.name}
										</option>
									))}
							</select>
						</Field>
						<Field label="Position" htmlFor="emp-position">
							<select
								id="emp-position"
								className={SELECT_CLASS}
								{...form.register("position_id")}
							>
								<option value="">— None —</option>
								{positions
									.filter((p) => p.is_active || p.id === employee?.position_id)
									.map((p) => (
										<option key={p.id} value={p.id}>
											{p.name}
										</option>
									))}
							</select>
						</Field>
						<Field
							label="Start date"
							htmlFor="emp-start"
							error={errors.start_date?.message}
						>
							<Input
								id="emp-start"
								type="date"
								{...form.register("start_date")}
							/>
						</Field>
						<Field
							label="Appointment sequencing (1–999)"
							htmlFor="emp-seq"
							error={errors.appointment_sequencing?.message}
						>
							<Input
								id="emp-seq"
								type="number"
								min={1}
								max={999}
								{...form.register("appointment_sequencing", {
									setValueAs: (v) =>
										v === "" || v === null || v === undefined
											? null
											: Number(v),
								})}
							/>
						</Field>
						<Field
							label="Monthly sales target (MYR)"
							htmlFor="emp-target"
							error={errors.monthly_sales_target?.message}
						>
							<Input
								id="emp-target"
								type="number"
								min={0}
								step="0.01"
								{...form.register("monthly_sales_target", {
									valueAsNumber: true,
								})}
							/>
						</Field>
						<Field label="Flags">
							<div className="flex flex-col gap-1.5 text-sm">
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										className="size-4"
										{...form.register("is_bookable")}
									/>
									Bookable in appointments
								</label>
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										className="size-4"
										{...form.register("is_online_bookable")}
									/>
									Online bookable
								</label>
							</div>
						</Field>
					</Section>

					<Section title="Credentials">
						<Field label="Access" full>
							<div className="flex flex-col gap-1.5 text-sm">
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										className="size-4"
										{...form.register("web_login_enabled")}
									/>
									Web login enabled
								</label>
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										className="size-4"
										{...form.register("mfa_enabled")}
									/>
									MFA required
								</label>
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										className="size-4"
										{...form.register("mobile_app_enabled")}
									/>
									Mobile app access
								</label>
							</div>
						</Field>
						{webLoginEnabled && (
							<>
								<Field
									label={
										employee?.auth_user_id
											? "New password (leave blank to keep current)"
											: "Password"
									}
									htmlFor="emp-password"
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
									label="Confirm password"
									htmlFor="emp-password-confirm"
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
					</Section>

					<Section title="Address">
						<Field label="Address line 1" htmlFor="emp-addr1" full>
							<Input id="emp-addr1" {...form.register("address1")} />
						</Field>
						<Field label="Address line 2" htmlFor="emp-addr2" full>
							<Input id="emp-addr2" {...form.register("address2")} />
						</Field>
						<Field label="Address line 3" htmlFor="emp-addr3" full>
							<Input id="emp-addr3" {...form.register("address3")} />
						</Field>
						<Field label="Postcode" htmlFor="emp-postcode">
							<Input id="emp-postcode" {...form.register("postcode")} />
						</Field>
						<Field label="City" htmlFor="emp-city">
							<Input id="emp-city" {...form.register("city")} />
						</Field>
						<Field label="State" htmlFor="emp-state">
							<Input id="emp-state" {...form.register("state")} />
						</Field>
						<Field label="Country" htmlFor="emp-country">
							<Input id="emp-country" {...form.register("country")} />
						</Field>
						<Field label="Language" htmlFor="emp-language" full>
							<Input
								id="emp-language"
								placeholder="English"
								{...form.register("language")}
							/>
						</Field>
					</Section>

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

export function NewEmployeeButton({
	roles,
	positions,
}: {
	roles: Role[];
	positions: Position[];
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button onClick={() => setOpen(true)}>New employee</Button>
			<EmployeeFormDialog
				open={open}
				employee={null}
				roles={roles}
				positions={positions}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
