import { z } from "zod";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const time = z.string().regex(TIME_REGEX, "Use HH:MM");
const date = z.string().regex(DATE_REGEX, "Use YYYY-MM-DD");

export const REPEAT_TYPES = ["none", "weekly"] as const;
export type RepeatType = (typeof REPEAT_TYPES)[number];

export const shiftBreakSchema = z.object({
	name: z.string().trim().min(1, "Name required").max(40),
	start: time,
	end: time,
});

export type ShiftBreak = z.infer<typeof shiftBreakSchema>;

export const employeeShiftInputSchema = z
	.object({
		employee_id: z.string().uuid(),
		outlet_id: z.string().uuid(),
		shift_date: date,
		start_time: time,
		end_time: time,
		is_overnight: z.boolean(),
		repeat_type: z.enum(REPEAT_TYPES),
		repeat_end: date.nullable().optional(),
		breaks: z.array(shiftBreakSchema).max(10),
		remarks: z
			.string()
			.trim()
			.max(500)
			.optional()
			.or(z.literal("").transform(() => undefined)),
	})
	.superRefine((data, ctx) => {
		if (!data.is_overnight && data.end_time <= data.start_time) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["end_time"],
				message: "End time must be after start time",
			});
		}
		if (
			data.repeat_type === "weekly" &&
			data.repeat_end &&
			data.repeat_end < data.shift_date
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["repeat_end"],
				message: "End repeat must be on or after the shift date",
			});
		}
	});

export type EmployeeShiftInput = z.infer<typeof employeeShiftInputSchema>;
