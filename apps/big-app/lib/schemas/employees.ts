import { z } from "zod";

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.or(z.literal("").transform(() => undefined));

const requiredDate = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const ID_TYPES = ["ic", "passport"] as const;
export const GENDERS = ["male", "female", "other"] as const;
// Fallback list when a brand has no salutation rows configured in
// brand_config_items. Same list shared with customers; the moment the
// brand adds their own first one, the fallback stops being used.
export const SALUTATIONS = ["Dr", "Mr", "Mrs", "Ms"] as const;
export type Salutation = string;
export type Gender = (typeof GENDERS)[number];

// Malaysian IC: 12 digits, optional dashes YYMMDD-PB-###G
const IC_REGEX = /^\d{6}-?\d{2}-?\d{4}$/;

const employeeInputBase = z.object({
	// Client-generated UUID, used on create so image uploads can be
	// scoped to the row's storage path before the row exists.
	id: z.string().uuid().optional(),

	// Identity
	salutation: z.string().trim().min(1, "Salutation is required").max(40),
	first_name: z.string().trim().min(1, "First name is required").max(80),
	last_name: z.string().trim().min(1, "Last name is required").max(80),
	gender: z.enum(GENDERS, {
		errorMap: () => ({ message: "Gender is required" }),
	}),
	date_of_birth: requiredDate,
	profile_image_path: z.string().trim().max(500).nullable().optional(),
	id_type: z.enum(ID_TYPES),
	id_number: z.string().trim().min(1, "ID number is required").max(60),

	// Contact — email is required (used as login identity)
	email: z.string().trim().email("Invalid email").min(1, "Email is required"),
	phone: z.string().trim().min(1, "Contact number 1 is required").max(40),
	phone2: optionalText(40),

	// Employment
	role_id: z.string().uuid("Role is required"),
	position_id: z.string().uuid("Position is required"),
	start_date: z
		.string()
		.trim()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
		.optional()
		.or(z.literal("").transform(() => undefined)),
	appointment_sequencing: z
		.number()
		.int()
		.min(1)
		.max(999)
		.optional()
		.nullable(),
	monthly_sales_target: z.number().min(0),

	// Outlets
	outlet_ids: z.array(z.string().uuid()).min(1, "At least one outlet must be selected").default([]),
	primary_outlet_id: z
		.string()
		.uuid()
		.optional()
		.nullable()
		.or(z.literal("").transform(() => null)),
	is_bookable: z.boolean(),
	is_online_bookable: z.boolean(),

	// Credentials
	web_login_enabled: z.boolean(),
	mfa_enabled: z.boolean(),
	mobile_app_enabled: z.boolean(),

	// Address
	address1: optionalText(120),
	address2: optionalText(120),
	address3: optionalText(120),
	postcode: optionalText(20),
	city: optionalText(80),
	state: optionalText(80),
	country: z.string().trim().min(1, "Country is required").max(80),
	language: optionalText(40),

	is_active: z.boolean(),
});

const validateIc = (
	data: { id_type: (typeof ID_TYPES)[number]; id_number?: string | null },
	ctx: z.RefinementCtx,
) => {
	if (
		data.id_type === "ic" &&
		data.id_number &&
		!IC_REGEX.test(data.id_number)
	) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["id_number"],
			message: "Malaysian IC must be 12 digits (YYMMDD-PB-###G)",
		});
	}
};

export const employeeInputSchema = employeeInputBase.superRefine(validateIc);

export type EmployeeInput = z.infer<typeof employeeInputSchema>;

const passwordField = z
	.string()
	.min(8, "At least 8 characters")
	.max(128)
	.optional()
	.or(z.literal("").transform(() => undefined));

export const pinField = z
	.string()
	.regex(/^\d{6}$/, "PIN must be exactly 6 digits")
	.optional()
	.or(z.literal("").transform(() => undefined));

export const employeeFormSchema = employeeInputBase
	.extend({
		password: passwordField,
		password_confirm: passwordField,
		has_existing_auth: z.boolean().optional(),
		pin: pinField,
	})
	.superRefine((data, ctx) => {
		validateIc(data, ctx);
		// New employee: password and PIN are required
		if (!data.has_existing_auth) {
			if (data.web_login_enabled && !data.password) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["password"],
					message: "Password is required",
				});
			}
			if (!data.pin) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["pin"],
					message: "PIN is required",
				});
			}
		}
		if (data.web_login_enabled && data.password && data.password !== data.password_confirm) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["password_confirm"],
				message: "Passwords do not match",
			});
		}
	});

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>;
