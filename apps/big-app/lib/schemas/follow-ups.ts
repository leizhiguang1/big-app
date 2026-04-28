import { z } from "zod";

export const FOLLOW_UP_REMINDER_METHODS = ["call", "whatsapp"] as const;
export type FollowUpReminderMethod =
	(typeof FOLLOW_UP_REMINDER_METHODS)[number];

const reminderOff = z.object({
	has_reminder: z.literal(false),
	reminder_date: z.null().optional(),
	reminder_method: z.null().optional(),
	reminder_employee_id: z.null().optional(),
});

const reminderOn = z.object({
	has_reminder: z.literal(true),
	reminder_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
	reminder_method: z.enum(FOLLOW_UP_REMINDER_METHODS),
	reminder_employee_id: z.string().uuid().nullable(),
});

const baseFields = z.object({
	appointment_id: z.string().uuid().nullable(),
	customer_id: z.string().uuid().nullable(),
	author_id: z.string().uuid().nullable(),
	content: z.string().trim().min(1, "Follow-up content is required").max(8000),
});

export const followUpInputSchema = z.intersection(
	baseFields,
	z.discriminatedUnion("has_reminder", [reminderOff, reminderOn]),
);
export type FollowUpInput = z.infer<typeof followUpInputSchema>;

export const followUpUpdateSchema = z.intersection(
	z.object({
		content: z
			.string()
			.trim()
			.min(1, "Follow-up content is required")
			.max(8000),
	}),
	z.discriminatedUnion("has_reminder", [reminderOff, reminderOn]),
);
export type FollowUpUpdateInput = z.infer<typeof followUpUpdateSchema>;

export const followUpReminderDoneSchema = z.object({
	reminder_done: z.boolean(),
});
export type FollowUpReminderDoneInput = z.infer<
	typeof followUpReminderDoneSchema
>;
