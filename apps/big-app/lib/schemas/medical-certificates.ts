import { z } from "zod";

const baseFields = {
	appointment_id: z.string().uuid().nullable(),
	customer_id: z.string().uuid(),
	outlet_id: z.string().uuid(),
	issuing_employee_id: z.string().uuid().nullable(),
	start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
	reason: z
		.string()
		.trim()
		.max(500)
		.optional()
		.transform((v) => (v ? v : null)),
};

const dayOffSchema = z.object({
	...baseFields,
	slip_type: z.literal("day_off"),
	duration_days: z
		.number()
		.positive("Duration must be greater than zero")
		.refine((v) => Math.round(v * 2) === v * 2, {
			message: "Duration must be in 0.5-day steps",
		}),
	has_half_day: z.boolean(),
});

const timeOffSchema = z.object({
	...baseFields,
	slip_type: z.literal("time_off"),
	start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time"),
	end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time"),
	duration_hours: z.number().positive("Duration must be greater than zero"),
});

export const medicalCertificateCreateSchema = z.discriminatedUnion(
	"slip_type",
	[dayOffSchema, timeOffSchema],
);

export type MedicalCertificateCreateInput = z.infer<
	typeof medicalCertificateCreateSchema
>;

const updateBaseFields = {
	issuing_employee_id: z.string().uuid().nullable(),
	start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
	reason: z
		.string()
		.trim()
		.max(500)
		.optional()
		.transform((v) => (v ? v : null)),
};

const dayOffUpdateSchema = z.object({
	...updateBaseFields,
	slip_type: z.literal("day_off"),
	duration_days: z
		.number()
		.positive("Duration must be greater than zero")
		.refine((v) => Math.round(v * 2) === v * 2, {
			message: "Duration must be in 0.5-day steps",
		}),
	has_half_day: z.boolean(),
});

const timeOffUpdateSchema = z.object({
	...updateBaseFields,
	slip_type: z.literal("time_off"),
	start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time"),
	end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time"),
	duration_hours: z.number().positive("Duration must be greater than zero"),
});

export const medicalCertificateUpdateSchema = z.discriminatedUnion(
	"slip_type",
	[dayOffUpdateSchema, timeOffUpdateSchema],
);

export type MedicalCertificateUpdateInput = z.infer<
	typeof medicalCertificateUpdateSchema
>;
