import { z } from "zod";

export const medicalCertificateCreateSchema = z.object({
	appointment_id: z.string().uuid(),
	customer_id: z.string().uuid(),
	outlet_id: z.string().uuid(),
	issuing_employee_id: z.string().uuid().nullable(),
	slip_type: z.enum(["day_off", "time_off"]),
	start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
	duration_days: z
		.number()
		.positive("Duration must be greater than zero")
		.refine((v) => Math.round(v * 2) === v * 2, {
			message: "Duration must be in 0.5-day steps",
		}),
	has_half_day: z.boolean(),
	reason: z
		.string()
		.trim()
		.max(500)
		.optional()
		.transform((v) => (v ? v : null)),
});

export type MedicalCertificateCreateInput = z.infer<
	typeof medicalCertificateCreateSchema
>;
