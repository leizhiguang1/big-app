import { z } from "zod";

export const caseNoteInputSchema = z.object({
	appointment_id: z.string().uuid().nullable(),
	customer_id: z.string().uuid(),
	employee_id: z.string().uuid().nullable(),
	content: z.string().trim().min(1, "Note content is required").max(8000),
});
export type CaseNoteInput = z.infer<typeof caseNoteInputSchema>;

export const caseNoteUpdateSchema = z.object({
	content: z.string().trim().min(1, "Note content is required").max(8000),
});
export type CaseNoteUpdateInput = z.infer<typeof caseNoteUpdateSchema>;
