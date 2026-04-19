import { z } from "zod";
import { MEDICAL_CONDITIONS, SMOKER_OPTIONS } from "@/lib/constants/medical";

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
export const GENDERS = ["male", "female"] as const;
export const SALUTATIONS = ["Mr", "Ms", "Mrs", "Dr"] as const;
export const SOURCES = [
	"walk_in",
	"friend_or_family",
	"employee",
	"facebook",
	"instagram",
	"tiktok",
	"kol",
	"webstore",
	"whatsapp",
] as const;

export const SOURCE_LABEL: Record<(typeof SOURCES)[number], string> = {
	walk_in: "Walk In",
	friend_or_family: "Friend or Family",
	employee: "Employee",
	facebook: "Facebook",
	instagram: "Instagram",
	tiktok: "TikTok",
	kol: "KOL",
	webstore: "Webstore",
	whatsapp: "WhatsApp",
};

export type IdType = (typeof ID_TYPES)[number];
export type Gender = (typeof GENDERS)[number];
export type Salutation = (typeof SALUTATIONS)[number];
export type Source = (typeof SOURCES)[number];

// Malaysian IC: 12 digits, optional dashes YYMMDD-PB-###G
const IC_REGEX = /^\d{6}-?\d{2}-?\d{4}$/;

export const customerInputSchema = z
	.object({
		// Client-generated UUID, used on create so image uploads can be
		// scoped to the row's storage path before the row exists.
		id: z.string().uuid().optional(),

		// Identity
		salutation: z.enum(SALUTATIONS, {
			errorMap: () => ({ message: "Salutation is required" }),
		}),
		first_name: z.string().trim().min(1, "First name is required").max(80),
		last_name: optionalText(80),
		gender: z.enum(GENDERS).nullable().optional(),
		date_of_birth: optionalDate,
		profile_image_path: z.string().trim().max(500).nullable().optional(),

		// Identification
		id_type: z.enum(ID_TYPES),
		id_number: optionalText(60),
		passport_no: optionalText(60),

		// Contact
		phone: z.string().trim().min(1, "Phone is required").max(40),
		phone2: optionalText(40),
		email: z
			.string()
			.trim()
			.email("Invalid email")
			.optional()
			.or(z.literal("").transform(() => undefined)),
		country_of_origin: optionalText(80),

		// Address
		address1: optionalText(160),
		address2: optionalText(160),
		city: optionalText(80),
		state: optionalText(80),
		postcode: optionalText(20),

		// Clinic
		home_outlet_id: z.string().uuid("Home outlet is required"),
		consultant_id: z.string().uuid("Consultant is required"),
		source: z.enum(SOURCES).nullable().optional(),
		external_code: optionalText(15),

		// Flags
		is_vip: z.boolean(),
		is_staff: z.boolean(),
		tag: optionalText(80),

		// Medical
		smoker: z.enum(SMOKER_OPTIONS).nullable().optional(),
		drug_allergies: optionalText(2000),
		medical_conditions: z.array(z.enum(MEDICAL_CONDITIONS)).optional(),
		medical_alert: optionalText(2000),

		// Notifications
		opt_in_notifications: z.boolean(),
		opt_in_marketing: z.boolean(),

		// Lifecycle
		join_date: optionalDate,
	})
	.superRefine((data, ctx) => {
		if (data.id_type === "ic" && data.id_number) {
			if (!IC_REGEX.test(data.id_number)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["id_number"],
					message: "Malaysian IC must be 12 digits (YYMMDD-PB-###G)",
				});
			}
		}
	});

export type CustomerInput = z.infer<typeof customerInputSchema>;
