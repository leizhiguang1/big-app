import { z } from "zod";
import {
	APPOINTMENT_PAYMENT_MODES,
	APPOINTMENT_STATUSES,
	PAYMENT_STATUSES,
} from "@/lib/constants/appointment-status";

const isoDateTime = z
	.string()
	.trim()
	.min(1, "Required")
	.refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date/time");

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.or(z.literal("").transform(() => undefined));

export const LEAD_SOURCES = [
	"walk_in",
	"referral",
	"ads",
	"online_booking",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
	walk_in: "Walk In",
	referral: "Referral",
	ads: "Ads",
	online_booking: "Online Booking",
};

export const appointmentInputSchema = z
	.object({
		customer_id: z.string().uuid().nullable(),
		employee_id: z.string().uuid().nullable(),
		outlet_id: z.string().uuid("Outlet is required"),
		room_id: z.string().uuid().nullable(),
		start_at: isoDateTime,
		end_at: isoDateTime,
		status: z.enum(APPOINTMENT_STATUSES),
		payment_status: z.enum(PAYMENT_STATUSES),
		notes: optionalText(2000),
		tags: z.array(z.string().trim().min(1)).max(1),
		is_time_block: z.boolean(),
		block_title: optionalText(120),
		// Lead fields — used when customer_id is null and is_time_block is false.
		lead_name: optionalText(120),
		lead_phone: optionalText(40),
		lead_source: z.enum(LEAD_SOURCES).nullable().optional(),
		lead_attended_by_id: z.string().uuid().nullable().optional(),
	})
	.superRefine((data, ctx) => {
		if (Date.parse(data.end_at) <= Date.parse(data.start_at)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["end_at"],
				message: "End must be after start",
			});
		}
		if (data.is_time_block) {
			if (!data.block_title) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["block_title"],
					message: "Title is required for time blocks",
				});
			}
			return;
		}
		// Non-block: need either a linked customer or lead details.
		if (!data.customer_id) {
			if (!data.lead_name) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["customer_id"],
					message: "Pick a customer or enter a walk-in lead name",
				});
			}
			if (data.lead_name && !data.lead_phone) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["lead_phone"],
					message: "Contact number is required for walk-in leads",
				});
			}
			if (data.lead_name && !data.lead_source) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["lead_source"],
					message: "Source is required for walk-in leads",
				});
			}
		}
	});

export type AppointmentInput = z.infer<typeof appointmentInputSchema>;

export const appointmentRescheduleSchema = z
	.object({
		start_at: isoDateTime,
		end_at: isoDateTime,
		employee_id: z.string().uuid().nullable().optional(),
		room_id: z.string().uuid().nullable().optional(),
	})
	.superRefine((d, ctx) => {
		if (Date.parse(d.end_at) <= Date.parse(d.start_at)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["end_at"],
				message: "End must be after start",
			});
		}
	});
export type AppointmentRescheduleInput = z.infer<
	typeof appointmentRescheduleSchema
>;

export const appointmentStatusSchema = z.object({
	status: z.enum(APPOINTMENT_STATUSES),
});
export type AppointmentStatusInput = z.infer<typeof appointmentStatusSchema>;

// Payment + tag patches run through a dedicated schema so we don't have to
// round-trip the full appointmentInputSchema (which demands start/end/outlet).
export const appointmentPaymentSchema = z.object({
	payment_status: z.enum(PAYMENT_STATUSES),
	paid_via: z.enum(APPOINTMENT_PAYMENT_MODES).nullable(),
});
export type AppointmentPaymentInput = z.infer<typeof appointmentPaymentSchema>;

export const appointmentPaymentRemarkSchema = z.object({
	payment_remark: z
		.string()
		.trim()
		.max(500)
		.nullable()
		.transform((v) => (v && v.length > 0 ? v : null)),
});
export type AppointmentPaymentRemarkInput = z.infer<
	typeof appointmentPaymentRemarkSchema
>;

export const appointmentTagsSchema = z.object({
	tags: z.array(z.string().trim().min(1)).max(1),
});
export type AppointmentTagsInput = z.infer<typeof appointmentTagsSchema>;

export const appointmentFollowUpSchema = z.object({
	follow_up: z
		.string()
		.trim()
		.max(4000)
		.nullable()
		.transform((v) => (v && v.length > 0 ? v : null)),
});
export type AppointmentFollowUpInput = z.infer<
	typeof appointmentFollowUpSchema
>;

// Lead → customer conversion input. Small subset of customerInputSchema so the
// action can stay a one-click flow. The service fills in defaults for the rest.
export const convertLeadInputSchema = z.object({
	first_name: z.string().trim().min(1, "First name is required").max(80),
	last_name: optionalText(80),
	phone: z.string().trim().min(1, "Phone is required").max(40),
	home_outlet_id: z.string().uuid("Home outlet is required"),
	consultant_id: z.string().uuid("Consultant is required"),
});
export type ConvertLeadInput = z.infer<typeof convertLeadInputSchema>;

// ─── Billing entries ────────────────────────────────────────────────────────

export const BILLING_ITEM_TYPES = ["service", "product", "charge"] as const;
export type BillingItemType = (typeof BILLING_ITEM_TYPES)[number];

export const billingEntryInputSchema = z.object({
	appointment_id: z.string().uuid(),
	item_type: z.enum(BILLING_ITEM_TYPES),
	service_id: z.string().uuid("Service is required"),
	description: z.string().trim().min(1, "Description is required").max(200),
	quantity: z.coerce.number().positive("Quantity must be > 0"),
	unit_price: z.coerce.number().min(0, "Price cannot be negative"),
	notes: z
		.string()
		.trim()
		.max(500)
		.nullish()
		.transform((v) => (v && v.length > 0 ? v : null)),
});
export type BillingEntryInput = z.infer<typeof billingEntryInputSchema>;
