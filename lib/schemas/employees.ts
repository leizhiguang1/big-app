import { z } from "zod";

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.or(z.literal("").transform(() => undefined));

const optionalDate = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
	.optional()
	.or(z.literal("").transform(() => undefined));

export const ID_TYPES = ["ic", "passport"] as const;
export const GENDERS = ["male", "female", "other"] as const;

// Malaysian IC: 12 digits, optional dashes YYMMDD-PB-###G
const IC_REGEX = /^\d{6}-?\d{2}-?\d{4}$/;

const employeeInputBase = z.object({
	// Identity
	salutation: optionalText(20),
	first_name: z.string().trim().min(1, "First name is required").max(80),
	last_name: z.string().trim().min(1, "Last name is required").max(80),
	gender: z.enum(GENDERS).nullable().optional(),
	date_of_birth: optionalDate,
	id_type: z.enum(ID_TYPES),
	id_number: optionalText(60),

	// Contact — email is required (used as login identity)
	email: z.string().trim().email("Invalid email").min(1, "Email is required"),
	phone: optionalText(40),
	phone2: optionalText(40),

	// Employment
	role_id: z.string().uuid().nullable().optional(),
	position_id: z.string().uuid().nullable().optional(),
	start_date: optionalDate,
	appointment_sequencing: z
		.number({ invalid_type_error: "Must be a number" })
		.int()
		.min(1)
		.max(999)
		.nullable()
		.optional(),
	monthly_sales_target: z.number().min(0),
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
	country: optionalText(80),
	language: optionalText(40),

	is_active: z.boolean(),
});

const validateIc = (
	data: { id_type: (typeof ID_TYPES)[number]; id_number?: string },
	ctx: z.RefinementCtx,
) => {
	if (data.id_type === "ic" && data.id_number && !IC_REGEX.test(data.id_number)) {
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

export const employeeFormSchema = employeeInputBase
	.extend({
		password: passwordField,
		password_confirm: passwordField,
	})
	.superRefine((data, ctx) => {
		validateIc(data, ctx);
		if (data.web_login_enabled) {
			if (!data.password) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["password"],
					message: "Password is required when web login is enabled",
				});
			}
			if (data.password && data.password !== data.password_confirm) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["password_confirm"],
					message: "Passwords do not match",
				});
			}
		}
	});

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>;
